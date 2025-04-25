import type { Course } from "@/lib/types"


export async function fetchCourses(): Promise<Course[]> {
  try {
    const response = await fetch("/api/courses")
    if (!response.ok) {
      console.error("API response not OK:", response.status, response.statusText);
      throw new Error("Failed to fetch courses")
    }
    
    const data = await response.json()
    console.log("Raw API response:", data);
    
    // Return the courses array from the response
    return data.courses || [];
  } catch (error) {
    console.error("Error fetching courses:", error);
    return []; // Return empty array instead of throwing error
  }
}

export async function fetchCourseById(id: string): Promise<Course> {
  const response = await fetch(`/api/courses/${id}`)
  
  if (!response.ok) {
    console.error(`Failed to fetch course ${id}:`, response.status, response.statusText);
    throw new Error("Failed to fetch course")
  }
  
  // Parse the response
  const data = await response.json()
  console.log("Fetched course data:", data);
  
  // Return the course data directly
  return data
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  try {
    if (typeof window === 'undefined') {
      // Server-side fetch - use direct database access
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      
      const course = await db.collection("coursedetails").findOne({ id });
      if (!course) return undefined;
      
      return course as Course;
    } else {
      // Client-side fetch - use the API
      return await fetchCourseById(id);
    }
  } catch (error) {
    console.error("Error in getCourseById:", error);
    return undefined;
  }
}

