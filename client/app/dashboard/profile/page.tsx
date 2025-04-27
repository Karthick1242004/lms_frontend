"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ColoredProgress } from "@/components/ui/colored-progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Pencil, Award, BookOpen, FileText, Download, ExternalLink } from "lucide-react"
import DashboardHeader from "@/components/dashboard/page-header"
import type { Course } from "@/lib/types"
import Link from "next/link"

interface UserProgress {
  courseId: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActivityDate?: string;
  certificateEarned?: boolean;
  certificateId?: string;
  certificateDate?: string;
}

interface AssessmentResult {
  courseId: string;
  courseName: string;
  score: number;
  passed: boolean;
  completedAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { enrolledCourses } = useStore()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({})
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([])
  const [activeTab, setActiveTab] = useState("courses")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }

    if (status === "authenticated" && enrolledCourses.length > 0) {
      fetchUserCourses()
      fetchUserProgress()
      fetchAssessmentResults()
    } else if (status === "authenticated") {
      setLoading(false)
    }
  }, [status, enrolledCourses])

  const fetchUserCourses = async () => {
    try {
      const response = await fetch("/api/courses")
      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }
      
      const data = await response.json()
      const userCourses = data.courses.filter((course: Course) => 
        enrolledCourses.includes(course.id)
      )
      
      setCourses(userCourses)
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast({
        title: "Error",
        description: "Failed to load your courses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProgress = async () => {
    try {
      const response = await fetch("/api/user/progress")
      if (!response.ok) {
        throw new Error("Failed to fetch user progress")
      }
      
      const data = await response.json()
      
      // Get assessment results to update progress
      const assessmentResponse = await fetch("/api/user/assessments")
      if (assessmentResponse.ok) {
        const assessmentData = await assessmentResponse.json()
        const assessmentResults = assessmentData.results || []
        
        // Create a map of progress data
        const progressData: Record<string, UserProgress> = {}
        
        // Initialize with existing course progress
        if (data.courses) {
          Object.entries(data.courses).forEach(([courseId, courseProgress]: [string, any]) => {
            progressData[courseId] = {
              courseId,
              progress: courseProgress.progress || 0,
              completedLessons: courseProgress.completedLessons || 0,
              totalLessons: courseProgress.totalLessons || 0,
              lastActivityDate: courseProgress.lastAccessed,
              certificateEarned: courseProgress.certificateEarned || false,
              certificateId: courseProgress.certificateId,
              certificateDate: courseProgress.certificateDate
            }
          })
        }
        
        // Update progress with assessment results
        assessmentResults.forEach((result: AssessmentResult) => {
          if (progressData[result.courseId]) {
            // If course exists in progress, update with assessment data
            if (result.passed && result.score > 0) {
              progressData[result.courseId].progress = Math.max(progressData[result.courseId].progress, result.score)
            }
          } else {
            // If new course from assessment, add it
            progressData[result.courseId] = {
              courseId: result.courseId,
              progress: result.passed ? result.score : 0,
              completedLessons: 0,
              totalLessons: 0,
              lastActivityDate: result.completedAt,
              certificateEarned: result.passed,
              certificateDate: result.passed ? result.completedAt : undefined
            }
          }
        })
        
        setUserProgress(progressData)
      } else if (data.courses) {
        setUserProgress(data.courses)
      }
    } catch (error) {
      console.error("Error fetching user progress:", error)
    }
  }

  const fetchAssessmentResults = async () => {
    try {
      const response = await fetch("/api/user/assessments")
      if (!response.ok) {
        throw new Error("Failed to fetch assessment results")
      }
      
      const data = await response.json()
      if (data.results) {
        setAssessmentResults(data.results)
      }
    } catch (error) {
      console.error("Error fetching assessment results:", error)
    }
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col h-full">
        <DashboardHeader 
          heading="Profile" 
          text="View your profile, courses, and certificates"
        />
        <Separator />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-center items-center h-full">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate user stats
  const completedCourses = Object.values(userProgress).filter(p => p.progress === 100 || p.progress >= 97).length
  const certificatesEarned = Object.values(userProgress).filter(p => p.certificateEarned).length
  const averageProgress = Object.values(userProgress).length > 0 
    ? Math.round(Object.values(userProgress).reduce((sum, p) => sum + p.progress, 0) / Object.values(userProgress).length) 
    : 0

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Profile" 
        text="View your profile, courses, and certificates"
      />
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                <AvatarFallback className="text-xl">{
                  session?.user?.name
                    ? session.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "U"
                }</AvatarFallback>
              </Avatar>
              <CardTitle>{session?.user?.name}</CardTitle>
              <CardDescription>{session?.user?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Courses Enrolled:</span>
                    <span className="font-medium">{enrolledCourses.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed Courses:</span>
                    <span className="font-medium">{completedCourses}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Certificates Earned:</span>
                    <span className="font-medium">{certificatesEarned}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Progress:</span>
                    <span className="font-medium">{averageProgress}%</span>
                  </div>
                  <Progress value={averageProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardFooter>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="courses" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="courses">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Courses
                </TabsTrigger>
                <TabsTrigger value="assessments">
                  <FileText className="h-4 w-4 mr-2" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="certificates">
                  <Award className="h-4 w-4 mr-2" />
                  Certificates
                </TabsTrigger>
              </TabsList>

              {/* Courses Tab */}
              <TabsContent value="courses" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.length === 0 ? (
                    <div className="col-span-full flex justify-center p-8">
                      <div className="text-center">
                        <p className="text-lg font-medium">No courses enrolled</p>
                        <p className="text-muted-foreground mt-1">Browse courses to get started</p>
                        <Button className="mt-4" asChild>
                          <Link href="/dashboard/courses">Find Courses</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    courses.map(course => {
                      const progress = userProgress[course.id]?.progress || 0;
                      const badgeText = progress === 100 ? "Completed" : 
                                     progress >= 97 ? "Passed Assessment" : "In Progress";
                      const badgeVariant = progress >= 97 ? "default" : "secondary";
                      return (
                        <Card key={course.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg truncate">{course.title}</CardTitle>
                            <CardDescription className="truncate">{course.instructor}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress:</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                              
                              <div className="flex justify-between items-center text-sm">
                                <Badge variant={badgeVariant}>
                                  {badgeText}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {userProgress[course.id]?.completedLessons || 0}/{userProgress[course.id]?.totalLessons || 0} lessons
                                </span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                              <Link href={`/dashboard/courses/${course.id}`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Continue Learning
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              {/* Assessments Tab */}
              <TabsContent value="assessments">
                {assessmentResults.length === 0 ? (
                  <div className="flex justify-center p-8">
                    <div className="text-center">
                      <p className="text-lg font-medium">No assessments completed yet</p>
                      <p className="text-muted-foreground mt-1">Complete course assessments to see results here</p>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Assessment Results</CardTitle>
                      <CardDescription>Your performance in course assessments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {assessmentResults.map((result, index) => (
                          <div key={index} className="flex flex-col space-y-2 p-4 border rounded-lg">
                            <div className="flex justify-between">
                              <h3 className="font-medium">{result.courseName}</h3>
                              <Badge variant={result.passed ? "default" : "destructive"}>
                                {result.passed ? "Passed" : "Failed"}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Score:</span>
                              <span className="font-medium">{result.score}%</span>
                            </div>
                            <ColoredProgress 
                              value={result.score} 
                              className="h-2" 
                              color={result.passed ? "#22c55e" : "#ef4444"}
                            />
                            <div className="text-xs text-muted-foreground text-right">
                              Completed: {formatDate(result.completedAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Certificates Tab */}
              <TabsContent value="certificates">
                {certificatesEarned === 0 ? (
                  <div className="flex justify-center p-8">
                    <div className="text-center">
                      <p className="text-lg font-medium">No certificates earned yet</p>
                      <p className="text-muted-foreground mt-1">Complete courses to earn certificates</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(userProgress)
                      .filter(([_, progress]) => progress.certificateEarned)
                      .map(([courseId, progress]) => {
                        const course = courses.find(c => c.id === courseId);
                        return (
                          <Card key={courseId} className="overflow-hidden">
                            <CardHeader className="pb-2 text-center bg-muted/30">
                              <Award className="h-12 w-12 mx-auto text-primary" />
                              <CardTitle className="text-lg">{course?.title || "Course"}</CardTitle>
                              <CardDescription>Certificate of Completion</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 text-center">
                              <p className="text-sm">
                                Awarded to <span className="font-medium">{session?.user?.name}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Issued on {formatDate(progress.certificateDate || '')}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Certificate ID: {progress.certificateId || 'N/A'}
                              </p>
                            </CardContent>
                            <CardFooter className="flex justify-center gap-2">
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button size="sm">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </CardFooter>
                          </Card>
                        )
                      })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
} 