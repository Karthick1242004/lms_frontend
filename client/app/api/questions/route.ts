import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasInstructorPrivileges } from "@/lib/auth-utils"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasInstructorPrivileges(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Only instructors can create assessment questions." },
        { status: 401 }
      )
    }

    const { courseId, questions } = await request.json()
    
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Valid questions are required" }, { status: 400 })
    }

    // Connect to the database
    const { db } = await connectToDatabase()
    
    // Check if course exists
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
    
    // Set up data for questions collection
    const assessmentData = {
      courseId,
      title: course.title,
      description: `Assessment for ${course.title}`,
      timePerQuestion: 60, // Default: 60 seconds per question
      passingScore: 75,    // Default: 75% to pass
      questions: questions.map(q => ({
        ...q,
        id: q.id || `${courseId}-q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    }
    
    // Store the questions in the questions collection
    // Use upsert to update if assessment already exists for this course
    const result = await db.collection("questions").updateOne(
      { courseId },
      { $set: assessmentData },
      { upsert: true }
    )
    
    return NextResponse.json({
      success: true,
      message: "Assessment questions created successfully",
      questionCount: questions.length
    })
    
  } catch (error) {
    console.error("Error creating assessment questions:", error)
    return NextResponse.json(
      { error: "Failed to create assessment questions" },
      { status: 500 }
    )
  }
} 