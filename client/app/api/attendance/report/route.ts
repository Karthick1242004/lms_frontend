import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ObjectId } from "mongodb"

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
    
    // Get all user progress records
    const userProgressRecords = await db.collection("userProgress").find({}).toArray()
    
    // Get additional user information for the records
    const userIds = userProgressRecords.map(record => record.userId)
    const users = await db.collection("users")
      .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } })
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
    
    // Process user progress records
    userProgressRecords.forEach(record => {
      const userId = record.userId
      const userCourses = record.courses || {}
      
      // Filter by courseId if provided
      const coursesToInclude = courseId 
        ? (userCourses[courseId] ? { [courseId]: userCourses[courseId] } : {})
        : userCourses
      
      // For each course in user progress
      Object.entries(coursesToInclude).forEach(([courseId, courseData]) => {
        if (!attendanceByUser[courseId]) {
          attendanceByUser[courseId] = {}
        }
        
        if (!attendanceByUser[courseId][userId]) {
          attendanceByUser[courseId][userId] = {
            user: userMap.get(userId) || { name: "Unknown", email: "Unknown" },
            modules: {}
          }
        }
        
        // Process modules
        const modules = courseData.modules || {}
        Object.entries(modules).forEach(([moduleIndex, moduleData]) => {
          const moduleName = moduleData.title || `Module ${moduleIndex}`
          
          if (!attendanceByUser[courseId][userId].modules[moduleName]) {
            attendanceByUser[courseId][userId].modules[moduleName] = {
              lessons: {}
            }
          }
          
          // Process lessons
          const lessons = moduleData.lessons || {}
          Object.entries(lessons).forEach(([lessonIndex, lessonData]) => {
            const lessonName = lessonData.lessonName || `Lesson ${lessonIndex}`
            
            attendanceByUser[courseId][userId].modules[moduleName].lessons[lessonName] = {
              status: lessonData.status,
              percentageWatched: lessonData.percentageWatched,
              lastUpdated: lessonData.lastUpdated
            }
          })
        })
      })
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