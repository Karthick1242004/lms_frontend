"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface StoreState {
  enrolledCourses: string[]
  enrollInCourse: (courseId: string) => void
  unenrollFromCourse: (courseId: string) => void
  isEnrolled: (courseId: string) => boolean
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      enrolledCourses: [],

      enrollInCourse: (courseId) => {
        const { enrolledCourses } = get()

        if (!enrolledCourses.includes(courseId)) {
          set({ enrolledCourses: [...enrolledCourses, courseId] })
        }
      },

      unenrollFromCourse: (courseId) => {
        const { enrolledCourses } = get()
        set({
          enrolledCourses: enrolledCourses.filter((id) => id !== courseId),
        })
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

