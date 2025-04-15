import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Unenroll from a course
export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
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
      userId: session.user.id,
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

// Check if enrolled in a specific course
export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
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
    
    // Check if enrollment exists
    const enrollment = await db.collection("enrollments").findOne({
      userId: session.user.id,
      courseId: courseId
    })
    
    return NextResponse.json({
      enrolled: !!enrollment,
      enrollmentDetails: enrollment || null
    })
  } catch (error) {
    console.error("Error checking enrollment:", error)
    return NextResponse.json(
      { error: "Failed to check enrollment status" },
      { status: 500 }
    )
  }
} 