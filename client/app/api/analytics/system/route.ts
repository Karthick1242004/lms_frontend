import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasAdminPrivileges } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    const isAdmin = hasAdminPrivileges(session)
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can access system analytics" },
        { status: 403 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get overall counts
    const totalUsers = await db.collection("users").countDocuments()
    const totalCourses = await db.collection("coursedetails").countDocuments()
    const totalEnrollments = await db.collection("enrollments").countDocuments()
    const totalAssessments = await db.collection("assessmentResults").countDocuments()
    
    // Get users who logged in within the last 30 days (active users)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeUsers = await db.collection("users").countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    })
    
    // Get users with progress records (engaged users)
    const engagedUsers = await db.collection("userProgress").countDocuments()
    
    // Get total assessments passed
    const passedAssessments = await db.collection("assessmentResults").countDocuments({
      passed: true
    })
    
    // Calculate assessment pass rate
    const assessmentPassRate = totalAssessments > 0 
      ? (passedAssessments / totalAssessments) * 100 
      : 0
    
    // Get enrollments by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const enrollmentsByMonth = await db.collection("enrollments").aggregate([
      {
        $match: {
          enrolledAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$enrolledAt" },
            month: { $month: "$enrolledAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]).toArray()
    
    // Format enrollment data
    const enrollmentData = enrollmentsByMonth.map(item => {
      const date = new Date(item._id.year, item._id.month - 1, 1)
      
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: item._id.year,
        count: item.count,
        date: `${date.toLocaleString('default', { month: 'short' })}-${item._id.year}`
      }
    })
    
    // Get the most popular courses (by enrollment count)
    const popularCourses = await db.collection("coursedetails").aggregate([
      {
        $lookup: {
          from: "enrollments",
          localField: "id",
          foreignField: "courseId",
          as: "enrollmentRecords"
        }
      },
      {
        $project: {
          id: 1,
          title: 1,
          instructor: 1,
          enrollmentCount: { $size: "$enrollmentRecords" }
        }
      },
      {
        $sort: { enrollmentCount: -1 }
      },
      {
        $limit: 5
      }
    ]).toArray()
    
    // Get user engagement over time (logins by month)
    const userEngagementByMonth = await db.collection("users").aggregate([
      {
        $match: {
          lastLogin: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$lastLogin" },
            month: { $month: "$lastLogin" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]).toArray()
    
    // Format user engagement data
    const engagementData = userEngagementByMonth.map(item => {
      const date = new Date(item._id.year, item._id.month - 1, 1)
      
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: item._id.year,
        users: item.count,
        date: `${date.toLocaleString('default', { month: 'short' })}-${item._id.year}`
      }
    })
    
    // Calculate overall completion rate
    const completionRate = await db.collection("userProgress").aggregate([
      {
        $unwind: "$courses"
      },
      {
        $group: {
          _id: null,
          totalCompletedCourses: {
            $sum: {
              $cond: [
                { $eq: ["$courses.v.progress", 100] },
                1,
                0
              ]
            }
          },
          totalCourseEnrollments: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const overallCompletionRate = completionRate.length > 0 && completionRate[0].totalCourseEnrollments > 0
      ? (completionRate[0].totalCompletedCourses / completionRate[0].totalCourseEnrollments) * 100
      : 0
    
    // Get latest activity
    const latestActivity = await db.collection("userProgress").aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userEmail",
          foreignField: "email",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $lookup: {
          from: "coursedetails",
          localField: "courseId",
          foreignField: "id",
          as: "courseInfo"
        }
      },
      {
        $unwind: "$courseInfo"
      },
      {
        $sort: { lastUpdated: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          userName: "$userInfo.name",
          userEmail: "$userInfo.email",
          courseTitle: "$courseInfo.title",
          courseId: "$courseInfo.id",
          lastUpdateDate: "$lastUpdated",
          type: "progress"
        }
      }
    ]).toArray()
    
    return NextResponse.json({
      // Overall stats
      totalUsers,
      activeUsers,
      engagedUsers,
      totalCourses,
      totalEnrollments,
      totalAssessments,
      passedAssessments,
      assessmentPassRate,
      overallCompletionRate,
      
      // Charting data
      enrollmentsByMonth: enrollmentData,
      userEngagementOverTime: engagementData,
      popularCourses,
      latestActivity
    })
  } catch (error) {
    console.error("Error fetching system analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch system analytics data" },
      { status: 500 }
    )
  }
} 