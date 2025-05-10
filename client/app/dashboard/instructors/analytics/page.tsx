"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import DashboardHeader from "@/components/dashboard/page-header"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Download, AlertCircle } from "lucide-react"

type Course = {
  id: string
  title: string
  instructor: string
}

type HeatmapCell = {
  moduleTitle: string
  lessonTitle: string
  completionCount: number
  startedCount: number
  totalEnrolled: number
  dropOffRate: number
  completionRate: number
  averageViewTime: number
  moduleIndex: number
  lessonIndex: number
}

type QuizAnalytics = {
  totalAssessments: number
  passRate: number
  averageScore: number
  highestScore: number
  lowestScore: number
  scoreDistribution: Record<string, number>
  questionAnalysis: Record<string, {
    totalAttempts: number
    correctAttempts: number
    successRate: number
  }>
}

type ProgressOverview = {
  totalEnrollments: number
  inProgressCount: number
  completedCount: number
  averageCompletion: number
  totalCompletedLessons: number
  progressDistribution: Record<string, number>
}

type AnalyticsData = {
  courseId: string
  courseTitle: string
  enrollmentCount: number
  totalLessons: number
  modulesData: Array<{
    title: string
    lessons: Array<{
      title: string
      index: number
    }>
  }>
  attendanceHeatmap: HeatmapCell[]
  quizAnalytics: QuizAnalytics
  progressOverview: ProgressOverview
}

