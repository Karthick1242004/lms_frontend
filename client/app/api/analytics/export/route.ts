import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasAdminPrivileges } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    const isAdmin = hasAdminPrivileges(session)
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can export analytics data" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const reportType = searchParams.get("reportType") || "engagement"
    
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

    // Will hold the CSV data based on report type
    let csvData = ""
    let filename = ""

    // Based on the report type, generate the appropriate CSV data
    switch (reportType) {
      case "engagement":
        // User engagement report (lesson views, completion times, etc.)
        csvData = await generateEngagementReport(db, courseId, course)
        filename = `engagement_report_${courseId}.csv`
        break
        
      case "completion":
        // Course completion report (overall progress, completion rates, etc.)
        csvData = await generateCompletionReport(db, courseId, course)
        filename = `completion_report_${courseId}.csv`
        break
        
      case "assessment":
        // Assessment performance report (quiz scores, pass rates, etc.)
        csvData = await generateAssessmentReport(db, courseId, course)
        filename = `assessment_report_${courseId}.csv`
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        )
    }

    // Set headers for CSV download
    const headers = new Headers();
    headers.set("Content-Type", "text/csv");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(csvData, {
      status: 200,
      headers,
    });
    
  } catch (error) {
    console.error("Error exporting analytics:", error)
    return NextResponse.json(
      { error: "Failed to export analytics data" },
      { status: 500 }
    )
  }
}

// Helper function to generate CSV for user engagement
async function generateEngagementReport(db, courseId, course) {
  // Get all user progress records for this course
  const userProgressQuery = { [`courses.${courseId}`]: { $exists: true } }
  const userProgress = await db.collection("userProgress")
    .find(userProgressQuery)
    .toArray()
  
  // Get all users for additional info
  const users = await db.collection("users").find().toArray()
  const userMap = new Map()
  
  users.forEach(user => {
    userMap.set(user.email, {
      name: user.name || "Unknown",
      email: user.email
    })
  })
  
  // CSV header
  let csv = "User Email,User Name,Module,Lesson,Status,Percentage Watched,Last Activity,Total Watch Time (seconds)\n"
  
  // Build CSV data
  userProgress.forEach(record => {
    const userEmail = record.userEmail
    const userName = userMap.get(userEmail)?.name || "Unknown"
    
    if (record.courses?.[courseId]?.modules) {
      const modules = record.courses[courseId].modules
      
      Object.entries(modules).forEach(([moduleIndex, moduleData]: [string, any]) => {
        const moduleName = moduleData.moduleName || `Module ${moduleIndex}`
        
        if (moduleData.lessons) {
          Object.entries(moduleData.lessons).forEach(([lessonIndex, lessonData]: [string, any]) => {
            const lessonName = lessonData.lessonName || `Lesson ${lessonIndex}`
            const status = lessonData.status || "not-started"
            const percentageWatched = lessonData.percentageWatched || 0
            const lastUpdated = lessonData.lastUpdated 
              ? new Date(lessonData.lastUpdated).toISOString() 
              : "N/A"
            const watchTime = lessonData.currentTime || 0
            
            // Add row to CSV
            csv += `"${userEmail}","${userName}","${moduleName}","${lessonName}","${status}",${percentageWatched.toFixed(2)},"${lastUpdated}",${watchTime.toFixed(2)}\n`
          })
        }
      })
    }
  })
  
  return csv
}

