"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Bot, Send, User, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"

interface Message {
  role: "user" | "model";
  content: string;
}

interface ChatStats {
  remainingRequests: number;
  hourlyLimit: number;
  lifetimeRemaining: number;
}

export default function AIChatInterface() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [chatStats, setChatStats] = useState<ChatStats>({
    remainingRequests: 0,
    hourlyLimit: 0,
    lifetimeRemaining: 0
  })
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    fetchChatHistory()
  }, [session])
  
  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  
  const fetchChatHistory = async () => {
    try {
      setInitialLoading(true)
      const response = await fetch('/api/ai/chat')
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history')
      }
      
      const data = await response.json()
      
      // Transform the chat history format
      const formattedMessages = data.chatHistory
        .filter((msg: any) => msg.parts && msg.parts.length > 0)
        .map((msg: any) => ({
          role: msg.role,
          content: msg.parts[0].text
        }))
      
      setMessages(formattedMessages)
      setChatStats({
        remainingRequests: data.remainingRequests,
        hourlyLimit: data.hourlyLimit,
        lifetimeRemaining: data.lifetimeRemaining
      })
    } catch (error) {
      console.error('Error fetching chat history:', error)
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive"
      })
    } finally {
      setInitialLoading(false)
    }
  }
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput("")
    
    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }
      
      const data = await response.json()
      
      // Add AI response
      setMessages((prev) => [...prev, { role: "model", content: data.response }])
      
      // Update usage stats
      setChatStats({
        remainingRequests: data.remainingRequests,
        hourlyLimit: data.hourlyLimit,
        lifetimeRemaining: data.lifetimeRemaining
      })
      
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive"
      })
      
      // Add error message from AI
      setMessages((prev) => [...prev, { 
        role: "model", 
        content: "Sorry, I encountered an error. Please try again later." 
      }])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  // Format message content with line breaks and code blocks
  const formatMessageContent = (content: string) => {
    // Check if the content contains code blocks
    if (content.includes("```")) {
      const segments = content.split(/(```(?:.*?)```)/g);
      return (
        <>
          {segments.map((segment, i) => {
            if (segment.startsWith("```") && segment.endsWith("```")) {
              // Extract the code and language
              const codeContent = segment.slice(3, -3);
              const firstLineBreak = codeContent.indexOf('\n');
              const language = firstLineBreak > 0 ? codeContent.slice(0, firstLineBreak).trim() : '';
              const code = firstLineBreak > 0 ? codeContent.slice(firstLineBreak + 1) : codeContent;
              
              return (
                <div key={i} className="my-2 w-full overflow-x-auto">
                  <div className="bg-muted/70 rounded p-2 text-xs md:text-sm font-mono whitespace-pre-wrap break-all">
                    {code}
                  </div>
                </div>
              );
            } else if (segment.trim()) {
              // Regular text with line breaks
              return (
                <span key={i}>
                  {segment.split('\n').map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < segment.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </span>
              );
            }
            return null;
          })}
        </>
      );
    }
    
    // Regular text with line breaks (no code blocks)
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  }
  
  return (
    <Card className="flex flex-col h-[95%]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" /> AI Assistant
        </CardTitle>
        <CardDescription>
          Ask questions about your courses, programming concepts, or get help with your studies
        </CardDescription>
        
        <div className="flex items-center justify-between mt-2 text-sm">
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <Badge variant={chatStats.remainingRequests > 0 ? "outline" : "destructive"} className="whitespace-nowrap">
                {chatStats.remainingRequests}/{chatStats.hourlyLimit} hourly requests
              </Badge>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lifetime requests remaining:</span>
                <span>{chatStats.lifetimeRemaining}</span>
              </div>
              <Progress value={(chatStats.lifetimeRemaining / 100) * 100} className="h-1.5" />
            </div>
          </div>
        </div>
      </CardHeader>
      
      {chatStats.remainingRequests === 0 && (
        <Alert variant="destructive" className="mx-4 mb-2 w-[96.5%] mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rate limit reached</AlertTitle>
          <AlertDescription>
            You've reached your hourly limit. Please try again later.
          </AlertDescription>
        </Alert>
      )}
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea ref={scrollRef} className="h-[40vh] md:h-[400px] p-4">
          {initialLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-2/3 ml-auto" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center p-4">
              <div>
                <Bot className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                <p className="text-xl font-medium">How can I help you today?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me any questions related to your courses or learning materials
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[85%] sm:max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    } rounded-lg px-3 py-2`}
                  >
                    <div className="flex gap-2">
                      <div className="mt-0.5 shrink-0">
                        {message.role === "user" ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Bot className="h-5 w-5" />
                        )}
                      </div>
                      <div className="break-words">
                        {formatMessageContent(message.content)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] sm:max-w-[80%] bg-secondary rounded-lg px-3 py-2">
                    <div className="flex gap-2">
                      <div className="mt-0.5 shrink-0">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className="flex items-center">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t p-3">
        <div className="flex w-full items-center space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[50px] flex-1 text-sm"
            disabled={isLoading || chatStats.remainingRequests === 0}
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim() || chatStats.remainingRequests === 0}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
} 