import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/auth-utils"
import DashboardHeader from "@/components/dashboard/page-header"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { connectToDatabase } from "@/lib/mongodb"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default async function AdminProgressPage() {
  // Check if user is authenticated and is the super admin
  const session = await getServerSession(authOptions)
  
  if (!session || !isSuperAdmin(session)) {
    redirect("/dashboard")
  }
  
  // Fetch student progress data
  const { db } = await connectToDatabase()
  
  // Get student progress from userProgress collection
  const progressData = await db.collection("userProgress").aggregate([
    {
      $unwind: {
        path: "$courses",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        userEmail: 1,
        courseId: { $objectToArray: "$courses" },
      }
    },
    {
      $unwind: {
        path: "$courseId",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userEmail",
        foreignField: "email",
        as: "userInfo"
      }
    },
    {
      $lookup: {
        from: "coursedetails",
        localField: "courseId.k",
        foreignField: "id",
        as: "courseInfo"
      }
    },
    {
      $unwind: {
        path: "$userInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$courseInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        userEmail: 1,
        courseId: "$courseId.k",
        progress: "$courseId.v.progress",
        lastActivityDate: "$courseId.v.lastAccessed",
        modulesData: { $objectToArray: { $ifNull: ["$courseId.v.modules", {}] } },
        "userInfo.name": 1,
        "userInfo.email": 1,
        "courseInfo.title": 1
      }
    },
    {
      $addFields: {
        totalLessons: { 
          $reduce: {
            input: "$modulesData",
            initialValue: 0,
            in: { 
              $add: [
                "$$value", 
                { $size: { $objectToArray: { $ifNull: ["$$this.v.lessons", {}] } } }
              ]
            }
          }
        },
        completedLessons: {
          $reduce: {
            input: "$modulesData",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $size: {
                    $filter: {
                      input: { $objectToArray: { $ifNull: ["$$this.v.lessons", {}] } },
                      as: "lesson",
                      cond: { $eq: ["$$lesson.v.status", "completed"] }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        progress: { 
          $cond: [
            { $gt: ["$totalLessons", 0] },
            { $multiply: [{ $divide: ["$completedLessons", "$totalLessons"] }, 100] },
            0
          ]
        }
      }
    },
    {
      $sort: { "userInfo.name": 1, "lastActivityDate": -1 }
    },
    {
      $limit: 50
    }
  ]).toArray()
  
  // Get assessment results with user information
  const assessmentResults = await db.collection("assessmentResults").aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userEmail",
        foreignField: "email",
        as: "userInfo"
      }
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
      $unwind: {
        path: "$userInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$courseInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        userEmail: 1,
        courseId: 1,
        score: 1,
        passed: 1,
        completedAt: 1,
        answers: 1,
        "userInfo.name": 1,
        "userInfo.email": 1,
        "courseInfo.title": 1
      }
    },
    {
      $sort: { completedAt: -1 }
    },
    {
      $limit: 50
    }
  ]).toArray()
  
  // Helper function to format dates
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Student Progress Tracking" 
        text="Monitor course progress and assessment results"
      />
      <Separator />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Progress</CardTitle>
            <CardDescription>Students' progress through enrolled courses</CardDescription>
          </CardHeader>
          <CardContent>
            {progressData.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No progress data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progressData.map((item, idx) => (
                    <TableRow key={`${item._id?.toString()}-${idx}`}>
                      <TableCell className="font-medium">
                        {item.userInfo?.name || item.userEmail || 'Unknown'}
                      </TableCell>
                      <TableCell>{item.courseInfo?.title || `Course ID: ${item.courseId}` || 'Unknown Course'}</TableCell>
                      <TableCell className="w-1/3">
                        <div className="flex flex-col space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs">
                              {Math.round(item.progress || 0)}% Complete
                              {item.completedLessons !== undefined && 
                               item.totalLessons !== undefined && (
                                <span className="ml-2">
                                  ({item.completedLessons}/{item.totalLessons} lessons)
                                </span>
                              )}
                            </span>
                          </div>
                          <Progress value={Math.round(item.progress || 0)} max={100} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.lastActivityDate ? 
                          formatDate(item.lastActivityDate) : 
                          'No activity yet'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Assessment Results</CardTitle>
            <CardDescription>Recent assessment completions and scores</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentResults.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No assessment results available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessmentResults.map((result) => (
                    <TableRow key={result._id?.toString()}>
                      <TableCell className="font-medium">
                        {result.userInfo?.name || result.userEmail || 'Unknown'}
                      </TableCell>
                      <TableCell>{result.courseInfo?.title || `Course ID: ${result.courseId}` || 'Unknown Course'}</TableCell>
                      <TableCell>{result.answers ? 'Quiz' : 'Assessment'}</TableCell>
                      <TableCell>{result.score ? `${result.score}%` : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={result.passed ? 'default' : 'destructive'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.completedAt ? 
                          formatDate(result.completedAt) : 
                          'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 