// Helper function to generate CSV for course completion
async function generateCompletionReport(db, courseId, course) {
  // Get all user progress records for this course
  const userProgressQuery = { [`courses.${courseId}`]: { $exists: true } }
  const userProgress = await db.collection("userProgress")
    .find(userProgressQuery)
    .toArray()
  
  // Get all users
  const users = await db.collection("users").find().toArray()
  const userMap = new Map()
  
  users.forEach(user => {
    userMap.set(user.email, {
      name: user.name || "Unknown",
      email: user.email
    })
  })
  
  // Count total lessons in the course
  let totalLessons = 0
  
  if (course.syllabus) {
    course.syllabus.forEach(module => {
      totalLessons += module.lessons.length
    })
  }
  
  // CSV header
  let csv = "User Email,User Name,Completed Lessons,Total Lessons,Progress (%),Last Activity,Certificate Earned,Certificate Date\n"
  
  // Build CSV data
  userProgress.forEach(record => {
    const userEmail = record.userEmail
    const userName = userMap.get(userEmail)?.name || "Unknown"
    
    let completedLessons = 0
    let lastActivityDate = "N/A"
    let certificateEarned = "No"
    let certificateDate = "N/A"
    
    if (record.courses?.[courseId]) {
      // Get last activity date
      if (record.courses[courseId].lastAccessed) {
        lastActivityDate = new Date(record.courses[courseId].lastAccessed).toISOString()
      }
      
      // Get certificate status
      if (record.courses[courseId].certificateEarned) {
        certificateEarned = "Yes"
        certificateDate = record.courses[courseId].certificateDate 
          ? new Date(record.courses[courseId].certificateDate).toISOString()
          : "N/A"
      }
      
      // Count completed lessons
      if (record.courses[courseId].modules) {
        Object.values(record.courses[courseId].modules).forEach((module: any) => {
          if (module.lessons) {
            Object.values(module.lessons).forEach((lesson: any) => {
              if (lesson.status === "completed") {
                completedLessons++
              }
            })
          }
        })
      }
    }
    
    // Calculate progress percentage
    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
    
    // Add row to CSV
    csv += `"${userEmail}","${userName}",${completedLessons},${totalLessons},${progress.toFixed(2)},"${lastActivityDate}","${certificateEarned}","${certificateDate}"\n`
  })
  
  return csv
}

// Helper function to generate CSV for assessment performance
async function generateAssessmentReport(db, courseId, course) {
  // Get all assessment results for this course
  const assessmentResults = await db.collection("assessmentResults")
    .find({ courseId })
    .toArray()
  
  // Get all users
  const users = await db.collection("users").find().toArray()
  const userMap = new Map()
  
  users.forEach(user => {
    userMap.set(user.email, {
      name: user.name || "Unknown",
      email: user.email
    })
  })
  
  // CSV header
  let csv = "User Email,User Name,Assessment Date,Score (%),Passed,Time Spent (minutes)\n"
  
  // Add per-question analysis headers if assessment questions are available
  if (course.assessments && course.assessments.length > 0) {
    // Add detailed question analysis in the second CSV
    let questionsCsv = "Question ID,Question Text,Total Attempts,Correct Attempts,Success Rate (%)\n"
    
    // Create mapping of question results
    const questionStats = {}
    
    // Process assessment results for question analysis
    assessmentResults.forEach(result => {
      if (result.answers) {
        result.answers.forEach(answer => {
          if (!questionStats[answer.questionId]) {
            // Find the question text
            const question = course.assessments.find(q => q.id === answer.questionId)
            
            questionStats[answer.questionId] = {
              id: answer.questionId,
              text: question ? question.question : `Question ${answer.questionId}`,
              totalAttempts: 0,
              correctAttempts: 0
            }
          }
          
          questionStats[answer.questionId].totalAttempts++
          
          // Check if answer was correct
          const question = course.assessments.find(q => q.id === answer.questionId)
          if (question && answer.answer === question.correctAnswer) {
            questionStats[answer.questionId].correctAttempts++
          }
        })
      }
    })
    
    // Add question stats to CSV
    Object.values(questionStats).forEach((question: any) => {
      const successRate = question.totalAttempts > 0 
        ? (question.correctAttempts / question.totalAttempts) * 100 
        : 0
      
      questionsCsv += `"${question.id}","${question.text}",${question.totalAttempts},${question.correctAttempts},${successRate.toFixed(2)}\n`
    })
    
    // Append the question analysis to the main CSV with a separator
    csv += "\n\nQUESTION ANALYSIS\n\n" + questionsCsv
  }
  
  // Build assessment results CSV data
  assessmentResults.forEach(result => {
    const userEmail = result.userEmail
    const userName = userMap.get(userEmail)?.name || "Unknown"
    const assessmentDate = result.completedAt 
      ? new Date(result.completedAt).toISOString()
      : "N/A"
    const score = result.score || 0
    const passed = result.passed ? "Yes" : "No"
    
    // Estimate time spent (if available)
    const timeSpent = result.timeSpent 
      ? (result.timeSpent / 60).toFixed(2)
      : "N/A"
    
    // Add row to CSV
    csv += `"${userEmail}","${userName}","${assessmentDate}",${score.toFixed(2)},"${passed}",${timeSpent}\n`
  })
  
  return csv
} 