import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

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