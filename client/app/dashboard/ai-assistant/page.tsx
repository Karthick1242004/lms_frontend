"use client"

import { Separator } from "@/components/ui/separator"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardHeader from "@/components/dashboard/page-header"
import AIChatInterface from "@/components/ai-chat/ai-chat-interface"
import { Bot, Sparkles, Zap, Trash2, HelpCircle, Info, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Define interfaces for the chat history
interface ChatSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export default function AIAssistantPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      setLoading(false)
      // Load chat history
      loadChatHistory()
    }
  }, [status, router])

  // Load chat history from API/database
  const loadChatHistory = async () => {
    // This would be replaced with a real API call
    const mockChatHistory: ChatSummary[] = [
      {
        id: "chat1",
        title: "HTML/CSS Calculator Help",
        lastMessage: "I need help with HTML & CSS code for a calculator",
        timestamp: "2023-06-12T14:30:00Z"
      },
      {
        id: "chat2",
        title: "React State Management",
        lastMessage: "How do I manage state in a complex React app?",
        timestamp: "2023-06-10T09:15:00Z"
      },
      {
        id: "chat3",
        title: "Data Science Fundamentals",
        lastMessage: "Can you explain correlation vs causation?",
        timestamp: "2023-06-08T16:45:00Z"
      }
    ]
    
    setChatHistory(mockChatHistory)
    // Set first chat as active by default if there's at least one chat
    if (mockChatHistory.length > 0) {
      setActiveChat(mockChatHistory[0].id)
    }
  }

  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteChat = async () => {
    if (chatToDelete) {
      // This would be replaced with a real API call
      setChatHistory(prev => prev.filter(chat => chat.id !== chatToDelete))
      
      // If the deleted chat was active, select the first available chat or null
      if (activeChat === chatToDelete) {
        const remainingChats = chatHistory.filter(chat => chat.id !== chatToDelete)
        setActiveChat(remainingChats.length > 0 ? remainingChats[0].id : null)
      }
      
      toast({
        title: "Chat deleted",
        description: "The conversation has been removed"
      })
    }
    
    setShowDeleteDialog(false)
    setChatToDelete(null)
  }

  const createNewChat = () => {
    // Generate a unique ID for the new chat
    const newChatId = `new-chat-${Date.now()}`
    
    // Create new chat object
    const newChat: ChatSummary = {
      id: newChatId,
      title: "New Conversation",
      lastMessage: "Start a new conversation with the AI assistant",
      timestamp: new Date().toISOString()
    }
    
    // Add to chat history and set as active chat
    setChatHistory(prev => [newChat, ...prev])
    setActiveChat(newChatId)
    
    // Make sure history sidebar is open
    setIsHistoryCollapsed(false)
    
    toast({
      title: "New conversation started",
      description: "You can now start chatting with the AI assistant"
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const toggleHistorySidebar = () => {
    setIsHistoryCollapsed(!isHistoryCollapsed)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <DashboardHeader 
          heading="AI Assistant" 
          text="Ask questions and get help from our AI assistant"
        />
        <Separator />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-center items-center h-full">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="AI Assistant" 
        text="Ask questions and get help from our AI assistant"
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={createNewChat} 
            className="hidden md:flex items-center gap-1"
          >
            <Zap className="h-4 w-4" /> New Chat
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4" sideOffset={5}>
                <div className="space-y-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" /> AI Features
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex gap-2">
                      <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Get help with course topics and assignments</span>
                    </li>
                    <li className="flex gap-2">
                      <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Ask questions about programming concepts</span>
                    </li>
                    <li className="flex gap-2">
                      <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Explain complex topics in simple terms</span>
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4" sideOffset={5}>
                <div className="space-y-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4" /> Usage Policy
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Hourly limit: 6 requests per hour</li>
                    <li>• Lifetime limit: 100 requests total</li>
                    <li>• AI responses may not always be accurate</li>
                    <li>• For critical issues, contact your instructor</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </DashboardHeader>
      <Separator />
      
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full flex gap-4 md:gap-6">
          {/* Collapsible history sidebar */}
          <div 
            className={cn(
              "transition-all duration-300 ease-in-out flex flex-col",
              isHistoryCollapsed ? "w-[40px]" : "w-full lg:w-1/4"
            )}
          >
            {/* Collapsed state */}
            {isHistoryCollapsed ? (
              <div className="h-full flex flex-col">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleHistorySidebar}
                  className="mb-2 self-end"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="flex-1 flex flex-col items-center bg-card rounded-lg py-4 border">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={createNewChat}
                    className="mb-4"
                  >
                    <Zap className="h-5 w-5" />
                  </Button>
                  {chatHistory.slice(0, 5).map((chat) => (
                    <Button
                      key={chat.id}
                      variant={activeChat === chat.id ? "secondary" : "ghost"}
                      size="icon"
                      className="mb-2"
                      onClick={() => setActiveChat(chat.id)}
                      title={chat.title}
                    >
                      <Bot className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base md:text-lg">Chat History</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={createNewChat}>
                      <Zap className="h-4 w-4 mr-1" /> New Chat
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleHistorySidebar} className="h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-2">
                    <div className="space-y-2">
                      {chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-center text-muted-foreground">
                          <p>No previous conversations</p>
                          <p className="text-sm">Start chatting to create history</p>
                        </div>
                      ) : (
                        chatHistory.map(chat => (
                          <div 
                            key={chat.id}
                            className={`p-3 rounded-md cursor-pointer group relative ${
                              activeChat === chat.id 
                                ? "bg-primary/10 hover:bg-primary/15" 
                                : "hover:bg-muted"
                            }`}
                            onClick={() => setActiveChat(chat.id)}
                          >
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium text-sm line-clamp-1">{chat.title}</h3>
                              <span className="text-xs text-muted-foreground">{formatDate(chat.timestamp)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{chat.lastMessage}</p>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            isHistoryCollapsed ? "w-[calc(100%-40px)]" : "lg:w-3/4"
          )}>
            <AIChatInterface />
          </div>
        </div>
      </div>
      
      {/* Mobile action button for new chat */}
      <div className="md:hidden fixed bottom-20 right-6">
        <Button size="icon" onClick={createNewChat} className="h-12 w-12 rounded-full shadow-md">
          <Zap className="h-5 w-5" />
        </Button>
      </div>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteChat}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 