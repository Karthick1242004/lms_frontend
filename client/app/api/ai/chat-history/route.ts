import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Document, ObjectId, WithId } from "mongodb"

// Define chat history interfaces
interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

interface ChatHistory {
  _id?: ObjectId;
  id: string;
  userEmail: string;
  title: string;
  messages: ChatMessage[];
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

// Type guard to check if a document is a ChatHistory
function isChatHistory(doc: WithId<Document>): doc is WithId<Document> & ChatHistory {
  return (
    doc !== null && 
    typeof doc === 'object' &&
    'id' in doc &&
    'userEmail' in doc &&
    'title' in doc &&
    'messages' in doc &&
    'lastMessage' in doc &&
    'createdAt' in doc &&
    'updatedAt' in doc
  );
}

// GET endpoint to fetch all chat histories for the current user
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
    
    // Get all chat histories for the user, sorted by updatedAt (newest first)
    const chatHistories = await db.collection("chatHistories")
      .find({ userEmail })
      .sort({ updatedAt: -1 })
      .toArray()
    
    // Format the chat histories for the client
    const formattedChatHistories = chatHistories.map((doc: WithId<Document>) => {
      // Use the type guard to check if the document has the expected shape
      if (isChatHistory(doc)) {
        return {
          id: doc.id,
          title: doc.title,
          lastMessage: doc.lastMessage,
          timestamp: doc.updatedAt
        };
      }
      // Fallback for unexpected document shape
      return {
        id: String(doc._id),
        title: "Unknown Title",
        lastMessage: "No message content available",
        timestamp: new Date().toISOString()
      };
    })
    
    return NextResponse.json({ chatHistories: formattedChatHistories })
  } catch (error) {
    console.error("Error fetching chat histories:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat histories" },
      { status: 500 }
    )
  }
}

// POST endpoint to create a new chat history
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
    
    // Generate a unique chat ID
    const chatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    const now = new Date().toISOString()
    
    // Create a new chat history - with type assertion to Document
    const newChatHistory = {
      id: chatId,
      userEmail,
      title,
      messages: [],
      lastMessage: "New conversation started",
      createdAt: now,
      updatedAt: now
    } as Document
    
    await db.collection("chatHistories").insertOne(newChatHistory)
    
    return NextResponse.json({ 
      chatHistory: {
        id: chatId,
        title,
        lastMessage: "New conversation started",
        timestamp: now
      }
    })
  } catch (error) {
    console.error("Error creating chat history:", error)
    return NextResponse.json(
      { error: "Failed to create chat history" },
      { status: 500 }
    )
  }
}

// DELETE endpoint to delete a chat history
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get("id")
    
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const userEmail = session.user.email
    
    // Delete the chat history (ensuring it belongs to the current user)
    const result = await db.collection("chatHistories").deleteOne({
      id: chatId,
      userEmail
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting chat history:", error)
    return NextResponse.json(
      { error: "Failed to delete chat history" },
      { status: 500 }
    )
  }
} 