import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import clientPromise from "@/lib/mongodb"
import { MongoDBAdapter } from "@auth/mongodb-adapter"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const client = await clientPromise
        const db = client.db("Mudhalvan")
        const user = await db.collection("users").findOne({ email: credentials.email })

        if (!user || !user.password) {
          throw new Error("No user found")
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Invalid password")
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/", // Redirect to home page on error
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
      }
      if (account) {
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.picture as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      const client = await clientPromise;
      const db = client.db("Mudhalvan");

      // Check if user exists with this email
      const existingUser = await db.collection("users").findOne({ 
        email: user.email 
      });

      if (existingUser) {
        // If the user exists and is trying to sign in with Google
        if (account?.provider === "google" && profile) {
          // Update the existing user to link Google account
          await db.collection("users").updateOne(
            { email: user.email },
            { 
              $set: {
                googleId: profile?.sub,
                image: user.image,
                name: user.name,
              }
            }
          );
        }
        return true;
      }

      // If user doesn't exist, create new user
      if (account?.provider === "google" && profile) {
        await db.collection("users").insertOne({
          name: user.name,
          email: user.email,
          image: user.image,
          googleId: profile?.sub,
          provider: "google",
          createdAt: new Date(),
        });
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}