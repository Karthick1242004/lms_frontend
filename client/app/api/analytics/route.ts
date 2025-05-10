import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasInstructorPrivileges, hasAdminPrivileges } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has instructor or admin privileges
    const isInstructorOrAdmin = hasInstructorPrivileges(session) || hasAdminPrivileges(session)
    
    if (!isInstructorOrAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Only instructors or admins can access analytics" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get course data
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // If user is an instructor, check if they own the course
    if (hasInstructorPrivileges(session) && !hasAdminPrivileges(session)) {
      if (course.instructor !== session.user.name) {
        return NextResponse.json(
          { error: "Unauthorized - You can only view analytics for your own courses" },
          { status: 403 }
        )
      }
    }

    // Get all enrollments for this course
    const enrollments = await db.collection("enrollments")
      .find({ courseId })
      .toArray()
    
    // Get all user progress records for this course
    const userProgressQuery = { [`courses.${courseId}`]: { $exists: true } }
    const userProgress = await db.collection("userProgress")
      .find(userProgressQuery)
      .toArray()
    
    // Get all assessment results for this course
    const assessmentResults = await db.collection("assessmentResults")
      .find({ courseId })
      .toArray()

    // Prepare attendance heatmap data
    // This maps lessons to completion percentages by students
    const attendanceHeatmap = {}
    let totalLessons = 0
    let modulesData = []
    
    if (course.syllabus) {
      // Initialize heatmap structure
      course.syllabus.forEach((module, moduleIndex) => {
        const moduleData = {
          title: module.title,
          lessons: []
        }
        
        module.lessons.forEach((lesson, lessonIndex) => {
          // Initialize with zero completions
          attendanceHeatmap[`${moduleIndex}-${lessonIndex}`] = {
            moduleTitle: module.title,
            lessonTitle: lesson.title,
            completionCount: 0,
            startedCount: 0,
            totalEnrolled: enrollments.length,
            dropOffRate: 0,
            averageViewTime: 0,
            moduleIndex,
            lessonIndex
          }
          
          moduleData.lessons.push({
            title: lesson.title,
            index: lessonIndex
          })
          
          totalLessons++
        })
        
        modulesData.push(moduleData)
      })
      
      // Calculate attendance metrics from user progress
      userProgress.forEach(record => {
        if (record.courses?.[courseId]?.modules) {
          const modules = record.courses[courseId].modules
          
          Object.entries(modules).forEach(([moduleIndex, moduleData]: [string, any]) => {
            if (moduleData.lessons) {
              Object.entries(moduleData.lessons).forEach(([lessonIndex, lessonData]: [string, any]) => {
                const key = `${moduleIndex}-${lessonIndex}`
                
                if (attendanceHeatmap[key]) {
                  // Count started lessons
                  attendanceHeatmap[key].startedCount++
                  
                  // Count completed lessons
                  if (lessonData.status === "completed") {
                    attendanceHeatmap[key].completionCount++
                  }
                  
                  // Track average view time
                  if (lessonData.currentTime) {
                    attendanceHeatmap[key].averageViewTime = 
                      (attendanceHeatmap[key].averageViewTime * (attendanceHeatmap[key].startedCount - 1) + 
                      lessonData.currentTime) / attendanceHeatmap[key].startedCount
                  }
                }
              })
            }
          })
        }
      })
      
      // Calculate drop-off rates
      Object.keys(attendanceHeatmap).forEach(key => {
        const data = attendanceHeatmap[key]
        data.dropOffRate = data.startedCount > 0 
          ? ((data.startedCount - data.completionCount) / data.startedCount) * 100 
          : 0
        data.completionRate = data.totalEnrolled > 0 
          ? (data.completionCount / data.totalEnrolled) * 100 
          : 0
      })
    }

    // Prepare quiz/assessment results summary
    const quizAnalytics = {
      totalAssessments: assessmentResults.length,
      passRate: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 100,
      scoreDistribution: {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
      },
      questionAnalysis: {} // Will contain per-question success rates
    }
    
    if (assessmentResults.length > 0) {
      let totalScore = 0
      let passedCount = 0
      
      assessmentResults.forEach(result => {
        // Update total score for average calculation
        totalScore += result.score || 0
        
        // Count passed assessments
        if (result.passed) {
          passedCount++
        }
        
        // Update highest/lowest scores
        if (result.score > quizAnalytics.highestScore) {
          quizAnalytics.highestScore = result.score
        }
        if (result.score < quizAnalytics.lowestScore) {
          quizAnalytics.lowestScore = result.score
        }
        
        // Update score distribution
        if (result.score <= 20) {
          quizAnalytics.scoreDistribution["0-20"]++
        } else if (result.score <= 40) {
          quizAnalytics.scoreDistribution["21-40"]++
        } else if (result.score <= 60) {
          quizAnalytics.scoreDistribution["41-60"]++
        } else if (result.score <= 80) {
          quizAnalytics.scoreDistribution["61-80"]++
        } else {
          quizAnalytics.scoreDistribution["81-100"]++
        }
        
        // Per-question analysis
        if (result.answers) {
          result.answers.forEach(answer => {
            if (!quizAnalytics.questionAnalysis[answer.questionId]) {
              quizAnalytics.questionAnalysis[answer.questionId] = {
                totalAttempts: 0,
                correctAttempts: 0,
                successRate: 0
              }
            }
            
            quizAnalytics.questionAnalysis[answer.questionId].totalAttempts++
            
            // Find the question to check if answer is correct
            const question = course.assessments?.find(q => q.id === answer.questionId)
            if (question && answer.answer === question.correctAnswer) {
              quizAnalytics.questionAnalysis[answer.questionId].correctAttempts++
            }
          })
        }
      })
      
      // Calculate average score and pass rate
      quizAnalytics.averageScore = totalScore / assessmentResults.length
      quizAnalytics.passRate = (passedCount / assessmentResults.length) * 100
      
      // Calculate per-question success rates
      Object.keys(quizAnalytics.questionAnalysis).forEach(questionId => {
        const question = quizAnalytics.questionAnalysis[questionId]
        question.successRate = (question.correctAttempts / question.totalAttempts) * 100
      })
    }
    
    // Course progress overview
    const progressOverview = {
      totalEnrollments: enrollments.length,
      inProgressCount: 0,
      completedCount: 0,
      averageCompletion: 0,
      totalCompletedLessons: 0,
      progressDistribution: {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
      }
    }
    
    // Calculate overall course progress metrics
    let totalProgress = 0
    
    userProgress.forEach(record => {
      let userCompletedLessons = 0
      
      // Count completed lessons for this user
      if (record.courses?.[courseId]?.modules) {
        Object.values(record.courses[courseId].modules).forEach((module: any) => {
          if (module.lessons) {
            Object.values(module.lessons).forEach((lesson: any) => {
              if (lesson.status === "completed") {
                userCompletedLessons++
                progressOverview.totalCompletedLessons++
              }
            })
          }
        })
      }
      
      // Calculate user's progress percentage
      const userProgress = totalLessons > 0 ? (userCompletedLessons / totalLessons) * 100 : 0
      totalProgress += userProgress
      
      // Update progress distribution
      if (userProgress <= 20) {
        progressOverview.progressDistribution["0-20"]++
      } else if (userProgress <= 40) {
        progressOverview.progressDistribution["21-40"]++
      } else if (userProgress <= 60) {
        progressOverview.progressDistribution["41-60"]++
      } else if (userProgress <= 80) {
        progressOverview.progressDistribution["61-80"]++
      } else {
        progressOverview.progressDistribution["81-100"]++
      }
      
      // Count completed and in-progress
      if (userProgress === 100) {
        progressOverview.completedCount++
      } else if (userProgress > 0) {
        progressOverview.inProgressCount++
      }
    })
    
    // Calculate average completion
    progressOverview.averageCompletion = progressOverview.totalEnrollments > 0 
      ? totalProgress / progressOverview.totalEnrollments 
      : 0
    
    // Format for response
    const attendanceHeatmapArray = Object.values(attendanceHeatmap)
    
    return NextResponse.json({
      courseId,
      courseTitle: course.title,
      enrollmentCount: enrollments.length,
      totalLessons,
      modulesData,
      attendanceHeatmap: attendanceHeatmapArray,
      quizAnalytics,
      progressOverview
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
} 