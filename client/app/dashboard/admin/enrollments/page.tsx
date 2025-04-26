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
import { ObjectId } from "mongodb"

// Define the types for our data structures
interface EnrollmentType {
  _id: ObjectId;
  userId: string;
  courseId: string;
  courseName?: string;
  enrolledAt?: Date;
  status?: string;
  progress?: number;
}

interface EnhancedEnrollmentType extends EnrollmentType {
  userInfo: { name: string; email: string } | null;
  courseInfo: { title: string; id: string } | null;
}

// Helper function to format date relative to now
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  // Convert to appropriate units
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Format with appropriate units
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  } else if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffMins > 0) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  } else {
    return 'just now';
  }
}

export default async function AdminEnrollmentsPage() {
  // Check if user is authenticated and is the super admin
  const session = await getServerSession(authOptions)
  
  if (!session || !isSuperAdmin(session)) {
    redirect("/dashboard")
  }
  
  // Fetch enrollments data
  const { db } = await connectToDatabase()
  
  // Get all enrollments with populated user and course info
  const enrollments = await db.collection("enrollments").find({}).toArray() as EnrollmentType[];
  
  // Get user and course information separately
  const userIds = enrollments.map(enrollment => enrollment.userId);
  const courseIds = enrollments.map(enrollment => enrollment.courseId);
  
  // Fetch all users and courses for the enrollments
  const users = await db.collection("users").find({}).toArray();
  const courses = await db.collection("coursedetails").find({}).toArray();
  
  // Create lookup maps for users and courses
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user._id.toString(), user);
  });
  
  const courseMap = new Map();
  courses.forEach(course => {
    courseMap.set(course.id, course);
  });
  
  // Enhance enrollments with user and course info
  const enhancedEnrollments: EnhancedEnrollmentType[] = enrollments.map(enrollment => {
    const user = userMap.get(enrollment.userId);
    const course = courseMap.get(enrollment.courseId);
    
    return {
      ...enrollment,
      userInfo: user ? {
        name: user.name,
        email: user.email
      } : null,
      courseInfo: course ? {
        title: course.title,
        id: course.id
      } : null
    };
  });
  
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
            {enhancedEnrollments.length === 0 ? (
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
                  {enhancedEnrollments.map((enrollment) => (
                    <TableRow key={enrollment._id.toString()}>
                      <TableCell className="font-medium">{enrollment.userInfo?.name || 'Unknown'}</TableCell>
                      <TableCell>{enrollment.courseInfo?.title || enrollment.courseName || 'Unknown Course'}</TableCell>
                      <TableCell>
                        {enrollment.progress ? `${enrollment.progress}%` : '0%'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={enrollment.status === 'active' ? "default" : 
                                  enrollment.status === 'completed' ? "outline" : "secondary"}
                        >
                          {enrollment.status || 'Enrolled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {enrollment.enrolledAt ? 
                          formatRelativeTime(enrollment.enrolledAt) : 
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
                            {enrollment.courseInfo?.id && (
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/courses/${enrollment.courseInfo.id}`}>
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