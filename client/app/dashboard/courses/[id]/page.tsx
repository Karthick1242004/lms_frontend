import { notFound } from "next/navigation"
import { getCourseById } from "@/lib/api"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import CourseDetails from "@/components/courses/course-details"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface CoursePageProps {
  params: {
    id: string
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const session = await getServerSession(authOptions)
  
  // Fetch course data from the backend API
  let course;
  try {
    // Use the absolute URL for server component
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/courses/${params.id}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch course: ${response.status} ${response.statusText}`);
      return notFound();
    }
    
    course = await response.json();
  } catch (error) {
    console.error("Error fetching course:", error);
    return notFound();
  }

  if (!course) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader user={session?.user} />
      <div className="flex-1 p-6 overflow-auto">
        <CourseDetails courseId={params.id} />
      </div>
    </div>
  )
}

