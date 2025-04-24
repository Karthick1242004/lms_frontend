import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { PlusCircle, Pencil } from "lucide-react"
import DashboardHeader from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { connectToDatabase } from "@/lib/mongodb"
import type { Course } from "@/lib/types"

export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
  // Use a type safe approach to check for instructor role
  const isInstructor = session?.user && 'role' in session.user && session.user.role === 'instructor'
  
  // Fetch courses
  const { db } = await connectToDatabase()
  let courses: Course[] = []
  
  if (isInstructor) {
    // For instructors, only show their own courses
    const instructorCourses = await db.collection("coursedetails")
      .find({ instructor: session?.user?.name })
      .toArray()
    
    // Properly convert document types
    courses = instructorCourses.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      instructor: doc.instructor,
      image: doc.image,
      level: doc.level,
      duration: doc.duration,
      students: doc.students,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      language: doc.language,
      certificate: doc.certificate,
      learningOutcomes: doc.learningOutcomes,
      syllabus: doc.syllabus,
      resources: doc.resources
    })) as Course[]
  } else {
    // For students and admins, show all courses
    const allCourses = await db.collection("coursedetails")
      .find()
      .toArray()
    
    // Properly convert document types
    courses = allCourses.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      instructor: doc.instructor,
      image: doc.image,
      level: doc.level,
      duration: doc.duration,
      students: doc.students,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      language: doc.language,
      certificate: doc.certificate,
      learningOutcomes: doc.learningOutcomes,
      syllabus: doc.syllabus,
      resources: doc.resources
    })) as Course[]
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Courses" 
        text={isInstructor ? "Manage your courses." : "Browse available courses."}
      >
        {isInstructor && (
          <Button asChild>
            <Link href="/dashboard/courses/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        )}
      </DashboardHeader>
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length > 0 ? (
            courses.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="h-full w-full object-cover transition-all hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    </div>
                    <Badge>{course.level}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="font-medium">{course.duration}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/courses/${course.id}`}>
                          View
                        </Link>
                      </Button>
                      {isInstructor && (
                        <Button variant="outline" asChild>
                          <Link href={`/dashboard/courses/edit/${course.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full flex justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-medium">No courses found</h3>
                <p className="text-muted-foreground mt-1">
                  {isInstructor 
                    ? "You haven't created any courses yet. Click the Create Course button to get started."
                    : "No courses are currently available."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 