import type { Course } from "@/lib/types"


export async function fetchCourses(): Promise<Course[]> {
  const response = await fetch("/api/courses")
  if (!response.ok) {
    throw new Error("Failed to fetch courses")
  }
  const data = await response.json()
  return data.courses || []
}

export async function fetchCourseById(id: string): Promise<Course> {
  const response = await fetch(`/api/courses/${id}`)
  if (!response.ok) {
    throw new Error("Failed to fetch course")
  }
  
  // Parse the response
  const data = await response.json()
  
  // If the API returns a nested structure, extract the course data
  // This ensures compatibility with different API response formats
  return data.course || data
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  try {
    if (typeof window === 'undefined') {
      // Server-side fetch with full URL
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/courses/${id}`);
      if (!response.ok) return undefined;
      return response.json();
    } else {
      // Client-side fetch
      return await fetchCourseById(id);
    }
  } catch (error) {
    console.error("Error in getCourseById:", error);
    return undefined; // Return undefined instead of mock data
  }
}

