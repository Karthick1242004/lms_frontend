import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isInstructor } from "@/lib/auth-utils"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session || !isInstructor(session)) {
      return NextResponse.json(
        { error: "Unauthorized: Only instructors can create courses" },
        { status: 403 }
      )
    }
    
    // Parse form data
    const formData = await req.formData()
    const title = formData.get("title") as string
    const slug = formData.get("slug") as string
    const description = formData.get("description") as string
    const priceRaw = formData.get("price") as string
    const category = formData.get("category") as string
    const thumbnail = formData.get("thumbnail") as string
    const published = formData.has("published")
    
    // Validate required fields
    if (!title || !slug || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    // Format price as a number or null if empty
    const price = priceRaw ? parseFloat(priceRaw) : 0
    
    // Connect to the database
    const { db } = await connectToDatabase()
    
    // Check if course with the same slug already exists
    const existingCourse = await db.collection("courses").findOne({ slug })
    
    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this slug already exists" },
        { status: 400 }
      )
    }
    
    // Create new course document
    const newCourse = {
      title,
      slug,
      description,
      price,
      category: category || "uncategorized",
      thumbnail,
      published,
      instructorEmail: session.user.email,
      instructorName: session.user.name || "Instructor",
      createdAt: new Date(),
      updatedAt: new Date(),
      lessons: []
    }
    
    // Insert course into database
    const result = await db.collection("courses").insertOne(newCourse)
    
    if (!result.acknowledged) {
      return NextResponse.json(
        { error: "Failed to create course" },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Course created successfully",
        courseId: result.insertedId 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    
    // Fetch all courses from the coursedetails collection
    const coursesData = await db.collection("coursedetails")
      .find({})
      .toArray()
    
    // Return the courses directly
    return NextResponse.json({ 
      courses: coursesData,
      count: coursesData.length 
    })
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: "Failed to fetch courses", courses: [] },
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