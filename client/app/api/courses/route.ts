import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    console.log("Connected to database successfully")

    const courses = await db.collection("coursedetails").find({}).toArray()
    console.log("Fetched courses:", courses)
    
    if (!courses || courses.length === 0) {
      console.log("No courses found in the collection")
      return NextResponse.json([])
    }
    
    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

export async function GETById(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const course = await db.collection("coursedetails").findOne({ id: params.id })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
} 