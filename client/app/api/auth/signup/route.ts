import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import clientPromise from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    
    const client = await clientPromise
    const db = client.db("Mudhalvan")
    
    // Check if user exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      provider: "credentials"
    })

    return NextResponse.json(
      { message: "User created successfully", userId: result.insertedId },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}