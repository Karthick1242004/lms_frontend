import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ObjectId, Document } from "mongodb"

// Use environment variable only, without fallback
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
const RATE_LIMIT_PER_HOUR = 6
const LIFETIME_LIMIT = 100

// Define interface for user chat usage
interface UserChatUsage {
  _id?: ObjectId;
  userEmail: string;
  totalUsage: number;
  chatHistory: Array<{ role: string; parts: Array<{ text: string }> }>;
  recentRequests: string[];
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured properly" },
        { status: 500 }
      )
    }

    const { message } = await request.json()
    
    if (!message || message.trim() === "") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Check user's rate limits
    const userEmail = session.user.email
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Get or create user's chat usage record
    let userChatUsage: UserChatUsage | null = await db.collection("aiChatUsage").findOne<UserChatUsage>({ userEmail })
    
    if (!userChatUsage) {
      // Create a new user chat usage object
      const newUserChatUsage: UserChatUsage = {
        userEmail,
        totalUsage: 0,
        chatHistory: [],
        recentRequests: []
      }
      
      // Insert the new user and get the result
      await db.collection("aiChatUsage").insertOne(newUserChatUsage)
      userChatUsage = newUserChatUsage
    }
    
    // Check lifetime limit
    if (userChatUsage.totalUsage >= LIFETIME_LIMIT) {
      return NextResponse.json(
        { error: "You have reached your lifetime limit of AI requests" },
        { status: 429 }
      )
    }
    
    // Filter recent requests within the last hour
    const recentRequests = userChatUsage.recentRequests.filter((timestamp: string) => 
      new Date(timestamp) > oneHourAgo
    )
    
    // Check hourly rate limit
    if (recentRequests.length >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          remainingRequests: 0,
          hourlyLimit: RATE_LIMIT_PER_HOUR,
          lifetimeRemaining: LIFETIME_LIMIT - userChatUsage.totalUsage
        },
        { status: 429 }
      )
    }
    
    // Prepare conversation history for context
    const conversationHistory = userChatUsage.chatHistory || []
    const recentConversation = [...conversationHistory.slice(-5), { role: "user", parts: [{ text: message }] }]
    
    // Make request to Gemini API
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: recentConversation
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Gemini API error:", errorData)
        return NextResponse.json(
          { error: "Failed to get response from AI" },
          { status: 500 }
        )
      }
      
      const data = await response.json()
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response"
      
      // Format code blocks for better mobile display
      const formattedResponse = aiResponse
        // Replace long code blocks with more mobile-friendly versions
        .replace(/```([\s\S]*?)```/g, (match: string, code: string) => {
          // Extract language if specified (e.g., ```javascript)
          const langMatch = code.match(/^([a-zA-Z]+)\n/)
          const language = langMatch ? langMatch[1] : ''
          const cleanedCode = langMatch ? code.slice(langMatch[0].length) : code
          
          // Trim excessive whitespace and long lines for mobile
          const trimmedCode = cleanedCode
            .split('\n')
            .map((line: string) => line.trimRight())
            .join('\n')
            .trim()
          
          return `\`\`\`${language}\n${trimmedCode}\n\`\`\``
        })
      
      // Update user's chat usage
      const updatedChatHistory = [
        ...conversationHistory,
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: formattedResponse }] }
      ]
      
      await db.collection("aiChatUsage").updateOne(
        { userEmail },
        { 
          $set: { 
            chatHistory: updatedChatHistory,
            recentRequests: [...recentRequests, now.toISOString()],
            lastUpdated: now
          },
          $inc: { totalUsage: 1 }
        }
      )
      
      return NextResponse.json({
        response: formattedResponse,
        remainingRequests: RATE_LIMIT_PER_HOUR - recentRequests.length - 1,
        hourlyLimit: RATE_LIMIT_PER_HOUR,
        lifetimeRemaining: LIFETIME_LIMIT - userChatUsage.totalUsage - 1
      })
    } catch (error) {
      console.error("Error calling Gemini API:", error)
      return NextResponse.json(
        { error: "Failed to get response from AI service" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in AI chat endpoint:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

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
    const userEmail = session.user.email
    
    // Get user's chat usage record
    const userChatUsage: UserChatUsage | null = await db.collection("aiChatUsage").findOne<UserChatUsage>({ userEmail })
    
    if (!userChatUsage) {
      return NextResponse.json({
        chatHistory: [],
        remainingRequests: RATE_LIMIT_PER_HOUR,
        hourlyLimit: RATE_LIMIT_PER_HOUR,
        lifetimeRemaining: LIFETIME_LIMIT
      })
    }
    
    // Calculate remaining requests
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    const recentRequests = userChatUsage.recentRequests.filter((timestamp: string) => 
      new Date(timestamp) > oneHourAgo
    )
    
    return NextResponse.json({
      chatHistory: userChatUsage.chatHistory || [],
      remainingRequests: Math.max(0, RATE_LIMIT_PER_HOUR - recentRequests.length),
      hourlyLimit: RATE_LIMIT_PER_HOUR,
      lifetimeRemaining: LIFETIME_LIMIT - userChatUsage.totalUsage
    })
  } catch (error) {
    console.error("Error getting chat history:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
} 