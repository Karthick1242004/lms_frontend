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
    
    // Additional validation can be added here to check if the user is an admin or instructor
    
    const { db } = await connectToDatabase()
    
    let query = {}
    
    if (courseId) {
      query = { courseId }
    }
    
    // Get all attendance records matching the query
    const attendanceRecords = await db.collection("attendance")
      .find(query)
      .toArray()

    // Get user information for the records
    const userIds = [...new Set(attendanceRecords.map(record => record.userId))]
    const users = await db.collection("users")
      .find({ _id: { $in: userIds } })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray()
    
    // Create a lookup map for users
    const userMap = new Map()
    users.forEach(user => {
      userMap.set(user._id.toString(), {
        name: user.name,
        email: user.email
      })
    })
    
    // Organize data by course and user
    const attendanceByUser = {}
    
    attendanceRecords.forEach(record => {
      const userId = record.userId
      const courseId = record.courseId
      const moduleName = record.moduleName
      const lessonName = record.lessonName
      
      if (!attendanceByUser[courseId]) {
        attendanceByUser[courseId] = {}
      }
      
      if (!attendanceByUser[courseId][userId]) {
        attendanceByUser[courseId][userId] = {
          user: userMap.get(userId) || { name: "Unknown", email: "Unknown" },
          modules: {}
        }
      }
      
      if (!attendanceByUser[courseId][userId].modules[moduleName]) {
        attendanceByUser[courseId][userId].modules[moduleName] = {
          lessons: {}
        }
      }
      
      attendanceByUser[courseId][userId].modules[moduleName].lessons[lessonName] = {
        status: record.status,
        percentageWatched: record.percentageWatched,
        lastUpdated: record.lastUpdated
      }
    })
    
    return NextResponse.json({
      attendanceReport: attendanceByUser
    })
  } catch (error) {
    console.error("Error generating attendance report:", error)
    return NextResponse.json(
      { error: "Failed to generate attendance report" },
      { status: 500 }
    )
  }
} 