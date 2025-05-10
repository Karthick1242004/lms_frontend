import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/auth-utils"
import DashboardHeader from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Users, BookOpen, BarChart, Award, PieChart, LineChart } from "lucide-react"
import { connectToDatabase } from "@/lib/mongodb"

export default async function AdminDashboardPage() {
  // Check if user is authenticated and is the super admin
  const session = await getServerSession(authOptions)
  
  if (!session || !isSuperAdmin(session)) {
    redirect("/dashboard")
  }
  
  // Fetch dashboard stats
  const { db } = await connectToDatabase()
  
  // Get total users count
  const usersCount = await db.collection("users").countDocuments()
  
  // Get total enrollments count
  const enrollmentsCount = await db.collection("enrollments").countDocuments()
  
  // Get total courses count
  const coursesCount = await db.collection("coursedetails").countDocuments()
  
  // Get total assessments completions count
  const assessmentsCount = await db.collection("assessmentResults").countDocuments({ passed: true })
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Admin Dashboard" 
        text="View and manage all system data"
      />
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered users</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/admin/users">View All Users</Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollmentsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Course enrollments</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/admin/enrollments">View All Enrollments</Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coursesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Available courses</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/courses">View All Courses</Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Assessments</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessmentsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Passed assessments</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/admin/progress">View Progress</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>Quick actions for system management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/admin/users">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/admin/enrollments">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Enrollments
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/admin/progress">
                  <BarChart className="mr-2 h-4 w-4" />
                  Track User Progress
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/courses">
                  <Award className="mr-2 h-4 w-4" />
                  Manage Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reporting</CardTitle>
              <CardDescription>Data insights and exportable reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/admin/analytics">
                  <PieChart className="mr-2 h-4 w-4" />
                  System Analytics
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/instructors/analytics">
                  <LineChart className="mr-2 h-4 w-4" />
                  Course Analytics
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/admin/analytics?tab=export">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export Reports
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 