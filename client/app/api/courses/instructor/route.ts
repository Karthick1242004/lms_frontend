import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an instructor or admin
    if (!session || (session.user.role !== "instructor" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized - Only instructors or admins can create courses" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const courseData = await request.json();
    
    // Use the instructor from the form data if provided, otherwise use the session user
    if (!courseData.instructor) {
      courseData.instructor = session.user.name || "Unknown Instructor";
    }
    
    // Generate a unique ID for new courses
    if (!courseData.id) {
      const lastCourse = await db.collection("coursedetails").findOne(
        {},
        { sort: { id: -1 } }
      );
      
      const newId = lastCourse ? String(Number(lastCourse.id) + 1) : "1";
      courseData.id = newId;
    }

    // Set creation/update timestamps
    const now = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (!courseData.createdAt) {
      courseData.createdAt = now;
    }
    
    courseData.updatedAt = now;
    
    // Initialize students count if not provided
    if (!courseData.students) {
      courseData.students = 0;
    }

    // Insert or update the course
    const result = await db.collection("coursedetails").updateOne(
      { id: courseData.id },
      { $set: courseData },
      { upsert: true }
    );

    return NextResponse.json({
      message: result.upsertedCount > 0 ? "Course created successfully" : "Course updated successfully",
      courseId: courseData.id
    });
  } catch (error) {
    console.error("Error creating/updating course:", error);
    return NextResponse.json(
      { error: "Failed to create/update course" },
      { status: 500 }
    );
  }
} 