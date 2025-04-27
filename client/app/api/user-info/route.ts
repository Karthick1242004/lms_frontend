import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

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
    
    // Fetch user information
    const user = await db.collection("users").findOne(
      { email: session.user.email },
      { projection: { name: 1, email: 1, emailPreferences: 1 } }
    )
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user info:", error)
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    )
  }
}

export const PUT = async (request: Request) => {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        
        const { name, emailPreferences } = await request.json()
        const { db } = await connectToDatabase()
        const userEmail = session.user.email
        
        // Update data object including emailPreferences
        const dataToUpdate: Record<string, any> = {}
        if (name) dataToUpdate.name = name
        if (emailPreferences) dataToUpdate.emailPreferences = emailPreferences
        
        // Perform update with proper fields
        const result = await db.collection("users").updateOne(
            { email: userEmail },
            { $set: dataToUpdate }
        )
        
        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error updating user info:", error)
        return NextResponse.json(
            { error: "Failed to update user info" },
            { status: 500 }
        )
    }
} 