import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Get all enrollments for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()
    
    const enrollments = await db.collection("enrollments")
      .find({ userId: session.user.id })
      .toArray()
    
    // Return just the course IDs as an array for easier client-side handling
    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId)
    
    return NextResponse.json({
      enrolledCourses: enrolledCourseIds
    })
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    )
  }
}

// Enroll in a course
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { courseId } = await request.json()
    
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Check if the course exists
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }
    
    // Check if already enrolled
    const existingEnrollment = await db.collection("enrollments").findOne({
      userId: session.user.id,
      courseId: courseId
    })
    
    if (existingEnrollment) {
      return NextResponse.json({
        message: "Already enrolled in this course",
        enrolled: true
      })
    }
    
    // Create enrollment
    const result = await db.collection("enrollments").insertOne({
      userId: session.user.id,
      courseId: courseId,
      courseName: course.title,
      enrolledAt: new Date()
    })
    
    return NextResponse.json({
      message: "Successfully enrolled in course",
      enrolled: true,
      enrollmentId: result.insertedId
    })
  } catch (error) {
    console.error("Error enrolling in course:", error)
    return NextResponse.json(
      { error: "Failed to enroll in course" },
      { status: 500 }
    )
  }
} 