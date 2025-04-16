"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useStore } from "@/lib/store"
import type { Course, Lesson } from "@/lib/types"
import { CheckCircle, Clock, PlayCircle, Users, AlertCircle } from "lucide-react"
import LessonVideo from "./lesson-video"
import { useQuery } from "@tanstack/react-query"
import { fetchCourseById } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

interface CourseDetailsProps {
  courseId: string
}

export default function CourseDetails({ courseId }: CourseDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedLesson, setSelectedLesson] = useState<{
    moduleIndex: number;
    lessonIndex: number;
    title: string;
  } | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { enrolledCourses, enrollInCourse, loadingEnrollment } = useStore()
  const [isEnrolling, setIsEnrolling] = useState(false)

  const {
    data: course,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourseById(courseId),
  })

  // Query for fetching attendance data
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance
  } = useQuery({
    queryKey: ["attendance", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/status?courseId=${courseId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch attendance data")
      }
      return response.json()
    },
    enabled: !!courseId && enrolledCourses.includes(courseId)
  })

  // Refetch attendance data when a lesson is completed
  useEffect(() => {
    // Set up an interval to refresh attendance data
    const intervalId = setInterval(() => {
      if (enrolledCourses.includes(courseId)) {
        refetchAttendance()
      }
    }, 60000) // Refresh every minute
    
    return () => clearInterval(intervalId)
  }, [courseId, enrolledCourses, refetchAttendance])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-1">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <Skeleton className="h-96" />
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Course</h3>
        <p className="text-muted-foreground mb-4">
          There was an error loading the course details. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  const isEnrolled = enrolledCourses.includes(course.id)

  const handleEnroll = async () => {
    setIsEnrolling(true)
    
    try {
      const success = await enrollInCourse(course.id)
      
      if (success) {
        toast({
          title: "Enrolled Successfully",
          description: `You have been enrolled in ${course.title}`,
        })
        
        // Fetch attendance data after enrollment
        setTimeout(() => {
          refetchAttendance()
        }, 1000)
      } else {
        toast({
          title: "Enrollment Failed",
          description: "Failed to enroll in course. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEnrolling(false)
    }
  }
  
  const handleLessonClick = (moduleIndex: number, lessonIndex: number, title: string) => {
    setSelectedLesson({
      moduleIndex,
      lessonIndex,
      title,
    })
  }
  
  const handleNavigateLesson = (direction: 'next' | 'previous') => {
    if (!selectedLesson || !course.syllabus) return
    
    const { moduleIndex, lessonIndex } = selectedLesson
    const currentModule = course.syllabus[moduleIndex]
    
    if (direction === 'next') {
      // If there's another lesson in the current module
      if (lessonIndex < currentModule.lessons.length - 1) {
        setSelectedLesson({
          moduleIndex,
          lessonIndex: lessonIndex + 1,
          title: currentModule.lessons[lessonIndex + 1].title,
        })
      } 
      // Go to the first lesson of the next module
      else if (moduleIndex < course.syllabus.length - 1) {
        const nextModule = course.syllabus[moduleIndex + 1]
        setSelectedLesson({
          moduleIndex: moduleIndex + 1,
          lessonIndex: 0,
          title: nextModule.lessons[0].title,
        })
      }
    } else if (direction === 'previous') {
      if (lessonIndex > 0) {
        setSelectedLesson({
          moduleIndex,
          lessonIndex: lessonIndex - 1,
          title: currentModule.lessons[lessonIndex - 1].title,
        })
      } 
      // Go to the last lesson of the previous module
      else if (moduleIndex > 0) {
        const prevModule = course.syllabus[moduleIndex - 1]
        const lastLessonIndex = prevModule.lessons.length - 1
        setSelectedLesson({
          moduleIndex: moduleIndex - 1,
          lessonIndex: lastLessonIndex,
          title: prevModule.lessons[lastLessonIndex].title,
        })
      }
    }
  }
  
  const getAdjacentLessons = () => {
    if (!selectedLesson || !course.syllabus) return { current: null, next: null, previous: null }
    
    const { moduleIndex, lessonIndex } = selectedLesson
    const currentModule = course.syllabus[moduleIndex]
    const currentLesson = currentModule.lessons[lessonIndex]
    
    let nextLesson = null
    let previousLesson = null
    
    // Check for next lesson in current module
    if (lessonIndex < currentModule.lessons.length - 1) {
      nextLesson = currentModule.lessons[lessonIndex + 1]
    } 
    // Check first lesson of next module
    else if (moduleIndex < course.syllabus.length - 1) {
      nextLesson = course.syllabus[moduleIndex + 1].lessons[0]
    }
    
    // Check for previous lesson in current module
    if (lessonIndex > 0) {
      previousLesson = currentModule.lessons[lessonIndex - 1]
    } 
    // Check last lesson of previous module
    else if (moduleIndex > 0) {
      const prevModule = course.syllabus[moduleIndex - 1]
      previousLesson = prevModule.lessons[prevModule.lessons.length - 1]
    }
    
    return { current: currentLesson, next: nextLesson, previous: previousLesson }
  }
  
  const handleCloseVideo = () => {
    setSelectedLesson(null)
    // Refresh attendance data when closing the video
    if (isEnrolled) {
      refetchAttendance()
    }
  }

  // Get lesson status from attendance data
  const getLessonStatus = (moduleIndex: number, lessonIndex: number) => {
    if (!attendanceData?.courseProgress?.lessonStatus) return null
    
    const key = `${moduleIndex}-${lessonIndex}`
    return attendanceData.courseProgress.lessonStatus[key] || null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground">Instructor: {course.instructor}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Back to Courses
          </Button>
          <Button 
            onClick={handleEnroll} 
            disabled={isEnrolled || isEnrolling || loadingEnrollment}
          >
            {isEnrolling || loadingEnrollment ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
                Loading...
              </>
            ) : isEnrolled ? "Enrolled" : "Enroll Now"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsList className="mt-2 grid w-full grid-cols-1">
              <TabsTrigger value="learning-pathway">Learning Pathway</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">About this course</h3>
                    <p className="mt-2 text-muted-foreground">{course.description}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">{course.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Students</p>
                        <p className="text-sm text-muted-foreground">{course.students} enrolled</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{course.level}</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">What you'll learn</h3>
                    <ul className="mt-2 grid gap-2 md:grid-cols-2">
                      {course.learningOutcomes?.map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                          <span className="text-sm">{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="syllabus">
              <CardContent className="p-6">
                {selectedLesson ? (
                  <LessonVideo
                    lessonTitle={selectedLesson.title}
                    videoPath={course.syllabus?.[selectedLesson.moduleIndex]?.lessons[selectedLesson.lessonIndex]?.videoPath || "/video/HTML/HTML Crash Course In 30 Minutes.mp4"}
                    currentLesson={getAdjacentLessons().current!}
                    nextLesson={getAdjacentLessons().next || undefined}
                    previousLesson={getAdjacentLessons().previous || undefined}
                    onNavigate={(lesson) => {
                      // Find the indices for the lesson to navigate to
                      course.syllabus?.forEach((module, mIndex) => {
                        const lIndex = module.lessons.findIndex(l => l === lesson)
                        if (lIndex !== -1) {
                          handleLessonClick(mIndex, lIndex, lesson.title)
                        }
                      })
                    }}
                    onClose={handleCloseVideo}
                    courseId={courseId}
                    moduleIndex={selectedLesson.moduleIndex}
                    lessonIndex={selectedLesson.lessonIndex}
                  />
                ) :
                  <div className="space-y-4">
                    {course.syllabus?.map((module, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">
                            Module {index + 1}: {module.title}
                          </h3>
                          <Badge variant="outline">{module.duration}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        <ul className="space-y-2">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const lessonStatus = getLessonStatus(index, lessonIndex)
                            return (
                              <li 
                                key={lessonIndex} 
                                className={`flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 cursor-pointer transition-colors ${
                                  lessonStatus === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""
                                }`}
                                onClick={() => handleLessonClick(index, lessonIndex, lesson.title)}
                              >
                                <div className="flex items-center gap-2">
                                  {lessonStatus === "completed" ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <PlayCircle className="h-5 w-5 text-primary" />
                                  )}
                                  <span className="text-sm font-medium">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{lesson.duration}</Badge>
                                  {lessonStatus === "in-progress" && (
                                    <Badge variant="secondary">In Progress</Badge>
                                  )}
                                  {lessonStatus === "completed" && (
                                    <Badge variant="secondary" className="bg-green-500 text-white">Completed</Badge>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                }
              </CardContent>
            </TabsContent>

            <TabsContent value="resources">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Course Resources</h3>
                  <ul className="space-y-2">
                    {course.resources?.map((resource, index) => (
                      <li key={index} className="flex items-center justify-between rounded-md border p-3">
                        <span className="text-sm font-medium">{resource.title}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            Download
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="learning-pathway">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Your Learning Journey</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Overall Progress: </span>
                      <span className="text-sm font-bold">
                        {isLoadingAttendance ? "Loading..." : `${attendanceData?.courseProgress?.overallProgress || 0}%`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    {/* Main pathway line */}
                    <div className="absolute left-4 top-0 bottom-0 w-1 bg-muted"></div>
                    
                    {course.syllabus?.map((module, moduleIndex) => {
                      // Get module progress data
                      const moduleProgress = !isLoadingAttendance && 
                        attendanceData?.courseProgress?.moduleProgress?.find(
                          (m: any) => m.moduleIndex === moduleIndex
                        );
                      
                      const progress = moduleProgress?.progress || 0;
                      const isCompleted = progress === 100;
                      const inProgress = progress > 0 && progress < 100;
                      
                      return (
                        <div key={moduleIndex} className="mb-8 relative">
                          {/* Module node */}
                          <div className={`absolute left-4 w-6 h-6 rounded-full -translate-x-2.5 flex items-center justify-center ${
                            isCompleted 
                              ? "bg-green-500" 
                              : inProgress 
                                ? "bg-primary" 
                                : "bg-muted-foreground"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <span className="text-white text-xs">{moduleIndex + 1}</span>
                            )}
                          </div>
                          
                          {/* Module content */}
                          <div className="ml-10 pb-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-md font-semibold">{module.title}</h4>
                              <Badge variant={isCompleted ? "outline" : "secondary"} className={isCompleted ? "border-green-500 text-green-500" : ""}>
                                {isCompleted 
                                  ? "Completed" 
                                  : inProgress 
                                    ? `${progress}% Complete` 
                                    : "Not Started"}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground my-2">{module.description}</p>
                            
                            {/* Module progress bar */}
                            <div className="w-full bg-muted rounded-full h-2 mb-3">
                              <div 
                                className={`h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-primary"}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            
                            {/* Lesson list */}
                            <div className="space-y-2 mt-3">
                              {module.lessons.map((lesson, lessonIndex) => {
                                const lessonStatus = getLessonStatus(moduleIndex, lessonIndex);
                                const isLessonCompleted = lessonStatus?.status === "completed";
                                const isLessonInProgress = lessonStatus?.status === "in-progress";
                                
                                return (
                                  <div
                                    key={lessonIndex}
                                    className={`flex items-center p-2 rounded-md border transition-colors cursor-pointer ${
                                      isLessonCompleted 
                                        ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                                        : isLessonInProgress 
                                          ? "border-primary bg-primary/10"
                                          : "hover:bg-accent/50"
                                    }`}
                                    onClick={() => handleLessonClick(moduleIndex, lessonIndex, lesson.title)}
                                  >
                                    <div className="flex-shrink-0 w-6 h-6 mr-2 flex items-center justify-center">
                                      {isLessonCompleted ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : isLessonInProgress ? (
                                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                                      ) : (
                                        <div className="h-2 w-2 rounded-full border border-muted-foreground"></div>
                                      )}
                                    </div>
                                    <span className="text-sm">{lesson.title}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{lesson.duration}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
              {isEnrolled ? (
                <CardDescription>Track your progress in this course</CardDescription>
              ) : (
                <CardDescription>Enroll to track your progress</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm font-medium">
                        {isLoadingAttendance ? "Loading..." : `${attendanceData?.courseProgress?.overallProgress || 0}%`}
                      </span>
                    </div>
                    <Progress value={isLoadingAttendance ? 0 : attendanceData?.courseProgress?.overallProgress || 0} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Modules Progress</span>
                    {!isLoadingAttendance && attendanceData?.courseProgress?.moduleProgress && (
                      <div className="space-y-3 mt-2">
                        {attendanceData.courseProgress.moduleProgress.map((module: any) => (
                          <div key={module.moduleIndex} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{module.title}</span>
                              <span>
                                {module.completedLessons}/{module.totalLessons} lessons
                              </span>
                            </div>
                            <Progress value={module.progress} className="h-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 pt-2">
                    <span className="text-sm font-medium">Completed Lessons</span>
                    <p className="text-2xl font-bold">
                      {isLoadingAttendance 
                        ? "Loading..." 
                        : `${attendanceData?.courseProgress?.completedLessons || 0}/${attendanceData?.courseProgress?.totalLessons || 0}`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">Enroll to start tracking your progress</p>
                  <Button onClick={handleEnroll}>Enroll Now</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">{course.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Updated</span>
                  <span className="text-sm font-medium">{course.updatedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Language</span>
                  <span className="text-sm font-medium">{course.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Certificate</span>
                  <span className="text-sm font-medium">{course.certificate ? "Yes" : "No"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

