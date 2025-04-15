import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { courseId, moduleIndex, lessonIndex, currentTime, totalDuration } = await request.json()
    
    if (!courseId || moduleIndex === undefined || lessonIndex === undefined || !currentTime || !totalDuration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get the course details
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Get the lesson information
    const module = course.syllabus[moduleIndex]
    const lesson = module?.lessons[lessonIndex]
    
    if (!module || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      )
    }

    // Convert duration from string to minutes (numeric)
    const lessonDurationInMinutes = parseFloat(lesson.duration.split(" ")[0])
    
    // Calculate percentage watched (currentTime is in seconds, convert to minutes for comparison)
    const currentTimeInMinutes = currentTime / 60
    const percentageWatched = (currentTimeInMinutes / lessonDurationInMinutes) * 100
    
    // Update or create the lesson progress
    const result = await db.collection("attendance").updateOne(
      { 
        userId: session.user.id, 
        courseId: courseId,
        moduleIndex: moduleIndex,
        lessonIndex: lessonIndex
      },
      {
        $set: {
          userId: session.user.id,
          courseId: courseId,
          moduleName: module.title,
          lessonName: lesson.title,
          moduleIndex: moduleIndex,
          lessonIndex: lessonIndex,
          currentTime: currentTime,
          totalDuration: totalDuration,
          percentageWatched: percentageWatched,
          status: percentageWatched >= 90 ? "completed" : "in-progress",
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: "Attendance updated successfully",
      percentageWatched: percentageWatched,
      status: percentageWatched >= 90 ? "completed" : "in-progress"
    })
  } catch (error) {
    console.error("Error updating attendance:", error)
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    )
  }
} 