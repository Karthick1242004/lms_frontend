import { notFound } from "next/navigation"
import { getCourseById } from "@/lib/api"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import CourseDetails from "@/components/courses/course-details"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Suspense } from "react"

interface CoursePageProps {
  params: {
    id: string
  }
}

async function CoursePageContent({ courseId }: { courseId: string }) {
  try {
    const [session, course] = await Promise.all([
      getServerSession(authOptions),
      getCourseById(courseId).catch((error) => {

        return null;
      })
    ]);

    if (!course) {

      notFound();
    }

    return (
      <div className="flex flex-col h-screen">
        <DashboardHeader user={session?.user} />
        <div className="flex-1 p-6 overflow-auto">
          <CourseDetails courseId={courseId} />
        </div>
      </div>
    );
  } catch (error) {

    notFound();
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  // Ensure params.id is resolved before using it
  const id = await Promise.resolve(params.id);


  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CoursePageContent courseId={id} />
    </Suspense>
  );
}

