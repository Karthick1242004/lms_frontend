import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

interface RouteParams {
  params: {
    courseId: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  if (!params.courseId) {
    return NextResponse.json(
      { error: "Course ID is required" },
      { status: 400 }
    )
  }

  try {
    const { db } = await connectToDatabase()
    
    const course = await db.collection("coursedetails").findOne({ id: params.courseId })
    
    if (!course) {
      console.log(`Course not found with id: ${params.courseId}`)
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    console.log(`Successfully found course with id: ${params.courseId}`)
    
    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
} 