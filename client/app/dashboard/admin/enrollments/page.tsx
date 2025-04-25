import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/auth-utils"
import DashboardHeader from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { connectToDatabase } from "@/lib/mongodb"
import { formatDistanceToNow } from "date-fns"
import { MoreHorizontal, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function AdminEnrollmentsPage() {
  // Check if user is authenticated and is the super admin
  const session = await getServerSession(authOptions)
  
  if (!session || !isSuperAdmin(session)) {
    redirect("/dashboard")
  }
  
  // Fetch enrollments data
  const { db } = await connectToDatabase()
  
  // Get all enrollments with relevant fields and populate user and course info
  const enrollments = await db.collection("enrollments").aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
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
        enrolledAt: 1,
        status: 1,
        progress: 1,
        "userInfo.name": 1,
        "userInfo.email": 1,
        "courseInfo.title": 1,
        "courseInfo.slug": 1
      }
    },
    {
      $sort: { enrolledAt: -1 }
    },
    {
      $limit: 50
    }
  ]).toArray()
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Enrollment Management" 
        text="View and manage course enrollments"
      />
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
            <CardDescription>A list of all course enrollments in the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No enrollments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment._id.toString()}>
                      <TableCell className="font-medium">{enrollment.userInfo?.name || 'Unknown'}</TableCell>
                      <TableCell>{enrollment.courseInfo?.title || 'Unknown Course'}</TableCell>
                      <TableCell>
                        {enrollment.progress ? `${enrollment.progress}%` : '0%'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={enrollment.status === 'active' ? "default" : 
                                  enrollment.status === 'completed' ? "success" : "secondary"}
                        >
                          {enrollment.status || 'Enrolled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {enrollment.enrolledAt ? 
                          formatDistanceToNow(new Date(enrollment.enrolledAt), { addSuffix: true }) : 
                          'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {enrollment.courseInfo?.slug && (
                              <DropdownMenuItem asChild>
                                <Link href={`/course/${enrollment.courseInfo.slug}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>View Course</span>
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Delete Enrollment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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