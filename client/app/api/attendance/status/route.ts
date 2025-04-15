import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    
    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get the user's attendance records for this course
    const attendanceRecords = await db.collection("attendance")
      .find({ userId: session.user.id, courseId: courseId })
      .toArray()
    
    // Get the course details to calculate the overall progress
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Calculate course statistics
    let totalLessons = 0
    let completedLessons = 0
    
    if (course.syllabus) {
      // Count total number of lessons
      course.syllabus.forEach(module => {
        totalLessons += module.lessons.length
      })
      
      // Count completed lessons
      completedLessons = attendanceRecords.filter(record => record.status === "completed").length
    }
    
    // Calculate overall progress percentage
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0
    
    // Get module progress
    const moduleProgress = course.syllabus ? course.syllabus.map((module, moduleIndex) => {
      const moduleLessons = module.lessons.length
      const moduleCompletedLessons = attendanceRecords.filter(
        record => record.moduleIndex === moduleIndex && record.status === "completed"
      ).length
      
      return {
        moduleIndex,
        title: module.title,
        totalLessons: moduleLessons,
        completedLessons: moduleCompletedLessons,
        progress: moduleLessons > 0 ? Math.round((moduleCompletedLessons / moduleLessons) * 100) : 0,
        status: moduleLessons === moduleCompletedLessons ? "completed" : "in-progress"
      }
    }) : []

    return NextResponse.json({
      attendance: attendanceRecords,
      courseProgress: {
        totalLessons,
        completedLessons,
        overallProgress,
        moduleProgress
      }
    })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    )
  }
}