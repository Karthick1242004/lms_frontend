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

export default async function AdminCoursesPage() {
  // Check if user is authenticated and is the super admin
  const session = await getServerSession(authOptions)
  
  if (!session || !isSuperAdmin(session)) {
    redirect("/dashboard")
  }
  
  // Fetch courses data
  const { db } = await connectToDatabase()
  
  // Get all courses with relevant fields and populate instructor info
  const courses = await db.collection("courses").aggregate([
    {
      $lookup: {
        from: "users",
        localField: "instructor",
        foreignField: "_id",
        as: "instructorInfo"
      }
    },
    {
      $unwind: {
        path: "$instructorInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        price: 1,
        published: 1,
        createdAt: 1,
        updatedAt: 1,
        "instructorInfo.name": 1,
        "instructorInfo.email": 1
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $limit: 50
    }
  ]).toArray()
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Course Management" 
        text="View and manage courses in the system"
      >
        <Link href="/dashboard/courses/create">
          <Button size="sm">Create New Course</Button>
        </Link>
      </DashboardHeader>
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
            <CardDescription>A list of all courses in the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course._id.toString()}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.instructorInfo?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {course.price ? `$${course.price.toFixed(2)}` : 'Free'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={course.published ? "default" : "secondary"}
                      >
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {course.createdAt ? formatDistanceToNow(new Date(course.createdAt), { addSuffix: true }) : 'Unknown'}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/course/${course.slug}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Course</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/courses/${course._id}/edit`}>
                              Edit Course
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 