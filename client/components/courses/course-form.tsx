"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CourseFormProps {
  initialData?: {
    id: string
    title: string
    description: string
    instructor: string
    level: string
    duration: string
    language: string
    certificate: boolean
    videos?: {
      id: string
      title: string
      description: string
      url: string
    }[]
  }
  isEditing?: boolean
}

export default function CourseForm({ initialData, isEditing = false }: CourseFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    instructor: initialData?.instructor || "",
    level: initialData?.level || "Beginner",
    duration: initialData?.duration || "",
    language: initialData?.language || "English",
    certificate: initialData?.certificate || false,
    videos: initialData?.videos || []
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(
        isEditing ? `/api/courses/${initialData?.id}` : "/api/courses",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to save course")
      }

      toast({
        title: "Success",
        description: `Course ${isEditing ? "updated" : "created"} successfully`,
      })

      router.push("/dashboard/courses")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoUpload = async (file: File) => {
    try {
      const urlResponse = await fetch(
        `/api/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`
      )
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL")
      }
      
      const { uploadUrl, publicUrl } = await urlResponse.json()
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload video")
      }

      return publicUrl
    } catch (error) {
      console.error("Error uploading video:", error)
      throw error
    }
  }

  const handleAddVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const videoUrl = await handleVideoUpload(file)
      
      setFormData(prev => ({
        ...prev,
        videos: [
          ...prev.videos,
          {
            id: crypto.randomUUID(),
            title: file.name,
            description: "",
            url: videoUrl
          }
        ]
      }))

      toast({
        title: "Success",
        description: "Video uploaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const video = formData.videos.find(v => v.id === videoId)
      if (!video) return

      // Delete from storage
      await fetch(`/api/videos/${encodeURIComponent(video.url)}`, {
        method: "DELETE",
      })

      // Remove from form data
      setFormData(prev => ({
        ...prev,
        videos: prev.videos.filter(v => v.id !== videoId)
      }))

      toast({
        title: "Success",
        description: "Video deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateVideo = (videoId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.map(video => 
        video.id === videoId ? { ...video, [field]: value } : video
      )
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Course" : "Create New Course"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter course title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter course description"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor">Instructor</Label>
            <Input
              id="instructor"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              placeholder="Enter instructor name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 4 weeks"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value })}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="German">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="certificate"
              checked={formData.certificate}
              onChange={(e) => setFormData({ ...formData, certificate: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              aria-label="Offer certificate upon completion"
              title="Offer certificate upon completion"
            />
            <Label htmlFor="certificate">Offer certificate upon completion</Label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Course Videos</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleAddVideo}
                  className="hidden"
                  id="video-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("video-upload")?.click()}
                >
                  Add Video
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {formData.videos.map((video) => (
                <Card key={video.id}>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Video Title</Label>
                        <Input
                          value={video.title}
                          onChange={(e) => handleUpdateVideo(video.id, "title", e.target.value)}
                          placeholder="Enter video title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={video.description}
                          onChange={(e) => handleUpdateVideo(video.id, "description", e.target.value)}
                          placeholder="Enter video description"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground truncate">
                          {video.url}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteVideo(video.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
              Saving...
            </>
          ) : (
            isEditing ? "Update Course" : "Create Course"
          )}
        </Button>
      </div>
    </form>
  )
}
