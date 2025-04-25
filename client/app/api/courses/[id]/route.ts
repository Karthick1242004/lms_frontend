import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  if (!params.id) {
    return NextResponse.json(
      { error: "Course ID is required" },
      { status: 400 }
    )
  }

  try {
    const { db } = await connectToDatabase()
    
    const course = await db.collection("coursedetails").findOne({ id: params.id })
    
    if (!course) {
      console.log(`Course not found with id: ${params.id}`)
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    console.log(`Successfully found course with id: ${params.id}`)
    
    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
} 