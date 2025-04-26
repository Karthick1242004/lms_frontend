import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get all assessment results for the user
    const results = await db.collection("assessmentResults")
      .find({ userEmail: session.user.email })
      .toArray()
    
    // Get course information for each assessment
    const courseIds = [...new Set(results.map(result => result.courseId))]
    const courses = await db.collection("coursedetails")
      .find({ id: { $in: courseIds } })
      .toArray()
    
    // Create a lookup map for courses
    const courseMap = new Map()
    courses.forEach(course => {
      courseMap.set(course.id, course)
    })
    
    // Enhance assessment results with course information
    const enhancedResults = results.map(result => ({
      courseId: result.courseId,
      courseName: courseMap.get(result.courseId)?.title || "Unknown Course",
      score: result.score,
      passed: result.passed,
      completedAt: result.completedAt || new Date().toISOString(),
      assessmentTitle: result.assessmentTitle || "Assessment"
    }))
    
    return NextResponse.json({
      results: enhancedResults
    })
  } catch (error) {
    console.error("Error fetching assessment results:", error)
    return NextResponse.json(
      { error: "Failed to fetch assessment results" },
      { status: 500 }
    )
  }
} 