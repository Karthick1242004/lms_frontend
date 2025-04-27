import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET endpoint to fetch a specific chat history and its messages
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const chatId = params.id
    
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const userEmail = session.user.email
    
    // Get the chat history (ensuring it belongs to the current user)
    const chatHistory = await db.collection("chatHistories").findOne({
      id: chatId,
      userEmail
    })
    
    if (!chatHistory) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ chatHistory })
  } catch (error) {
    console.error("Error fetching chat history:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}

// PATCH endpoint to update a chat history with new messages
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const chatId = params.id
    
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      )
    }

    const { message, aiResponse } = await request.json()
    
    if (!message && !aiResponse) {
      return NextResponse.json(
        { error: "Either message or aiResponse is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const userEmail = session.user.email
    
    // Get the chat history (ensuring it belongs to the current user)
    const chatHistory = await db.collection("chatHistories").findOne({
      id: chatId,
      userEmail
    })
    
    if (!chatHistory) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      )
    }
    
    const now = new Date().toISOString()
    let lastMessage = chatHistory.lastMessage;
    let newMessages = [...chatHistory.messages];
    
    // Add user message if provided
    if (message) {
      const userMessage = {
        role: "user",
        content: message,
        timestamp: now
      }
      newMessages.push(userMessage);
      lastMessage = message;
    }
    
    // Add AI response if provided
    if (aiResponse) {
      const modelMessage = {
        role: "model",
        content: aiResponse,
        timestamp: now
      }
      newMessages.push(modelMessage);
    }
    
    // Update chat history with new messages and last message content
    await db.collection("chatHistories").updateOne(
      { id: chatId, userEmail },
      { 
        $set: { 
          messages: newMessages,
          lastMessage: lastMessage,
          updatedAt: now
        } 
      }
    )
    
    return NextResponse.json({ 
      success: true,
      messages: newMessages
    })
  } catch (error) {
    console.error("Error updating chat history:", error)
    return NextResponse.json(
      { error: "Failed to update chat history" },
      { status: 500 }
    )
  }
}

// PUT endpoint to update chat title
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const chatId = params.id
    
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      )
    }

    const { title } = await request.json()
    
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const userEmail = session.user.email
    
    // Update chat title
    const result = await db.collection("chatHistories").updateOne(
      { id: chatId, userEmail },
      { $set: { title } }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating chat title:", error)
    return NextResponse.json(
      { error: "Failed to update chat title" },
      { status: 500 }
    )
  }
} 