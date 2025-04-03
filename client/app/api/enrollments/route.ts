import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET /api/enrollments - Get enrolled courses for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()
    
    const enrollments = await db.collection("enrollments").findOne({
      userEmail: session.user.email
    })

    return NextResponse.json({
      enrolledCourses: enrollments?.courseIds || []
    })

  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    )
  }
}

// POST /api/enrollments - Enroll in a course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
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

    // Validate ObjectId format
    let courseObjectId;
    try {
      courseObjectId = new ObjectId(courseId);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid course ID format" },
        { status: 400 }
      )
    }

    // Verify the course exists
    const course = await db.collection("coursedetails").findOne({
      _id: courseObjectId
    })

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Check if already enrolled
    const existingEnrollment = await db.collection("enrollments").findOne({
      userEmail: session.user.email,
      courseIds: courseId
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 400 }
      )
    }

    // Update or create enrollment document
    const result = await db.collection("enrollments").updateOne(
      { userEmail: session.user.email },
      {
        $addToSet: { courseIds: courseId },
        $setOnInsert: { 
          createdAt: new Date(),
          progress: {} 
        }
      },
      { upsert: true }
    )

    if (!result.acknowledged) {
      throw new Error("Failed to update enrollment")
    }

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in course"
    })

  } catch (error) {
    console.error("Error enrolling in course:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enroll in course" },
      { status: 500 }
    )
  }
}

// DELETE /api/enrollments - Unenroll from a course
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
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

    const result = await db.collection("enrollments").updateOne(
      { userEmail: session.user.email },
      { $pull: { courseIds: courseId } }
    )

    return NextResponse.json({
      success: true,
      message: "Successfully unenrolled from course"
    })

  } catch (error) {
    console.error("Error unenrolling from course:", error)
    return NextResponse.json(
      { error: "Failed to unenroll from course" },
      { status: 500 }
    )
  }
} 