"use client"

import { create } from "zustand"
import { getEnrolledCourses, enrollInCourse as apiEnrollInCourse, unenrollFromCourse as apiUnenrollFromCourse } from "./api"

interface StoreState {
  enrolledCourses: string[]
  isLoading: boolean
  error: string | null
  fetchEnrolledCourses: () => Promise<void>
  enrollInCourse: (courseId: string) => Promise<void>
  unenrollFromCourse: (courseId: string) => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  enrolledCourses: [],
  isLoading: false,
  error: null,

  fetchEnrolledCourses: async () => {
    set({ isLoading: true, error: null })
    try {
      const courses = await getEnrolledCourses()
      set({ enrolledCourses: courses })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  enrollInCourse: async (courseId: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiEnrollInCourse(courseId)
      set((state) => ({
        enrolledCourses: [...state.enrolledCourses, courseId]
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error // Re-throw to handle in UI
    } finally {
      set({ isLoading: false })
    }
  },

  unenrollFromCourse: async (courseId: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiUnenrollFromCourse(courseId)
      set((state) => ({
        enrolledCourses: state.enrolledCourses.filter(id => id !== courseId)
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error // Re-throw to handle in UI
    } finally {
      set({ isLoading: false })
    }
  }
}))

