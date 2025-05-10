import { notFound } from "next/navigation"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import CourseDetails from "@/components/courses/course-details"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

interface CoursePageProps {
  params: {
    courseId: string
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const session = await getServerSession(authOptions)
  
  // Verify we have a valid ID parameter
  if (!params.courseId) {
    console.error("Missing course ID parameter");
    return notFound();
  }

  // Fetch course data directly from the database in server component
  let course;
  try {
    const { db } = await connectToDatabase();
    
    // Find the course by id
    course = await db.collection("coursedetails").findOne({ id: params.courseId });
    
    if (!course) {
      console.error(`Course not found with id: ${params.courseId}`);
      return notFound();
    }
    
    // Log the found course for verification
    console.log(`Found course: ${course.title} with ID: ${params.courseId}`);
  } catch (error) {
    console.error("Error fetching course:", error);
    return notFound();
  }

  return (
    <div className="flex flex-col h-screen">
      {/* <DashboardHeader user={session?.user} /> */}
      <div className="flex-1 p-6 overflow-auto">
        <CourseDetails courseId={params.courseId} />
      </div>
    </div>
  )
} 