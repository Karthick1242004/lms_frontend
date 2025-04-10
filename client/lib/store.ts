"use client"

import { create } from "zustand"
import { getEnrolledCourses, enrollInCourse as apiEnrollInCourse, unenrollFromCourse as apiUnenrollFromCourse, getAttendanceRecords } from "./api"
import { persist } from "zustand/middleware"

interface StoreState {
  enrolledCourses: string[]
  attendanceRecords: any[]
  isLoading: boolean
  error: string | null
  fetchEnrolledCourses: () => Promise<void>
  enrollInCourse: (courseId: string) => Promise<void>
  unenrollFromCourse: (courseId: string) => Promise<void>
  fetchAttendanceRecords: (courseId?: string) => Promise<void>
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      enrolledCourses: [],
      attendanceRecords: [],
      isLoading: false,
      error: null,

      fetchEnrolledCourses: async () => {
        set({ isLoading: true, error: null })
        try {
          const courses = await getEnrolledCourses()
          set({ enrolledCourses: courses })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      enrollInCourse: async (courseId: string) => {
        set({ isLoading: true, error: null })
        try {
          await apiEnrollInCourse(courseId)
          // Fetch updated enrolled courses after successful enrollment
          const courses = await getEnrolledCourses()
          set({ enrolledCourses: courses })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      unenrollFromCourse: async (courseId: string) => {
        set({ isLoading: true, error: null })
        try {
          await apiUnenrollFromCourse(courseId)
          // Fetch updated enrolled courses after successful unenrollment
          const courses = await getEnrolledCourses()
          set({ enrolledCourses: courses })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      fetchAttendanceRecords: async (courseId?: string) => {
        set({ isLoading: true, error: null })
        try {
          const records = await getAttendanceRecords(courseId)
          set({ attendanceRecords: records })
        } catch (error) {
          set({ error: (error as Error).message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      }
    }),
    {
      name: "lms-storage",
      partialize: (state) => ({ 
        enrolledCourses: state.enrolledCourses,
        // Don't persist attendance records in local storage
        // They will be fetched from the server
      }),
    }
  )
)

