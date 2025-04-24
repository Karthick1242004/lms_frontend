import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // In a production environment, this endpoint should be protected and
    // only accessible to admins, but for test purposes, we'll allow it
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in first" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // The email of the user to update
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    const user = await db.collection("users").findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Update the user's role to instructor
    await db.collection("users").updateOne(
      { email },
      { $set: { role: "instructor" } }
    );
    
    return NextResponse.json({
      message: "User role updated to instructor successfully",
      email
    });
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
} 