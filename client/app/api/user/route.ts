import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("User session info:", {
      email: session.user.email,
      name: session.user.name
    });

    const { db } = await connectToDatabase()
    
    // Look up user by email
    const user = await db.collection("users").findOne({ 
      email: session.user.email 
    });
    
    // If not found, create a basic user object from session
    if (!user) {
      console.log("User not found in database, using session data");
      return NextResponse.json({
        email: session.user.email,
        name: session.user.name || "User"
      });
    }
    
    // Return user info (excluding sensitive data)
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name || session.user.name || "User",
      email: user.email
    });
  } catch (error) {
    console.error("Error fetching user:", error)
    
    // Return generic error response
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    )
  }
} 