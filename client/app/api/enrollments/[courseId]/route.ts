import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ObjectId } from "mongodb"

// Endpoint to enroll in a course
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
      userEmail: session.user.email,
      courseId: courseId
    })
    
    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 400 }
      )
    }
    
    // Create enrollment
    await db.collection("enrollments").insertOne({
      userEmail: session.user.email,
      courseId: courseId,
      enrolledAt: new Date(),
      progress: 0,
      lastActivityDate: new Date(),
      status: "active"
    })
    
    // Increment course student count
    await db.collection("coursedetails").updateOne(
      { id: courseId },
      { $inc: { students: 1 } }
    )
    
    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in course"
    })
  } catch (error) {
    console.error("Error enrolling in course:", error)
    return NextResponse.json(
      { error: "Failed to enroll in course" },
      { status: 500 }
    )
  }
}

// Endpoint to get enrollment status
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
    
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }
    
    const { db } = await connectToDatabase()
    
    // Check if enrolled
    const enrollment = await db.collection("enrollments").findOne({
      userEmail: session.user.email,
      courseId: courseId
    })
    
    if (!enrollment) {
      return NextResponse.json({ enrolled: false })
    }
    
    return NextResponse.json({
      enrolled: true,
      enrollmentDate: enrollment.enrolledAt,
      progress: enrollment.progress || 0,
      enrollmentDetails: enrollment
    })
  } catch (error) {
    console.error("Error checking enrollment status:", error)
    return NextResponse.json(
      { error: "Failed to check enrollment status" },
      { status: 500 }
    )
  }
}

// Unenroll from a course
export async function DELETE(
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
    
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Delete the enrollment
    const result = await db.collection("enrollments").deleteOne({
      userEmail: session.user.email,
      courseId: courseId
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: "Successfully unenrolled from course",
      unenrolled: true
    })
  } catch (error) {
    console.error("Error unenrolling from course:", error)
    return NextResponse.json(
      { error: "Failed to unenroll from course" },
      { status: 500 }
    )
  }
} 