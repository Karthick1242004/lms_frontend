import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Simple profanity filter implementation
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cunt', 'asshole', 
  'damn', 'bastard', 'motherfucker', 'bullshit', 'cock', 'piss', 'whore',
  // Add more as needed
];

function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for exact matches and common variations
  return PROFANITY_LIST.some(word => {
    const regex = new RegExp(`\\b${word}\\b|\\b${word}(s|ing|ed|er)\\b`, 'i');
    return regex.test(lowerText);
  });
}

// Get messages for a course discussion with pagination
export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Extract courseId from params
    const { courseId } = params

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const { db } = await connectToDatabase()
    
    // Check if user is enrolled in the course
    const isEnrolled = await db.collection("enrollments").findOne({
      userId: session.user.email,
      courseId: courseId
    })
    
    if (!isEnrolled) {
      return NextResponse.json(
        { error: "You must be enrolled in this course to view discussions" },
        { status: 403 }
      )
    }
    
    // Get total count for pagination
    const totalCount = await db.collection("course_discussions")
      .countDocuments({ courseId: courseId })
    
    // Fetch messages with pagination
    const messages = await db.collection("course_discussions")
      .find({ courseId: courseId })
      .sort({ timestamp: -1 }) // most recent first
      .skip(skip)
      .limit(limit)
      .toArray()
    
    // Get user details for each message
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const user = await db.collection("users").findOne({ email: message.userId })
        return {
          id: message._id.toString(),
          userId: message.userId,
          userName: user?.realName || user?.name || "Unknown User",
          userImage: user?.image,
          content: message.content,
          timestamp: message.timestamp
        }
      })
    )
    
    return NextResponse.json({
      messages: enrichedMessages,
      totalCount,
      hasMore: totalCount > skip + limit
    })
  } catch (error) {
    console.error("Error fetching discussion messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// Post a new message to the course discussion
export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Extract courseId from params
    const { courseId } = params
    
    const { content } = await request.json()
    
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }
    
    // Check message length
    if (content.length > 500) {
      return NextResponse.json(
        { error: "Message is too long (maximum 500 characters)" },
        { status: 400 }
      )
    }
    
    const { db } = await connectToDatabase()
    
    // Check if user is enrolled in the course
    const isEnrolled = await db.collection("enrollments").findOne({
      userId: session.user.email,
      courseId: courseId
    })
    
    if (!isEnrolled) {
      return NextResponse.json(
        { error: "You must be enrolled in this course to post messages" },
        { status: 403 }
      )
    }
    
    // Anti-spam check - rate limiting
    const recentMessages = await db.collection("course_discussions").countDocuments({
      userId: session.user.email,
      courseId: courseId,
      timestamp: { $gte: new Date(Date.now() - 10000).toISOString() } // last 10 seconds
    })
    
    if (recentMessages >= 3) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Please wait a moment." },
        { status: 429 }
      )
    }
    
    // Check for profanity
    if (containsProfanity(content)) {
      return NextResponse.json(
        { error: "Your message contains inappropriate language that is not allowed in the discussion." },
        { status: 400 }
      )
    }
    
    // Get user details
    const user = await db.collection("users").findOne({ email: session.user.email })
    
    // Insert the message
    const result = await db.collection("course_discussions").insertOne({
      courseId: courseId,
      userId: session.user.email,
      userName: user?.realName || user?.name,
      content: content,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      id: result.insertedId.toString(),
      message: "Message posted successfully"
    })
  } catch (error) {
    console.error("Error posting discussion message:", error)
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 }
    )
  }
} 