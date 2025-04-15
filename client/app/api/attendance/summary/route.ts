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

    // Additional validation can be added here to check if the user is an admin or instructor
    
    const { db } = await connectToDatabase()
    
    // Get the course to get total lessons count
    const course = await db.collection("coursedetails").findOne({ id: courseId })
    
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Calculate total lessons in the course
    let totalLessons = 0
    
    if (course.syllabus) {
      course.syllabus.forEach(module => {
        totalLessons += module.lessons.length
      })
    }
    
    // Get all attendance records for this course
    const attendanceRecords = await db.collection("attendance")
      .find({ courseId })
      .toArray()
    
    // Get unique users who have started the course
    const userIds = [...new Set(attendanceRecords.map(record => record.userId))]
    
    // Get number of users enrolled in the course (this would come from your enrollment collection)
    // For now, we'll just use the users who have attendance records
    const totalEnrolledUsers = userIds.length
    
    // Analyze attendance data
    let totalCompletedLessons = 0
    const lessonCompletionCounts = {}
    const userProgress = {}
    
    // Initialize user progress tracking
    userIds.forEach(userId => {
      userProgress[userId] = {
        completedLessons: 0,
        inProgressLessons: 0
      }
    })
    
    // Process attendance records
    attendanceRecords.forEach(record => {
      const lessonKey = `${record.moduleIndex}-${record.lessonIndex}`
      
      if (!lessonCompletionCounts[lessonKey]) {
        lessonCompletionCounts[lessonKey] = {
          completedCount: 0,
          inProgressCount: 0,
          moduleName: record.moduleName,
          lessonName: record.lessonName
        }
      }
      
      if (record.status === "completed") {
        totalCompletedLessons++
        lessonCompletionCounts[lessonKey].completedCount++
        userProgress[record.userId].completedLessons++
      } else if (record.status === "in-progress") {
        lessonCompletionCounts[lessonKey].inProgressCount++
        userProgress[record.userId].inProgressLessons++
      }
    })
    
    // Calculate completion rates
    const overallCompletionRate = totalLessons > 0 && totalEnrolledUsers > 0
      ? (totalCompletedLessons / (totalLessons * totalEnrolledUsers)) * 100
      : 0
    
    // Find users who have completed all lessons
    const usersCompletedAllLessons = Object.entries(userProgress)
      .filter(([userId, progress]: [string, any]) => progress.completedLessons === totalLessons)
      .length
    
    // Calculate course completion rate (users who completed all lessons)
    const courseCompletionRate = totalEnrolledUsers > 0
      ? (usersCompletedAllLessons / totalEnrolledUsers) * 100
      : 0
    
    // Get most and least completed lessons
    const sortedLessons = Object.entries(lessonCompletionCounts)
      .map(([key, data]: [string, any]) => ({
        key,
        moduleName: data.moduleName,
        lessonName: data.lessonName,
        completedCount: data.completedCount,
        inProgressCount: data.inProgressCount,
        completionRate: totalEnrolledUsers > 0 
          ? (data.completedCount / totalEnrolledUsers) * 100 
          : 0
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
    
    const mostCompletedLessons = sortedLessons.slice(0, 5)
    const leastCompletedLessons = sortedLessons.reverse().slice(0, 5)
    
    return NextResponse.json({
      courseId,
      courseTitle: course.title,
      totalLessons,
      totalEnrolledUsers,
      totalAttendanceRecords: attendanceRecords.length,
      totalCompletedLessons,
      overallCompletionRate: Math.round(overallCompletionRate),
      usersCompletedAllLessons,
      courseCompletionRate: Math.round(courseCompletionRate),
      mostCompletedLessons,
      leastCompletedLessons
    })
  } catch (error) {
    console.error("Error generating attendance summary:", error)
    return NextResponse.json(
      { error: "Failed to generate attendance summary" },
      { status: 500 }
    )
  }
} 