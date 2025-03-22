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

  const handleEnroll = (course: Course) => {
    enrollInCourse(course.id)

    toast({
      title: "Enrolled Successfully",
      description: `You have been enrolled in ${course.title}`,
    })
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

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses?.map((course) => {
        const isEnrolled = enrolledCourses.includes(course.id)

        return (
          <Card key={course.id} className="overflow-hidden">
            <CardHeader className="p-0">
              <img src={course.image || "/placeholder.svg"} alt={course.title} className="h-48 w-full object-cover" />
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
                <Link href={`/dashboard/courses/${course.id}`}>View Details</Link>
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

