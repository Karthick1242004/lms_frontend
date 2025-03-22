export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  image: string
  level: "Beginner" | "Intermediate" | "Advanced"
  duration: string
  students: number
  createdAt: string
  updatedAt: string
  language: string
  certificate: boolean
  learningOutcomes?: string[]
  syllabus?: Module[]
  resources?: Resource[]
}

export interface Module {
  title: string
  description: string
  duration: string
  lessons: Lesson[]
}

export interface Lesson {
  title: string
  duration: string
}

export interface Resource {
  title: string
  url: string
}

