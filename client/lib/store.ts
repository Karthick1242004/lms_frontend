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

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      enrolledCourses: [],
      loadingEnrollment: false,

      syncEnrollments: async () => {
        try {
          set({ loadingEnrollment: true })
          const response = await fetch('/api/enrollments')
          
          if (response.ok) {
            const data = await response.json()
            set({ enrolledCourses: data.enrolledCourses || [] })
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
            },
            body: JSON.stringify({ courseId }),
          })
          
          if (response.ok) {
            const { enrolledCourses } = get()
            
            if (!enrolledCourses.includes(courseId)) {
              set({ enrolledCourses: [...enrolledCourses, courseId] })
            }
            
            return true
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
          })
          
          if (response.ok) {
            const { enrolledCourses } = get()
            set({
              enrolledCourses: enrolledCourses.filter((id) => id !== courseId),
            })
            return true
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

