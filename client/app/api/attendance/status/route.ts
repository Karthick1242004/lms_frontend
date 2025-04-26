import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
    
    // Get the user's progress data for this course
    const userProgress = await db.collection("userProgress").findOne(
      { userEmail: session.user.email }
    )
    
    // Get the course details to calculate the overall progress
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Calculate course statistics
    let totalLessons = 0
    let completedLessons = 0
    
    if (course.syllabus) {
      // Count total number of lessons
      course.syllabus.forEach(module => {
        totalLessons += module.lessons.length
      })
      
      // Count completed lessons from the new structure
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
    
    // Calculate progress percentage
    const progressPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0
    
    // Check if the user has an assessment result for this course
    const assessmentResult = await db.collection("assessmentResults").findOne({
      userEmail: session.user.email,
      courseId: courseId
    })
    
    // Check if the user has a certificate for this course
    const certificate = await db.collection("certificates").findOne({
      userEmail: session.user.email,
      courseId: courseId
    })
    
    return NextResponse.json({
      totalLessons,
      completedLessons,
      progressPercentage,
      assessment: assessmentResult ? {
        score: assessmentResult.score,
        passed: assessmentResult.passed,
        completedAt: assessmentResult.completedAt
      } : null,
      certificate: certificate ? {
        certificateId: certificate.certificateId,
        issuedDate: certificate.issuedDate
      } : null
    })
  } catch (error) {
    console.error("Error fetching attendance status:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance status" },
      { status: 500 }
    )
  }
}