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
    
    // Get the user's progress data for this course
    const userProgress = await db.collection("userProgress").findOne(
      { userId: session.user.id }
    )
    
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
      
      // Count completed lessons from the new structure
      if (userProgress?.courses?.[courseId]?.modules) {
        Object.values(userProgress.courses[courseId].modules).forEach((module: any) => {
          if (module.lessons) {
            Object.values(module.lessons).forEach((lesson: any) => {
              if (lesson.status === "completed") {
                completedLessons++
              }
            })
          }
        })
      }
    }
    
    // Calculate overall progress percentage
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0
    
    // Get module progress
    const moduleProgress = course.syllabus ? course.syllabus.map((module, moduleIndex) => {
      const moduleLessons = module.lessons.length
      let moduleCompletedLessons = 0
      
      // Count completed lessons in this module
      const moduleData = userProgress?.courses?.[courseId]?.modules?.[moduleIndex]
      if (moduleData?.lessons) {
        Object.values(moduleData.lessons).forEach((lesson: any) => {
          if (lesson.status === "completed") {
            moduleCompletedLessons++
          }
        })
      }
      
      return {
        moduleIndex,
        title: module.title,
        totalLessons: moduleLessons,
        completedLessons: moduleCompletedLessons,
        progress: moduleLessons > 0 ? Math.round((moduleCompletedLessons / moduleLessons) * 100) : 0,
        status: moduleLessons === moduleCompletedLessons ? "completed" : "in-progress"
      }
    }) : []

    // Get lesson status for each lesson
    const lessonStatus = {}
    if (userProgress?.courses?.[courseId]?.modules) {
      Object.entries(userProgress.courses[courseId].modules).forEach(([moduleIndex, moduleData]: [string, any]) => {
        if (moduleData.lessons) {
          Object.entries(moduleData.lessons).forEach(([lessonIndex, lessonData]: [string, any]) => {
            lessonStatus[`${moduleIndex}-${lessonIndex}`] = {
              status: lessonData.status,
              percentageWatched: lessonData.percentageWatched
            }
          })
        }
      })
    }

    return NextResponse.json({
      courseProgress: {
        totalLessons,
        completedLessons,
        overallProgress,
        moduleProgress,
        lessonStatus,
        certificateEarned: userProgress?.courses?.[courseId]?.certificateEarned || false,
        certificateDate: userProgress?.courses?.[courseId]?.certificateDate || null
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