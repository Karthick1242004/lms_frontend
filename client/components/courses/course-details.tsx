"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useStore } from "@/lib/store"
import type { Course, Lesson } from "@/lib/types"
import { CheckCircle, Clock, PlayCircle, Users, AlertCircle, Award, Send } from "lucide-react"
import LessonVideo from "./lesson-video"
import { useQuery } from "@tanstack/react-query"
import { fetchCourseById } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { generateCertificateId } from "@/lib/utils"
import CertificateModal from "@/components/certificate/certificate-modal"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CourseDetailsProps {
  courseId: string
}

// Helper function for formatting dates
const formatTimeAgo = (date: Date | string): string => {
  const now = new Date()
  const messageDate = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hr ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  
  // Format date manually: "Jan 1, 2023"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = messageDate.getDate()
  const month = months[messageDate.getMonth()]
  const year = messageDate.getFullYear()
  
  return `${month} ${day}, ${year}`
}

// Interface for chat messages
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  timestamp: string;
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
  const [showCertificate, setShowCertificate] = useState(false)
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<Date | null>(null)
  const [canSendMessage, setCanSendMessage] = useState(true)
  const [page, setPage] = useState(1)

  const {
    data: course,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourseById(courseId),
  })

  // Store isEnrolled in a variable after we have the course and enrolledCourses
  const isEnrolled = !!course && enrolledCourses.includes(course.id)

  // Add a effect to handle errors
  useEffect(() => {
    if (error) {
      console.error("Error fetching course details:", error);
      toast({
        title: "Error",
        description: "Failed to load course details. Please try again.",
        variant: "destructive",
      });
    }
    if (course) {
      console.log("Successfully loaded course details:", course);
    }
  }, [error, course, toast]);

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

  // Query for fetching user details
  const { data: userDetails } = useQuery({
    queryKey: ['user-details'],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) {
        console.error("Failed to fetch user details:", await response.text())
        return null
      }
      return response.json()
    },
    enabled: !!courseId && enrolledCourses.includes(courseId)
  })

  // Query for fetching user progress data
  const {
    data: userProgressData,
    isLoading: isLoadingUserProgress,
    refetch: refetchUserProgress
  } = useQuery({
    queryKey: ["userProgress", courseId],
    queryFn: async () => {
      const response = await fetch("/api/user/progress")
      if (!response.ok) {
        throw new Error("Failed to fetch user progress data")
      }
      const data = await response.json()
      return data
    },
    enabled: !!courseId && enrolledCourses.includes(courseId)
  })

  // Query for fetching chat messages
  const {
    data: chatData,
    isLoading: isLoadingInitialMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["chatMessages", courseId, page],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/discussion?page=${page}&limit=20`)
      if (!response.ok) {
        throw new Error("Failed to fetch chat messages")
      }
      return response.json()
    },
    enabled: !!courseId && activeTab === "discussion" && isEnrolled
  })

  // Refetch progress data when a lesson is completed
  useEffect(() => {
    // Set up an interval to refresh attendance data
    const intervalId = setInterval(() => {
      if (enrolledCourses.includes(courseId)) {
        refetchAttendance().then(() => {
          console.log("Attendance data refreshed:", attendanceData);
        });
        refetchUserProgress();
      }
    }, 60000) // Refresh every minute

    // Initial fetch
    if (enrolledCourses.includes(courseId)) {
      refetchAttendance().then(() => {
        console.log("Initial attendance data:", attendanceData);
      });
      refetchUserProgress();
    }
    
    return () => clearInterval(intervalId)
  }, [courseId, enrolledCourses, refetchAttendance, refetchUserProgress, attendanceData])

  // Effect to populate messages when chat data changes
  useEffect(() => {
    if (chatData?.messages && activeTab === "discussion") {
      if (page === 1) {
        setMessages(chatData.messages)
      } else {
        setMessages(prev => [...chatData.messages, ...prev])
      }
      setHasMoreMessages(chatData.hasMore || false)
      setIsLoadingMessages(false)
    }
  }, [chatData, activeTab])
  
  // Scroll to bottom on new message
  useEffect(() => {
    if (activeTab === "discussion" && messagesEndRef.current && page === 1) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, activeTab])
  
  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!messageContainerRef.current || activeTab !== "discussion" || !isEnrolled) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMoreMessages && !isLoadingMessages) {
          loadMoreMessages()
        }
      },
      { threshold: 0.1 }
    )
    
    const container = messageContainerRef.current
    observer.observe(container)
    
    return () => {
      if (container) {
        observer.unobserve(container)
      }
    }
  }, [hasMoreMessages, isLoadingMessages, activeTab, isEnrolled])
  
  // Function to load more messages
  const loadMoreMessages = () => {
    if (isLoadingMessages || !hasMoreMessages) return
    
    setIsLoadingMessages(true)
    setPage(prev => prev + 1)
  }
  
  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !canSendMessage || !isEnrolled) return
    
    // Implement anti-spam control - only allow a message every 2 seconds
    setCanSendMessage(false)
    setTimeout(() => setCanSendMessage(true), 2000)
    
    // Add optimistic update
    const optimisticMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: userDetails?.id || "",
      userName: userDetails?.realName || userDetails?.name || "Anonymous",
      userImage: userDetails?.image || undefined,
      content: messageInput,
      timestamp: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setMessageInput("")
    setLastMessageTimestamp(new Date())
    
    try {
      const response = await fetch(`/api/courses/${courseId}/discussion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: messageInput,
        }),
      })
      
      if (!response.ok) {
        // Get error message from response if available
        let errorMessage = "Failed to send message";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Use default error message if parsing fails
        }
        
        // Remove optimistic message 
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        
        // Show error toast
        toast({
          title: "Failed to send message",
          description: errorMessage,
          variant: "destructive",
        });
        
        return; // Return early instead of throwing
      }
      
      // After successful send, refresh the messages
      refetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

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
    if (!isEnrolled) {
      toast({
        title: "Enrollment Required",
        description: "Please enroll in the course to access the lessons.",
        variant: "destructive",
      });
      return;
    }
    
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
      refetchAttendance().then(() => {
        console.log("Video closed - Attendance data:", attendanceData);
      });
      refetchUserProgress().then(() => {
        console.log("Video closed - User progress data:", userProgressData);
      });
    }
  }

  // Get lesson status from attendance data
  const getLessonStatus = (moduleIndex: number, lessonIndex: number) => {
    if (!userProgressData || !userProgressData.courses) return null
    
    // Extract lesson status from userProgress data
    const courseProgress = userProgressData.courses[courseId]
    if (courseProgress?.modules?.[moduleIndex]?.lessons?.[lessonIndex]) {
      return courseProgress.modules[moduleIndex].lessons[lessonIndex]
    }
    
    return null
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
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

            <TabsContent value="discussion">
              <CardContent className="p-6">
                {!isEnrolled ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Join the Discussion</h3>
                    <p className="text-muted-foreground mb-6">
                      Enroll in this course to participate in discussions with other students.
                    </p>
                    <Button onClick={handleEnroll} disabled={isEnrolling || loadingEnrollment}>
                      {isEnrolling || loadingEnrollment ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
                          Loading...
                        </>
                      ) : "Enroll Now"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col h-[60vh]">
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-4" ref={messageContainerRef}>
                      {isLoadingInitialMessages && page === 1 ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="flex items-start gap-3 animate-pulse">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-1/4" />
                              <Skeleton className="h-16 w-full" />
                            </div>
                          </div>
                        ))
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <p className="text-muted-foreground">No messages yet. Be the first to start the discussion!</p>
                        </div>
                      ) : (
                        <>
                          {hasMoreMessages && (
                            <div className="text-center py-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={loadMoreMessages}
                                disabled={isLoadingMessages}
                              >
                                {isLoadingMessages ? "Loading..." : "Load more messages"}
                              </Button>
                            </div>
                          )}
                          
                          {messages.map((message) => (
                            <div key={message.id} className="flex items-start gap-3">
                              <Avatar>
                                <AvatarImage src={message.userImage} alt={message.userName} />
                                <AvatarFallback>
                                  {message.userName?.split(" ")
                                    .map(n => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{message.userName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(message.timestamp)}
                                  </span>
                                </div>
                                <div className="bg-accent/50 p-3 rounded-lg text-sm">
                                  {message.content}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                    
                    {/* Message Input */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type your message here..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        disabled={!canSendMessage}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!messageInput.trim() || !canSendMessage}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                      </Button>
                    </div>
                  </div>
                )}
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
                        {isLoadingAttendance ? "Loading..." : `${attendanceData?.progressPercentage || 0}%`}
                      </span>
                    </div>
                    <Progress value={isLoadingAttendance ? 0 : attendanceData?.progressPercentage || 0} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Modules Progress</span>
                    {!isLoadingAttendance && course?.syllabus && (
                      <div className="space-y-3 mt-2">
                        {course.syllabus.map((module, moduleIndex) => {
                          // Count completed lessons in this module
                          let moduleCompletedLessons = 0;
                          module.lessons.forEach((_, lessonIndex) => {
                            const status = getLessonStatus(moduleIndex, lessonIndex);
                            if (status?.status === "completed") {
                              moduleCompletedLessons++;
                            }
                          });
                          
                          const moduleProgress = module.lessons.length > 0 
                            ? Math.round((moduleCompletedLessons / module.lessons.length) * 100) 
                            : 0;
                            
                          return (
                            <div key={moduleIndex} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>{module.title}</span>
                                <span>
                                  {moduleCompletedLessons}/{module.lessons.length} lessons
                                </span>
                              </div>
                              <Progress value={moduleProgress} className="h-1" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 pt-2">
                    <span className="text-sm font-medium">Completed Lessons</span>
                    <p className="text-2xl font-bold">
                      {isLoadingAttendance 
                        ? "Loading..." 
                        : `${attendanceData?.completedLessons || 0}/${attendanceData?.totalLessons || 0}`
                      }
                    </p>
                  </div>
                  
                  {/* Certificate Button */}
                  {(attendanceData?.certificate || attendanceData?.assessment?.passed) && (
                    <div className="pt-4">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setShowCertificate(true)}
                      >
                        <Award className="mr-2 h-5 w-5" />
                        View Certificate
                      </Button>
                    </div>
                  )}
                  
                  {/* Assessment Button */}
                  <div className="pt-4">
                    <Button 
                      className="w-full"
                      variant={isLoadingAttendance || (attendanceData?.progressPercentage || 0) < 100 ? "outline" : "default"}
                      disabled={isLoadingAttendance || (attendanceData?.progressPercentage || 0) < 100}
                      onClick={() => {
                        // Navigate to assessment page
                        if (!isLoadingAttendance && (attendanceData?.progressPercentage || 0) === 100) {
                          router.push(`/dashboard/courses/${courseId}/assessment`)
                        }
                      }}
                    >
                      {isLoadingAttendance 
                        ? "Loading..." 
                        : (attendanceData?.progressPercentage || 0) === 100 
                          ? "Take Assessment" 
                          : `Complete course to unlock assessment (${attendanceData?.progressPercentage || 0}%)`
                      }
                    </Button>
                    {!isLoadingAttendance && (attendanceData?.progressPercentage || 0) < 100 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Complete all lessons to unlock the final assessment
                      </p>
                    )}
                  </div>
                  
                  {/* Debug info - small and subtle */}
                  {/* <div className="mt-4 border-t pt-2">
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Debug Info</summary>
                      <div className="mt-2 space-y-1 text-left">
                        <p>Progress: {attendanceData?.progressPercentage || 0}%</p>
                        <p>Assessment: {attendanceData?.assessment ? 
                          `Score: ${attendanceData.assessment.score}, Passed: ${attendanceData.assessment.passed}` : 
                          'Not taken'}</p>
                        <p>Certificate: {attendanceData?.certificate ? 
                          `ID: ${attendanceData.certificate.certificateId}` : 
                          'Not generated'}</p>
                      </div>
                    </details>
                  </div> */}
                  
                  {/* Debug button - small and subtle */}
                  {/* <div className="pt-4 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs opacity-50 hover:opacity-100"
                      onClick={() => {
                        refetchAttendance().then(() => {
                          console.log("Manual refresh - Attendance data:", attendanceData);
                        });
                        refetchUserProgress();
                        toast({
                          title: "Refreshed",
                          description: "Progress data refreshed",
                          variant: "default",
                          duration: 2000,
                        });
                      }}
                    >
                      Refresh Data
                    </Button>
                  </div> */}
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

      {/* Certificate Modal */}
      {showCertificate && userDetails && course && (attendanceData?.certificate || attendanceData?.assessment?.passed) && (
        <CertificateModal
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          userName={userDetails.realName || userDetails.name}
          courseName={course.title}
          instructorName={course.instructor}
          completionDate={attendanceData?.certificate?.issuedDate || attendanceData?.assessment?.completedAt || new Date()}
          certificateId={attendanceData?.certificate?.certificateId || generateCertificateId(userDetails.id, courseId)}
          courseId={courseId}
        />
      )}
    </div>
  )
}

