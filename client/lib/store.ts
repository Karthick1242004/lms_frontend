"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface StoreState {
  enrolledCourses: string[]
  loadingEnrollment: boolean
  enrollInCourse: (courseId: string) => Promise<boolean>
  unenrollFromCourse: (courseId: string) => Promise<boolean>
  isEnrolled: (courseId: string) => boolean
  syncEnrollments: () => Promise<void>
}

// Helper function to safely parse JSON
const safelyParseJSON = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    console.warn("Expected JSON response but got:", contentType);
    const text = await response.text();
    console.warn("Response text (first 200 chars):", text.substring(0, 200));
    return null;
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    const text = await response.text();
    console.error("Response text (first 200 chars):", text.substring(0, 200));
    return null;
  }
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      enrolledCourses: [],
      loadingEnrollment: false,

      syncEnrollments: async () => {
        try {
          set({ loadingEnrollment: true })
          
          // Only sync if we're in a browser environment
          if (typeof window === 'undefined') {
            return;
          }
          
          const response = await fetch('/api/enrollments', {
            // Add cache busting to prevent cached HTML responses
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await safelyParseJSON(response);
            if (data && Array.isArray(data.enrolledCourses)) {
              set({ enrolledCourses: data.enrolledCourses });
            }
          } else {
            console.error(`Failed to sync enrollments, status: ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to sync enrollments:", error)
        } finally {
          set({ loadingEnrollment: false })
        }
      },

      enrollInCourse: async (courseId) => {
        try {
          set({ loadingEnrollment: true })
          
          const response = await fetch('/api/enrollments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({ courseId }),
          })
          
          if (response.ok) {
            const data = await safelyParseJSON(response);
            if (data) {
              const { enrolledCourses } = get()
              
              if (!enrolledCourses.includes(courseId)) {
                set({ enrolledCourses: [...enrolledCourses, courseId] })
              }
              
              return true
            }
          }
          
          return false
        } catch (error) {
          console.error("Failed to enroll in course:", error)
          return false
        } finally {
          set({ loadingEnrollment: false })
        }
      },

      unenrollFromCourse: async (courseId) => {
        try {
          set({ loadingEnrollment: true })
          
          const response = await fetch(`/api/enrollments/${courseId}`, {
            method: 'DELETE',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          
          if (response.ok) {
            const data = await safelyParseJSON(response);
            if (data) {
              const { enrolledCourses } = get()
              set({
                enrolledCourses: enrolledCourses.filter((id) => id !== courseId),
              })
              return true
            }
          }
          
          return false
        } catch (error) {
          console.error("Failed to unenroll from course:", error)
          return false
        } finally {
          set({ loadingEnrollment: false })
        }
      },

      isEnrolled: (courseId) => {
        const { enrolledCourses } = get()
        return enrolledCourses.includes(courseId)
      },
    }),
    {
      name: "lms-storage",
    },
  ),
)

