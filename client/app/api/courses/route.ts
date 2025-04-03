import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const courses = await db.collection("coursedetails").find({}).toArray()
    
    if (!courses || courses.length === 0) {
      return NextResponse.json([])
    }
    
    // Ensure _id is converted to string
    const formattedCourses = courses.map(course => ({
      ...course,
      _id: course._id.toString(),
    }))
    
    return NextResponse.json(formattedCourses)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

export async function GETById(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    
    let courseId;
    try {
      courseId = new ObjectId(params.id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid course ID format" },
        { status: 400 }
      )
    }
    
    const course = await db.collection("coursedetails").findOne({ 
      _id: courseId 
    })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }
    
    // Ensure _id is converted to string
    const formattedCourse = {
      ...course,
      _id: course._id.toString(),
    }
    
    return NextResponse.json(formattedCourse)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
} 