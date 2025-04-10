import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { LessonAttendance, AttentionEvent } from "@/lib/types"

// POST /api/attendance/heartbeat - Record a heartbeat for attendance tracking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { 
      courseId, 
      moduleId, 
      lessonId, 
      currentTime, 
      totalDuration,
      event 
    } = await request.json()

    if (!courseId || !moduleId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Find or create attendance record
    const existingRecord = await db.collection("attendance").findOne({
      userEmail: session.user.email,
      courseId,
      moduleId,
      lessonId
    })

    const now = new Date()
    
    if (!existingRecord) {
      // Create new attendance record
      await db.collection("attendance").insertOne({
        userEmail: session.user.email,
        courseId,
        moduleId,
        lessonId,
        startTime: now,
        watchedDuration: currentTime || 0,
        totalDuration: totalDuration || 0,
        completed: false,
        attentionEvents: event ? [event] : [],
        lastUpdated: now
      })
    } else {
      // Update existing record
      const updateData: Partial<LessonAttendance> & { 
        userEmail: string, 
        lastUpdated: Date 
      } = {
        userEmail: session.user.email,
        watchedDuration: currentTime || existingRecord.watchedDuration,
        lastUpdated: now
      }

      // Only set endTime if video is nearly complete
      if (currentTime && totalDuration && (currentTime / totalDuration > 0.95)) {
        updateData.endTime = now
        updateData.completed = true
      }

      // Add the event to the attentionEvents array if provided
      if (event) {
        await db.collection("attendance").updateOne(
          {
            userEmail: session.user.email,
            courseId,
            moduleId,
            lessonId
          },
          {
            $set: updateData,
            $push: { attentionEvents: event }
          }
        )
      } else {
        await db.collection("attendance").updateOne(
          {
            userEmail: session.user.email,
            courseId,
            moduleId,
            lessonId
          },
          {
            $set: updateData
          }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "Attendance updated successfully"
    })

  } catch (error) {
    console.error("Attendance API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update attendance" },
      { status: 500 }
    )
  }
}

// GET /api/attendance - Get attendance records for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    
    const { db } = await connectToDatabase()
    
    const query: any = { userEmail: session.user.email }
    
    if (courseId) {
      query.courseId = courseId
    }
    
    const attendanceRecords = await db.collection("attendance")
      .find(query)
      .sort({ lastUpdated: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      records: attendanceRecords
    })

  } catch (error) {
    console.error("Get attendance API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch attendance records" },
      { status: 500 }
    )
  }
} 