import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET endpoint to fetch assessment questions for a course
export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const courseId = params.courseId
    
    // Connect to the database
    const { db } = await connectToDatabase()
    
    // Check if the user has completed the course
    const userProgress = await db.collection("userProgress").findOne({
      userEmail: session.user.email,
      [`courses.${courseId}`]: { $exists: true }
    })
    
    if (!userProgress) {
      return NextResponse.json(
        { error: "You need to enroll in this course first" },
        { status: 403 }
      )
    }
    
    // Fetch course details to calculate total lessons
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }
    
    // Calculate completion percentage
    let totalLessons = 0
    let completedLessons = 0
    
    if (course.syllabus) {
      // Count total lessons
      course.syllabus.forEach((module: { lessons: any[] }) => {
        totalLessons += module.lessons.length
      })
      
      // Count completed lessons
      if (userProgress?.courses?.[courseId]?.modules) {
        Object.values(userProgress.courses[courseId].modules).forEach((module: any) => {
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
    
    const completionPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0
    
    // Check if the user has completed the course (100% progress)
    const isEligibleForAssessment = completionPercentage === 100
    
    if (!isEligibleForAssessment) {
      return NextResponse.json(
        { 
          error: "You need to complete all lessons before taking the assessment",
          completionPercentage 
        },
        { status: 403 }
      )
    }
    
    // Fetch assessment questions for the course
    const assessment = await db.collection("questions").findOne({ courseId })
    
    if (!assessment) {
      return NextResponse.json(
        { error: "No assessment available for this course" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(assessment)
  } catch (error) {
    console.error("Error fetching course assessment:", error)
    return NextResponse.json(
      { error: "Failed to fetch assessment" },
      { status: 500 }
    )
  }
}

// POST endpoint to submit assessment answers
export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const courseId = params.courseId
    const { answers } = await request.json()
    
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Invalid answers format" },
        { status: 400 }
      )
    }
    
    // Connect to the database
    const { db } = await connectToDatabase()
    
    // Fetch assessment questions to calculate the score
    const assessment = await db.collection("questions").findOne({ courseId })
    
    if (!assessment || !assessment.questions) {
      return NextResponse.json(
        { error: "No assessment questions found for this course" },
        { status: 404 }
      )
    }
    
    const questions = assessment.questions
    
    // Calculate the score
    let correctAnswers = 0
    
    answers.forEach((answer, index) => {
      if (index < questions.length) {
        const question = questions[index]
        if (answer.questionId === question.id && answer.answer === question.correctAnswer) {
          correctAnswers++
        }
      }
    })
    
    const totalQuestions = questions.length
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const passed = score >= (assessment.passingScore || 75) // Use assessment's passing score or default to 75%
    
    // Store the assessment result
    await db.collection("assessmentResults").updateOne(
      { userEmail: session.user.email, courseId },
      { 
        $set: {
          userEmail: session.user.email,
          courseId,
          score,
          passed,
          completedAt: new Date(),
          answers
        }
      },
      { upsert: true }
    )
    
    // Update user progress with certificate if passed
    if (passed) {
      await db.collection("userProgress").updateOne(
        { userEmail: session.user.email },
        {
          $set: {
            [`courses.${courseId}.certificateEarned`]: true,
            [`courses.${courseId}.certificateDate`]: new Date()
          }
        }
      )
    }
    
    return NextResponse.json({
      score,
      passed,
      correctAnswers,
      totalQuestions
    })
  } catch (error) {
    console.error("Error submitting assessment:", error)
    return NextResponse.json(
      { error: "Failed to submit assessment" },
      { status: 500 }
    )
  }
} 