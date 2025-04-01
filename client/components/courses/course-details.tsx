"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useStore } from "@/lib/store"
import type { Course, Lesson } from "@/lib/types"
import { CheckCircle, Clock, PlayCircle, Users } from "lucide-react"
import LessonVideo from "./lesson-video"

interface CourseDetailsProps {
  course: Course
}

export default function CourseDetails({ course }: CourseDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedLesson, setSelectedLesson] = useState<{
    moduleIndex: number;
    lessonIndex: number;
    title: string;
  } | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { enrolledCourses, enrollInCourse } = useStore()

  const isEnrolled = enrolledCourses.includes(course.id)

  const handleEnroll = () => {
    enrollInCourse(course.id)

    toast({
      title: "Enrolled Successfully",
      description: `You have been enrolled in ${course.title}`,
    })
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
          <Button onClick={handleEnroll} disabled={isEnrolled}>
            {isEnrolled ? "Enrolled" : "Enroll Now"}
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
                  />
                ) : (
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
                          {module.lessons.map((lesson, lessonIndex) => (
                            <li 
                              key={lessonIndex} 
                              className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                              onClick={() => handleLessonClick(index, lessonIndex, lesson.title)}
                            >
                              <div className="flex items-center gap-2">
                                <PlayCircle className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium">{lesson.title}</span>
                              </div>
                              <Badge variant="outline">{lesson.duration}</Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
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
                      <span className="text-sm font-medium">0%</span>
                    </div>
                    <Progress value={0} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Modules Completed</span>
                    <p className="text-2xl font-bold">0/{course.syllabus?.length || 0}</p>
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

