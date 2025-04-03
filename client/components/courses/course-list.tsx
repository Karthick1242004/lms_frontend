"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCourses } from "@/lib/api"
import { useStore } from "@/lib/store"
import type { Course } from "@/lib/types"
import { AlertCircle } from "lucide-react"

export default function CourseList() {
  const { toast } = useToast()
  const { enrolledCourses, enrollInCourse } = useStore()

  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  })

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      })
    }
  }, [error, toast])

  const handleEnroll = async (course: Course) => {
    const courseId = course._id?.toString();
    
    if (!courseId) {
      toast({
        title: "Enrollment Failed",
        description: "Invalid course ID",
        variant: "destructive",
      })
      return;
    }

    try {
      await enrollInCourse(courseId)
      toast({
        title: "Enrolled Successfully",
        description: `You have been enrolled in ${course.title}`,
      })
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Failed to enroll in course",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="h-48 rounded-none" />
            </CardHeader>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter className="flex justify-between p-6 pt-0">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Courses</h3>
        <p className="text-muted-foreground mb-4">
          There was an error loading the courses. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (!courses?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No Courses Available</h3>
        <p className="text-muted-foreground">
          There are no courses available at the moment. Please check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const isEnrolled = enrolledCourses.includes(course._id?.toString() || '')

        return (
          <Card key={course._id?.toString()} className="overflow-hidden">
            <CardHeader className="p-0">
              <img 
                src={course.image || "/placeholder.svg"} 
                alt={course.title} 
                className="h-48 w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                <Badge variant={isEnrolled ? "default" : "outline"}>{isEnrolled ? "Enrolled" : course.level}</Badge>
              </div>
              <CardDescription className="line-clamp-2 mb-4">{course.description}</CardDescription>
              <div className="text-sm text-muted-foreground">Instructor: {course.instructor}</div>
            </CardContent>
            <CardFooter className="flex justify-between p-6 pt-0">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/courses/${course._id || ''}`}>View Details</Link>
              </Button>
              <Button onClick={() => handleEnroll(course)} disabled={isEnrolled}>
                {isEnrolled ? "Enrolled" : "Enroll Now"}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

