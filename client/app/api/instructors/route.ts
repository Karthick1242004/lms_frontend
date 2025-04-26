import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Fetch all instructors from the users collection
    const instructors = await db.collection("users")
      .find({ role: "instructor" })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();
    
    return NextResponse.json({ 
      instructors,
      count: instructors.length 
    });
  } catch (error) {
    console.error("Error fetching instructors:", error);
    return NextResponse.json(
      { error: "Failed to fetch instructors", instructors: [] },
      { status: 500 }
    );
  }
} 