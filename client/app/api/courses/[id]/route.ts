import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {


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
    
    // Try finding by ObjectId first
    let course = await db.collection("coursedetails").findOne({ 
      _id: courseId 
    });

    // If not found, try finding by string ID as fallback
    if (!course) {

      course = await db.collection("coursedetails").findOne({ 
        id: params.id 
      });
    }
    
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
      id: course._id.toString(), // Add this for backward compatibility
    }
    

    return NextResponse.json(formattedCourse)
  } catch (error) {

    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
} 