"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { hasInstructorPrivileges } from "@/lib/auth-utils"
import { useToast } from "@/components/ui/use-toast"
import { Plus, X, Save, Trash2 } from "lucide-react"
import CourseVideoUploader from "@/components/courses/course-video-uploader"
import type { Course, Module, Lesson, Resource } from "@/lib/types"
import { fetchInstructors, Instructor } from "@/lib/api"

export default function CreateCoursePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  
  const [formData, setFormData] = useState<Course>({
    id: "",
    title: "",
    description: "",
    instructor: "",
    image: "",
    level: "Beginner",
    duration: "",
    students: 0,
    createdAt: "",
    updatedAt: "",
    language: "English",
    certificate: true,
    learningOutcomes: [""],
    syllabus: [
      {
        title: "",
        description: "",
        duration: "",
        lessons: [{ title: "", duration: "", videoPath: "" }]
      }
    ],
    resources: [{ title: "", url: "" }]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOutcomeChange = (index: number, value: string) => {
    setFormData(prev => {
      const updatedOutcomes = [...(prev.learningOutcomes || [])];
      updatedOutcomes[index] = value;
      return { ...prev, learningOutcomes: updatedOutcomes };
    });
  };

  const addOutcome = () => {
    setFormData(prev => {
      const updatedOutcomes = [...(prev.learningOutcomes || []), ""];
      return { ...prev, learningOutcomes: updatedOutcomes };
    });
  };

  const removeOutcome = (index: number) => {
    setFormData(prev => {
      const updatedOutcomes = [...(prev.learningOutcomes || [])];
      updatedOutcomes.splice(index, 1);
      return { ...prev, learningOutcomes: updatedOutcomes };
    });
  };

  const handleModuleChange = (index: number, field: keyof Module, value: string) => {
    setFormData(prev => {
      const updatedSyllabus = [...(prev.syllabus || [])];
      updatedSyllabus[index] = {
        ...updatedSyllabus[index],
        [field]: value
      };
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const addModule = () => {
    setFormData(prev => {
      const updatedSyllabus = [
        ...(prev.syllabus || []),
        {
          title: "",
          description: "",
          duration: "",
          lessons: [{ title: "", duration: "", videoPath: "" }]
        }
      ];
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const removeModule = (index: number) => {
    setFormData(prev => {
      const updatedSyllabus = [...(prev.syllabus || [])];
      updatedSyllabus.splice(index, 1);
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleLessonChange = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: string) => {
    setFormData(prev => {
      const updatedSyllabus = [...(prev.syllabus || [])];
      updatedSyllabus[moduleIndex].lessons[lessonIndex] = {
        ...updatedSyllabus[moduleIndex].lessons[lessonIndex],
        [field]: value
      };
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleVideoUpload = (moduleIndex: number, lessonIndex: number, videoUrl: string) => {
    setFormData(prev => {
      const updatedSyllabus = [...(prev.syllabus || [])];
      updatedSyllabus[moduleIndex].lessons[lessonIndex] = {
        ...updatedSyllabus[moduleIndex].lessons[lessonIndex],
        videoPath: videoUrl
      };
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const addLesson = (moduleIndex: number) => {
    setFormData(prev => {
      const updatedSyllabus = [...(prev.syllabus || [])];
      updatedSyllabus[moduleIndex].lessons.push({
        title: "",
        duration: "",
        videoPath: ""
      });
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    setFormData(prev => {
      const updatedSyllabus = [...(prev.syllabus || [])];
      updatedSyllabus[moduleIndex].lessons.splice(lessonIndex, 1);
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleResourceChange = (index: number, field: keyof Resource, value: string) => {
    setFormData(prev => {
      const updatedResources = [...(prev.resources || [])];
      updatedResources[index] = {
        ...updatedResources[index],
        [field]: value
      };
      return { ...prev, resources: updatedResources };
    });
  };

  const addResource = () => {
    setFormData(prev => {
      const updatedResources = [...(prev.resources || []), { title: "", url: "" }];
      return { ...prev, resources: updatedResources };
    });
  };

  const removeResource = (index: number) => {
    setFormData(prev => {
      const updatedResources = [...(prev.resources || [])];
      updatedResources.splice(index, 1);
      return { ...prev, resources: updatedResources };
    });
  };

  // Fetch instructors when component mounts
  useEffect(() => {
    const getInstructors = async () => {
      try {
        const instructorsList = await fetchInstructors();
        setInstructors(instructorsList);
      } catch (error) {
        console.error("Failed to fetch instructors:", error);
        toast({
          title: "Error",
          description: "Failed to load instructors list.",
          variant: "destructive",
        });
      }
    };
    
    getInstructors();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.level || !formData.duration || !formData.instructor) {
        throw new Error("Please fill in all required fields");
      }

      const response = await fetch("/api/courses/instructor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create course");
      }

      const data = await response.json();
      
      toast({
        title: "Course Created",
        description: data.message,
      });

      // Redirect to the dashboard after success
      router.push("/dashboard/courses");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  // Check if user is authenticated and has instructor privileges
  if (!session || !hasInstructorPrivileges(session)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500">You need to be an instructor to access this page.</p>
        <Button className="mt-4" onClick={() => router.push('/dashboard')}>
          Go back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-8 px-6">
      <h1 className="text-2xl font-bold mb-6">Create New Course</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the basic details about your course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Advanced Web Development"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Cover Image URL</Label>
                <Input
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what students will learn in this course"
                rows={4}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => handleSelectChange("level", value)}
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
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="e.g., 8 weeks"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor">Instructor *</Label>
                <Select
                  value={formData.instructor}
                  onValueChange={(value) => handleSelectChange("instructor", value)}
                >
                  <SelectTrigger id="instructor">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor._id} value={instructor.name}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  placeholder="e.g., English"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Outcomes</CardTitle>
            <CardDescription>
              What will students learn from this course?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.learningOutcomes?.map((outcome, index) => (
              <div key={`outcome-${index}`} className="flex items-center gap-2">
                <Input
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(index, e.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeOutcome(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOutcome}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Outcome
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Syllabus</CardTitle>
            <CardDescription>
              Add modules and lessons to your course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {formData.syllabus?.map((module, moduleIndex) => (
              <div key={`module-${moduleIndex}`} className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Module {moduleIndex + 1}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeModule(moduleIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`module-${moduleIndex}-title`}>Title</Label>
                      <Input
                        id={`module-${moduleIndex}-title`}
                        value={module.title}
                        onChange={(e) => handleModuleChange(moduleIndex, "title", e.target.value)}
                        placeholder="e.g., Introduction to React"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`module-${moduleIndex}-duration`}>Duration</Label>
                      <Input
                        id={`module-${moduleIndex}-duration`}
                        value={module.duration}
                        onChange={(e) => handleModuleChange(moduleIndex, "duration", e.target.value)}
                        placeholder="e.g., 2 weeks"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`module-${moduleIndex}-description`}>Description</Label>
                    <Textarea
                      id={`module-${moduleIndex}-description`}
                      value={module.description}
                      onChange={(e) => handleModuleChange(moduleIndex, "description", e.target.value)}
                      placeholder="Describe what this module covers"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium">Lessons</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addLesson(moduleIndex)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add Lesson
                      </Button>
                    </div>
                    
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={`lesson-${moduleIndex}-${lessonIndex}`} className="border rounded-md p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium">Lesson {lessonIndex + 1}</h5>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeLesson(moduleIndex, lessonIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${moduleIndex}-${lessonIndex}-title`}>Title</Label>
                            <Input
                              id={`lesson-${moduleIndex}-${lessonIndex}-title`}
                              value={lesson.title}
                              onChange={(e) => handleLessonChange(moduleIndex, lessonIndex, "title", e.target.value)}
                              placeholder="e.g., Setting up React environment"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lesson-${moduleIndex}-${lessonIndex}-duration`}>Duration (minutes)</Label>
                            <Input
                              id={`lesson-${moduleIndex}-${lessonIndex}-duration`}
                              value={lesson.duration}
                              onChange={(e) => handleLessonChange(moduleIndex, lessonIndex, "duration", e.target.value)}
                              placeholder="e.g., 30"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Video</Label>
                          {lesson.videoPath ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground truncate">{lesson.videoPath}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLessonChange(moduleIndex, lessonIndex, "videoPath", "")}
                                >
                                  Replace
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <CourseVideoUploader 
                              onUploadComplete={(url) => handleVideoUpload(moduleIndex, lessonIndex, url)} 
                              moduleIndex={moduleIndex}
                              lessonIndex={lessonIndex}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addModule}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
            <CardDescription>
              Provide additional materials for your students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.resources?.map((resource, index) => (
              <div key={`resource-${index}`} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`resource-${index}-title`}>Title</Label>
                  <Input
                    id={`resource-${index}-title`}
                    value={resource.title}
                    onChange={(e) => handleResourceChange(index, "title", e.target.value)}
                    placeholder="e.g., React Documentation"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`resource-${index}-url`}>URL</Label>
                  <Input
                    id={`resource-${index}-url`}
                    value={resource.url}
                    onChange={(e) => handleResourceChange(index, "url", e.target.value)}
                    placeholder="https://example.com/resource"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeResource(index)}
                  className="md:col-span-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addResource}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Resource
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Course
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
} 