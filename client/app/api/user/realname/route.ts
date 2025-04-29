import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get real name from request body
    const { realName } = await request.json()
    
    if (!realName || typeof realName !== 'string' || realName.trim() === '') {
      return NextResponse.json(
        { error: "Valid real name is required" },
        { status: 400 }
      )
    }

    // Validate name format (allow only letters, spaces, dots)
    const nameRegex = /^[A-Za-z\s.]+$/
    if (!nameRegex.test(realName)) {
      return NextResponse.json(
        { error: "Name can only contain letters, spaces, and dots" },
        { status: 400 }
      )
    }
    
    // Connect to database and update user's real name
    const { db } = await connectToDatabase()
    
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { realName: realName.trim() } }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Real name saved successfully"
    })
    
  } catch (error) {
    console.error("Error saving real name:", error)
    
    return NextResponse.json(
      { error: "Failed to save real name" },
      { status: 500 }
    )
  }
} 