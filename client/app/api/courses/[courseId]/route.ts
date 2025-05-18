import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      console.log(`Course not found with id: ${courseId}`)
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    console.log(`Successfully found course with id: ${courseId}`)
    
    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    // Check if user is authenticated and is an instructor
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "instructor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { courseId } = params
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title, description, instructor, level, duration, language, certificate } = body

    // Validate required fields
    if (!title || !description || !instructor || !level || !duration || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Check if course exists
    const existingCourse = await db.collection("coursedetails").findOne({ id: courseId })
    if (!existingCourse) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Update course
    const updatedCourse = {
      ...existingCourse,
      title,
      description,
      instructor,
      level,
      duration,
      language,
      certificate,
      updatedAt: new Date().toISOString()
    }

    await db.collection("coursedetails").updateOne(
      { id: courseId },
      { $set: updatedCourse }
    )

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    )
  }
} 