// Custom heatmap component
const AttendanceHeatmap = ({ data, totalEnrolled }: { data: HeatmapCell[], totalEnrolled: number }) => {
  // Group data by module
  const moduleGroups = data.reduce((acc, cell) => {
    if (!acc[cell.moduleTitle]) {
      acc[cell.moduleTitle] = []
    }
    acc[cell.moduleTitle].push(cell)
    return acc
  }, {} as Record<string, HeatmapCell[]>)

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500" // Very high completion
    if (rate >= 70) return "bg-green-400"
    if (rate >= 50) return "bg-yellow-400"
    if (rate >= 30) return "bg-orange-400"
    if (rate >= 10) return "bg-red-400"
    return "bg-red-500" // Very low completion
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Lesson Completion Heatmap</div>
        <div className="flex items-center space-x-2">
          <div className="text-xs">Low</div>
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
            <div className="w-3 h-3 rounded-sm bg-orange-400"></div>
            <div className="w-3 h-3 rounded-sm bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-sm bg-green-400"></div>
            <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          </div>
          <div className="text-xs">High</div>
        </div>
      </div>
      
      <div className="space-y-4">
        {Object.entries(moduleGroups).map(([moduleTitle, lessons]) => (
          <div key={moduleTitle} className="space-y-2">
            <div className="font-medium text-sm">{moduleTitle}</div>
            <div className="grid grid-cols-1 gap-2">
              {lessons.map(cell => (
                <div key={`${cell.moduleIndex}-${cell.lessonIndex}`} className="flex items-center space-x-3">
                  <div className="flex-1 truncate text-xs">{cell.lessonTitle}</div>
                  <div className={`w-10 h-6 rounded ${getCompletionColor(cell.completionRate)}`}>
                    <div className="flex justify-center items-center h-full text-white text-xs font-medium">
                      {Math.round(cell.completionRate)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-2 text-xs text-muted-foreground">
        Showing completion rates as percentage of enrolled students ({totalEnrolled}) who completed each lesson.
      </div>
    </div>
  )
}

export default function InstructorAnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get("courseId")
  const { data: session, status } = useSession()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courseId)
  
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["instructor-courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses/instructor")
      if (!response.ok) {
        throw new Error("Failed to fetch instructor courses")
      }
      return response.json()
    },
    enabled: status === "authenticated"
  })
  
  const { data: analytics, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["course-analytics", selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) throw new Error("No course selected")
      
      const response = await fetch(`/api/analytics?courseId=${selectedCourseId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }
      return response.json() as Promise<AnalyticsData>
    },
    enabled: !!selectedCourseId
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
    router.push(`/dashboard/instructors/analytics?courseId=${value}`)
  }
  
  // Prepare chart data
  const scoreDistributionData = analytics?.quizAnalytics ? 
    Object.entries(analytics.quizAnalytics.scoreDistribution).map(([range, count]) => ({
      name: range,
      count
    })) : []
  
  const progressDistributionData = analytics?.progressOverview ? 
    Object.entries(analytics.progressOverview.progressDistribution).map(([range, count]) => ({
      name: range,
      count
    })) : []
  
  const dropOffData = analytics?.attendanceHeatmap.map((item, index) => ({
    name: item.lessonTitle.length > 20 ? item.lessonTitle.substring(0, 20) + "..." : item.lessonTitle,
    rate: Math.round(item.dropOffRate)
  })).sort((a, b) => b.rate - a.rate).slice(0, 5) || []
  
  // Format percentage with % symbol
  const formatPercentage = (value: number) => `${Math.round(value)}%`
  
  // Colors for pie charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
  
  // Download and open CSV report in a new window
  const downloadCSV = (reportType: string) => {
    if (!selectedCourseId) return
    window.open(`/api/analytics/export?courseId=${selectedCourseId}&reportType=${reportType}`, '_blank')
  }

  if (status === "loading" || isLoadingCourses) {
    return (
      <div className="flex flex-col h-full">
        <DashboardHeader 
          heading="Course Analytics" 
          text="View detailed analytics and reports for your courses"
        />
        <Separator />
        <div className="p-6 flex-1">
          <Skeleton className="w-full h-12 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
          </div>
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Course Analytics" 
        text="View detailed analytics and reports for your courses"
      />
      <Separator />
      <div className="p-6 flex-1 overflow-auto">
        {/* Course selector */}
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
        
        {!selectedCourseId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Select a course to view analytics</AlertDescription>
          </Alert>
        )}
        
        {isLoadingAnalytics && selectedCourseId && (
          <div className="space-y-4">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-96" />
          </div>
        )}
        
        {analytics && !isLoadingAnalytics && (
          <div className="space-y-6">
            {/* Overview stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Enrollments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.enrollmentCount}</div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Completion Rate</div>
                    <div className="text-xs font-medium">
                      {formatPercentage(analytics.progressOverview.averageCompletion)}
                    </div>
                  </div>
                  <Progress 
                    value={analytics.progressOverview.averageCompletion} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Assessment Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.quizAnalytics.totalAssessments}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Pass Rate</div>
                    <div className="text-xs font-medium">
                      {formatPercentage(analytics.quizAnalytics.passRate)}
                    </div>
                  </div>
                  <Progress 
                    value={analytics.quizAnalytics.passRate} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lesson Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.progressOverview.totalCompletedLessons}/{analytics.totalLessons * analytics.enrollmentCount}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">Total Possible Completions</div>
                    <div className="text-xs font-medium">
                      {formatPercentage(
                        (analytics.progressOverview.totalCompletedLessons / 
                        (analytics.totalLessons * analytics.enrollmentCount || 1)) * 100
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={(analytics.progressOverview.totalCompletedLessons / 
                      (analytics.totalLessons * analytics.enrollmentCount || 1)) * 100} 
                    className="h-1 mt-1" 
                  />
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="attendance">
              <TabsList className="mb-4">
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="assessments">Assessments</TabsTrigger>
                <TabsTrigger value="progress">Course Progress</TabsTrigger>
              </TabsList>
              
              <TabsContent value="attendance" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Heatmap</CardTitle>
                      <CardDescription>
                        Lesson completion rates across modules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AttendanceHeatmap 
                        data={analytics.attendanceHeatmap} 
                        totalEnrolled={analytics.enrollmentCount} 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Drop-off Rates</CardTitle>
                      <CardDescription>
                        Lessons with the highest drop-off rates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dropOffData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={dropOffData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" width={150} />
                            <Tooltip formatter={(value) => [`${value}%`, 'Drop-off Rate']} />
                            <Legend />
                            <Bar dataKey="rate" fill="#ff4d4f" name="Drop-off Rate (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                          No drop-off data available
                        </div>
                      )}
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => downloadCSV('engagement')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Attendance Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="assessments" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Distribution</CardTitle>
                      <CardDescription>
                        Distribution of assessment scores
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {scoreDistributionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={scoreDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="name"
                              label={({ name, percent }) => 
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {scoreDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Students']} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                          No assessment data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Assessment Summary</CardTitle>
                      <CardDescription>
                        Key metrics from student assessments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Average Score</div>
                        <div className="flex items-center">
                          <div className="font-bold text-xl">
                            {analytics.quizAnalytics.averageScore.toFixed(1)}%
                          </div>
                          <Badge className="ml-2" variant={
                            analytics.quizAnalytics.averageScore >= 75 ? "default" : 
                            analytics.quizAnalytics.averageScore >= 60 ? "secondary" : 
                            "destructive"
                          }>
                            {analytics.quizAnalytics.averageScore >= 75 ? "Good" : 
                             analytics.quizAnalytics.averageScore >= 60 ? "Average" : 
                             "Needs Improvement"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Score Range</div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">
                            Low: <span className="font-bold">{analytics.quizAnalytics.lowestScore.toFixed(1)}%</span>
                          </div>
                          <div className="text-sm">→</div>
                          <div className="text-sm">
                            High: <span className="font-bold">{analytics.quizAnalytics.highestScore.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Pass Rate</div>
                        <Progress value={analytics.quizAnalytics.passRate} className="h-2" />
                        <div className="text-sm mt-1">
                          {analytics.quizAnalytics.passRate.toFixed(1)}% of students passed
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => downloadCSV('assessment')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Assessment Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="progress" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress Distribution</CardTitle>
                      <CardDescription>
                        Distribution of student progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {progressDistributionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={progressDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="name"
                              label={({ name, percent }) => 
                                `${name}%: ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {progressDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Students']} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                          No progress data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Course Completion Stats</CardTitle>
                      <CardDescription>
                        Student progress breakdown
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Completion Status</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Completed</div>
                            <div className="font-bold text-lg flex items-center">
                              {analytics.progressOverview.completedCount}
                              <span className="text-xs ml-1 text-muted-foreground">
                                ({formatPercentage(
                                  (analytics.progressOverview.completedCount / analytics.progressOverview.totalEnrollments || 1) * 100
                                )})
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">In Progress</div>
                            <div className="font-bold text-lg flex items-center">
                              {analytics.progressOverview.inProgressCount}
                              <span className="text-xs ml-1 text-muted-foreground">
                                ({formatPercentage(
                                  (analytics.progressOverview.inProgressCount / analytics.progressOverview.totalEnrollments || 1) * 100
                                )})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Average Completion</div>
                        <Progress value={analytics.progressOverview.averageCompletion} className="h-2" />
                        <div className="text-sm mt-1">
                          Students complete an average of {analytics.progressOverview.averageCompletion.toFixed(1)}% of the course
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => downloadCSV('completion')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Completion Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
} 