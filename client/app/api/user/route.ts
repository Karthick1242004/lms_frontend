import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("User session info:", {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email
    });

    const { db } = await connectToDatabase()
    
    // Try different ways to query the user
    let user = null;
    
    // First try with ObjectId
    try {
      user = await db.collection("users").findOne({ 
        _id: new ObjectId(session.user.id) 
      });
    } catch (e) {
      console.log("ObjectId lookup failed, trying string ID");
    }
    
    // If not found, try with string ID
    if (!user) {
      user = await db.collection("users").findOne({ 
        id: session.user.id 
      });
    }
    
    // If still not found, try with email
    if (!user && session.user.email) {
      user = await db.collection("users").findOne({ 
        email: session.user.email 
      });
    }
    
    // If still nothing found, create a basic user object from session
    if (!user) {
      console.log("User not found in database, using session data");
      user = {
        _id: session.user.id,
        name: session.user.name || "User",
        email: session.user.email || ""
      };
    }
    
    // Return user info (excluding sensitive data)
    return NextResponse.json({
      id: user._id.toString ? user._id.toString() : user._id,
      name: user.name || session.user.name || "User",
      email: user.email || session.user.email || ""
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    
    // Return generic error response
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    )
  }
} 