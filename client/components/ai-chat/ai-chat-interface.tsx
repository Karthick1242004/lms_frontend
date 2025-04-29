"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Bot, Send, User, AlertCircle, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { ComponentPropsWithoutRef, ReactNode } from 'react'

interface Message {
  role: "user" | "model";
  content: string;
  id?: string;
}

interface ChatStats {
  remainingRequests: number;
  hourlyLimit: number;
  lifetimeRemaining: number;
}

interface AIChatInterfaceProps {
  chatId: string;
  onMessageSent?: (title: string, lastMessage: string) => void;
}

export default function AIChatInterface({ chatId, onMessageSent }: AIChatInterfaceProps) {
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
  const [isInitialized, setIsInitialized] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (chatId && !isInitialized) {
      fetchChatHistory()
      setIsInitialized(true)
    }
  }, [chatId, session, isInitialized])
  
  // Handle chat stats updates separately from chat history
  useEffect(() => {
    // Periodically update the chat stats without reloading the entire chat
    const updateInterval = setInterval(() => {
      if (chatId && isInitialized) {
        updateChatStats()
      }
    }, 60000) // Update every minute
    
    return () => clearInterval(updateInterval)
  }, [chatId, isInitialized])
  
  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  
  const fetchChatHistory = async () => {
    try {
      setInitialLoading(true)
      
      // First fetch the usage stats
      const statsResponse = await fetch('/api/ai/chat')
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch usage stats')
      }
      
      const statsData = await statsResponse.json()
      setChatStats({
        remainingRequests: statsData.remainingRequests || 0,
        hourlyLimit: statsData.hourlyLimit || 0,
        lifetimeRemaining: statsData.lifetimeRemaining || 0
      })
      
      // Then fetch the specific chat history
      const chatResponse = await fetch(`/api/ai/chat-history/${chatId}`)
      
      if (!chatResponse.ok) {
        throw new Error('Failed to fetch chat messages')
      }
      
      const chatData = await chatResponse.json()
      const chatHistory = chatData.chatHistory
      
      // Transform messages from the chat history
      if (chatHistory && chatHistory.messages) {
        const formattedMessages = chatHistory.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }))
        
        setMessages(formattedMessages)
      }
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
  
  const updateChatStats = async () => {
    try {
      const statsResponse = await fetch('/api/ai/chat')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setChatStats({
          remainingRequests: statsData.remainingRequests || 0,
          hourlyLimit: statsData.hourlyLimit || 0,
          lifetimeRemaining: statsData.lifetimeRemaining || 0
        })
      }
    } catch (error) {
      console.error('Error updating chat stats:', error)
    }
  }
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading || !chatId) return
    
    const userMessage = input.trim()
    setInput("")
    
    // Create message objects with unique IDs
    const userMessageObj: Message = { 
      role: "user", 
      content: userMessage,
      id: `user-${Date.now()}`
    }
    
    // Optimistically add user message to UI
    setMessages((prev) => [...prev, userMessageObj])
    
    try {
      setIsLoading(true)
      
      // First update the chat history with just the user message
      await fetch(`/api/ai/chat-history/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      
      // Then send message to AI
      const aiResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json()
        throw new Error('Failed to get AI response')
      }
      
      const data = await aiResponse.json()
      
      // Create AI message object with unique ID
      const aiMessageObj: Message = { 
        role: "model", 
        content: data.response,
        id: `ai-${Date.now()}`
      }
      
      // Add AI response to UI
      setMessages((prev) => [...prev, aiMessageObj])
      
      // Add only the AI response to chat history
      await fetch(`/api/ai/chat-history/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          aiResponse: data.response 
        })
      })
      
      // Update usage stats
      setChatStats({
        remainingRequests: data.remainingRequests,
        hourlyLimit: data.hourlyLimit,
        lifetimeRemaining: data.lifetimeRemaining
      })
      
      // Notify parent component that a message was sent (for updating the chat list)
      if (onMessageSent) {
        // Get the first few words of the first message as title if it's a new chat
        const chatTitle = messages.length <= 2 ? 
          messages[0].content.split(' ').slice(0, 5).join(' ') + '...' :
          undefined;
        
        onMessageSent(
          chatTitle || 'Chat',
          aiMessageObj.content.split(' ').slice(0, 10).join(' ') + '...'
        );
      }
      
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive"
      })
      
      // Add error message from AI
      setMessages((prev) => [...prev, { 
        role: "model" as const, 
        content: "Sorry, I encountered an error. Please try again later.",
        id: `error-${Date.now()}`
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
  
  // Format message content with markdown support
  const formatMessageContent = (content: string) => {
    // Simple messages without markdown formatting
    // Check for various markdown indicators
    if (!content.includes("```") && 
        !content.includes("- ") && 
        !content.includes("* ") &&
        !content.includes("1. ") && 
        !content.includes("#") &&
        !content.includes("**") &&
        !content.includes("|") &&
        !content.includes("_")) {
      return content.split('\n').map((line, i) => (
        <span key={i}>
          {line}
          {i < content.split('\n').length - 1 && <br />}
        </span>
      ));
    }
    
    // Use ReactMarkdown for formatted content
    return (
      <div className="w-full overflow-hidden">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              
              return match ? (
                <SyntaxHighlighter
                  language={match[1]}
                  style={vscDarkPlus}
                  PreTag="div"
                  className="rounded-md my-2"
                  customStyle={{
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    margin: '0.75rem 0',
                  }}
                  showLineNumbers={true}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              )
            },
            // Style basic elements
            p: ({children}) => <p className="my-2 text-sm">{children}</p>,
            ul: ({children}) => <ul className="list-disc pl-6 my-3 space-y-2">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal pl-6 my-3 space-y-2">{children}</ol>,
            li: ({children}) => (
              <li className="my-1">
                <div className="flex items-baseline">
                  <div className="flex-1 ml-1">{children}</div>
                </div>
              </li>
            ),
            h1: ({children}) => <h1 className="text-xl font-bold my-3">{children}</h1>,
            h2: ({children}) => <h2 className="text-lg font-bold my-3">{children}</h2>,
            h3: ({children}) => <h3 className="text-base font-bold my-2">{children}</h3>,
            blockquote: ({children}) => <blockquote className="border-l-4 border-muted-foreground pl-3 my-2 italic">{children}</blockquote>,
            table: ({children}) => <div className="overflow-x-auto"><table className="min-w-full border border-border my-3">{children}</table></div>,
            pre: ({children}) => <pre className="rounded-md my-2 bg-transparent overflow-hidden">{children}</pre>,
            strong: ({children}) => <strong className="font-bold">{children}</strong>,
            em: ({children}) => <em className="italic">{children}</em>,
            // Style for double asterisks (bold) like **text**
            text: ({children}) => {
              if (typeof children === 'string' && children.includes('**')) {
                const parts = children.split(/(\*\*.*?\*\*)/g);
                return (
                  <>
                    {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </>
                );
              }
              return <>{children}</>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
  
  return (
    <Card className="flex flex-col h-full">
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
        <Alert variant="destructive" className="mx-4 mb-2">
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
                  key={message.id || index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[85%] sm:max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    } rounded-lg px-3 py-3`}
                  >
                    <div className="flex gap-3 w-full">
                      <div className="mt-0.5 shrink-0">
                        {message.role === "user" ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Bot className="h-5 w-5" />
                        )}
                      </div>
                      <div className="break-words w-full">
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
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
} 