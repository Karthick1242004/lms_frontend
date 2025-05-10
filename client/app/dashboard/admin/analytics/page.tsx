"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin, hasAdminPrivileges } from "@/lib/auth-utils"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import DashboardHeader from "@/components/dashboard/page-header"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { Download, FileDown, Users, Book, Award, BarChart2 } from "lucide-react"

type Course = {
  id: string
  title: string
  instructor: string
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get("courseId")
  const { data: session, status } = useSession()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courseId)
  const [exportType, setExportType] = useState<string>("engagement")
  
  // Fetch all courses for the selector
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses")
      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }
      return response.json()
    },
    enabled: status === "authenticated" && hasAdminPrivileges(session)
  })
  
  // Fetch selected course analytics
  const { data: analytics, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["course-analytics", selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) throw new Error("No course selected")
      
      const response = await fetch(`/api/analytics?courseId=${selectedCourseId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }
      return response.json()
    },
    enabled: !!selectedCourseId && status === "authenticated" && hasAdminPrivileges(session)
  })
  
  // Fetch system-wide analytics
  const { data: systemAnalytics, isLoading: isLoadingSystemAnalytics, refetch: refetchSystemAnalytics } = useQuery({
    queryKey: ["system-analytics"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/system")
      if (!response.ok) {
        throw new Error("Failed to fetch system analytics")
      }
      return response.json()
    },
    enabled: status === "authenticated" && hasAdminPrivileges(session)
  })
  
  useEffect(() => {
    if (courseId) {
      setSelectedCourseId(courseId)
    } else if (courses?.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courseId, courses, selectedCourseId])
  
  // Handle course selection change
  const handleCourseChange = (value: string) => {
    setSelectedCourseId(value)
    router.push(`/dashboard/admin/analytics?courseId=${value}`)
  }
  
  // Download a CSV report
  const downloadCSV = (reportType: string) => {
    if (!selectedCourseId) return
    window.open(`/api/analytics/export?courseId=${selectedCourseId}&reportType=${reportType}`, '_blank')
  }
  
  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
  
  // Format percentage
  const formatPercentage = (value: number) => `${Math.round(value)}%`
  
  // Mock system-wide data for demonstration
  // In a real implementation, this would come from the API
  const mockSystemData = {
    totalUsers: 253,
    activeUsers: 175,
    totalCourses: 12,
    completionRate: 68,
    totalEnrollments: 850,
    engagementOverTime: [
      { date: '2023-03', users: 120 },
      { date: '2023-04', users: 145 },
      { date: '2023-05', users: 160 },
      { date: '2023-06', users: 178 },
      { date: '2023-07', users: 170 },
      { date: '2023-08', users: 190 },
    ],
    topCourses: [
      { name: 'Web Development', enrollments: 145, completionRate: 72 },
      { name: 'Data Science', enrollments: 120, completionRate: 65 },
      { name: 'Mobile App Dev', enrollments: 98, completionRate: 58 },
      { name: 'UX Design', enrollments: 87, completionRate: 74 },
      { name: 'AI Fundamentals', enrollments: 76, completionRate: 61 },
    ],
    enrollmentsByMonth: [
      { month: 'Jan', count: 45 },
      { month: 'Feb', count: 52 },
      { month: 'Mar', count: 67 },
      { month: 'Apr', count: 75 },
      { month: 'May', count: 85 },
      { month: 'Jun', count: 98 },
    ]
  }
  
  if (status === "loading" || isLoadingCourses) {
    return (
      <div className="flex flex-col h-full">
        <DashboardHeader 
          heading="System Analytics" 
          text="View and export detailed analytics across the learning platform"
        />
        <Separator />
        <div className="p-6">
          <Skeleton className="w-full h-12 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
          </div>
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || !hasAdminPrivileges(session)) {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="System Analytics" 
        text="View and export detailed analytics across the learning platform"
      />
      <Separator />
      <div className="p-6 flex-1 overflow-auto">
        <Tabs defaultValue="system">
          <TabsList className="mb-4">
            <TabsTrigger value="system">System Overview</TabsTrigger>
            <TabsTrigger value="course">Course Analytics</TabsTrigger>
            <TabsTrigger value="export">Export Reports</TabsTrigger>
          </TabsList>
          
          {/* System-wide analytics tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-2xl font-bold">{mockSystemData.totalUsers}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Active Users</div>
                    <div className="text-xs font-medium">
                      {formatPercentage((mockSystemData.activeUsers / mockSystemData.totalUsers) * 100)}
                    </div>
                  </div>
                  <Progress 
                    value={(mockSystemData.activeUsers / mockSystemData.totalUsers) * 100} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Book className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-2xl font-bold">{mockSystemData.totalCourses}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Avg. Completion Rate</div>
                    <div className="text-xs font-medium">
                      {formatPercentage(mockSystemData.completionRate)}
                    </div>
                  </div>
                  <Progress 
                    value={mockSystemData.completionRate} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Enrollments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Award className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-2xl font-bold">{mockSystemData.totalEnrollments}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Per Course</div>
                    <div className="text-xs font-medium">
                      {Math.round(mockSystemData.totalEnrollments / mockSystemData.totalCourses)}
                    </div>
                  </div>
                  <Progress 
                    value={100} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <BarChart2 className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-2xl font-bold">{formatPercentage(mockSystemData.completionRate)}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Overall Progress</div>
                    <div className="text-xs font-medium">
                      {formatPercentage(mockSystemData.completionRate)}
                    </div>
                  </div>
                  <Progress 
                    value={mockSystemData.completionRate} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Over Time</CardTitle>
                  <CardDescription>
                    Active users per month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={mockSystemData.engagementOverTime}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                        name="Active Users" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Enrollments</CardTitle>
                  <CardDescription>
                    New enrollments by month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={mockSystemData.enrollmentsByMonth}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#82ca9d" name="Enrollments" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Courses by Enrollment</CardTitle>
                <CardDescription>
                  Most popular courses and their completion rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSystemData.topCourses.map((course, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>{course.enrollments}</TableCell>
                        <TableCell>{formatPercentage(course.completionRate)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            course.completionRate >= 70 ? "default" : 
                            course.completionRate >= 50 ? "secondary" : 
                            "destructive"
                          }>
                            {course.completionRate >= 70 ? "Excellent" : 
                             course.completionRate >= 50 ? "Good" : 
                             "Needs Improvement"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Course-specific analytics tab */}
          <TabsContent value="course" className="space-y-6">
            <div className="flex space-x-4 items-center mb-6">
              <div className="w-64">
                <Select value={selectedCourseId || ""} onValueChange={handleCourseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course: Course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchAnalytics()} 
                disabled={isLoadingAnalytics}
              >
                Refresh Data
              </Button>
            </div>
            
            {isLoadingAnalytics && selectedCourseId && (
              <div className="space-y-4">
                <Skeleton className="w-full h-32" />
                <Skeleton className="w-full h-96" />
              </div>
            )}
            
            {analytics && !isLoadingAnalytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Enrollments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.enrollmentCount}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Avg. Completion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(analytics.progressOverview.averageCompletion)}
                      </div>
                      <Progress 
                        value={analytics.progressOverview.averageCompletion} 
                        className="h-1 mt-2" 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Quiz Pass Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(analytics.quizAnalytics.passRate)}
                      </div>
                      <Progress 
                        value={analytics.quizAnalytics.passRate} 
                        className="h-1 mt-2" 
                      />
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson Completion</CardTitle>
                    <CardDescription>
                      Completion rates for individual lessons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module</TableHead>
                          <TableHead>Lesson</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Completion Rate</TableHead>
                          <TableHead>Drop-off Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.attendanceHeatmap.map((item, index) => (
                          <TableRow key={`${item.moduleIndex}-${item.lessonIndex}`}>
                            <TableCell>{item.moduleTitle}</TableCell>
                            <TableCell className="font-medium">{item.lessonTitle}</TableCell>
                            <TableCell>{item.startedCount} / {item.totalEnrolled}</TableCell>
                            <TableCell>{item.completionCount} / {item.totalEnrolled}</TableCell>
                            <TableCell>{formatPercentage(item.completionRate)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                item.dropOffRate <= 20 ? "default" : 
                                item.dropOffRate <= 40 ? "secondary" : 
                                "destructive"
                              }>
                                {formatPercentage(item.dropOffRate)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          {/* Data export tab */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Analytics Data</CardTitle>
                <CardDescription>
                  Download detailed reports in CSV format for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Course</label>
                    <Select value={selectedCourseId || ""} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((course: Course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <Select value={exportType} onValueChange={setExportType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engagement">User Engagement</SelectItem>
                        <SelectItem value="completion">Course Completion</SelectItem>
                        <SelectItem value="assessment">Assessment Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full" 
                      onClick={() => downloadCSV(exportType)}
                      disabled={!selectedCourseId}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Download CSV Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Available Reports</CardTitle>
                <CardDescription>
                  Description of the available report types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">User Engagement Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Detailed data on how users interact with course content, including lesson views,
                      watch times, and activity timestamps.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Course Completion Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Overview of user progress through courses, including completion percentages,
                      completed lessons, and certificate status.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Assessment Performance Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Quiz and assessment results, including scores, pass rates, and question-by-question
                      analysis of student performance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 