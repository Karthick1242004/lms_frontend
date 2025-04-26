import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get user's progress data
    const userProgress = await db.collection("userProgress").findOne(
      { userEmail: session.user.email },
      { projection: { courses: 1 } }
    )

    if (!userProgress) {
      return NextResponse.json({ courses: {} })
    }

    return NextResponse.json(userProgress)
  } catch (error) {
    console.error("Error fetching user progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch user progress" },
      { status: 500 }
    )
  }
} 