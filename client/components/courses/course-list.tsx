"use client"

import { useEffect, useState } from "react"
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
import { AlertCircle, PlusCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { hasInstructorPrivileges } from "@/lib/auth-utils"

// Fallback mock data to display if API fails
const MOCK_COURSES: Course[] = [
  {
    id: "1",
    title: "Introduction to Web Development",
    description: "Learn the basics of HTML, CSS, and JavaScript to build your first website.",
    instructor: "John Doe",
    image: "/placeholder.svg",
    level: "Beginner",
    duration: "4 weeks",
    students: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: "English",
    certificate: true
  },
  {
    id: "2",
    title: "Advanced React Patterns",
    description: "Master advanced React concepts including hooks, context, and performance optimization.",
    instructor: "Jane Smith",
    image: "/placeholder.svg",
    level: "Advanced",
    duration: "6 weeks",
    students: 85,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: "English",
    certificate: true
  }
];

export default function CourseList() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { enrolledCourses, enrollInCourse, loadingEnrollment } = useStore()
  const [isEnrolling, setIsEnrolling] = useState<{[key: string]: boolean}>({})
  const isInstructor = hasInstructorPrivileges(session)

  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  })

  useEffect(() => {
    console.log("Courses data in component:", courses);
    if (error) {
      console.error("Error loading courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      })
    }
  }, [error, toast, courses])

  const handleEnroll = async (course: Course) => {
    // Set loading state for this specific course
    setIsEnrolling(prev => ({ ...prev, [course.id]: true }))
    
    try {
      const success = await enrollInCourse(course.id)
      
      if (success) {
        toast({
          title: "Enrolled Successfully",
          description: `You have been enrolled in ${course.title}`,
        })
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
      setIsEnrolling(prev => ({ ...prev, [course.id]: false }))
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

  // Show mock courses if there's an error or empty courses list
  const displayCourses = (courses && courses.length > 0) ? courses : MOCK_COURSES;

  if (!courses?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No Courses Available</h3>
        <p className="text-muted-foreground mb-4">
          There are no courses available at the moment. Please check back later.
        </p>
        {isInstructor && (
          <Button asChild className="mt-4">
            <Link href="/dashboard/courses/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {displayCourses.map((course) => {
        const isEnrolled = enrolledCourses.includes(course.id)
        const isButtonLoading = isEnrolling[course.id] || loadingEnrollment

        return (
          <Card key={course.id} className="overflow-hidden">
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
                <Link href={`/dashboard/courses/${course.id || ''}`}>View Details</Link>
              </Button>
              <Button 
                onClick={() => handleEnroll(course)} 
                disabled={isEnrolled || isButtonLoading}
              >
                {isButtonLoading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
                    Loading...
                  </>
                ) : isEnrolled ? "Enrolled" : "Enroll Now"}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

