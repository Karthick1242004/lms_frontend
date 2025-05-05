"use client"

import { Separator } from "@/components/ui/separator"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardHeader from "@/components/dashboard/page-header"
import AIChatInterface from "@/components/ai-chat/ai-chat-interface"
import { Bot, Sparkles, Zap, Trash2, HelpCircle, Info, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Define interface for chat history
interface ChatSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages?: { role: string; content: string }[];
}

export default function AIAssistantPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      loadChatHistory()
    }
  }, [status, router])

  // Load chat history from database
  const loadChatHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/chat-history')
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history')
      }
      
      const data = await response.json()
      const histories = data.chatHistories || []
      
      setChatHistory(histories)
      
      // Set first chat as active by default if there's at least one chat
      if (histories.length > 0 && !activeChat) {
        setActiveChat(histories[0].id)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return
    
    try {
      setLoadingAction(true)
      const response = await fetch(`/api/ai/chat-history?id=${chatToDelete}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete chat')
      }
      
      // Remove from local state
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
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive"
      })
    } finally {
      setLoadingAction(false)
      setShowDeleteDialog(false)
      setChatToDelete(null)
    }
  }

  const createNewChat = async () => {
    try {
      setLoadingAction(true)
      const response = await fetch('/api/ai/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: "New Conversation" 
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create new chat')
      }
      
      const data = await response.json()
      const newChat = data.chatHistory
      
      // Add to chat history and set as active chat
      setChatHistory(prev => [newChat, ...prev])
      setActiveChat(newChat.id)
      
      // Make sure history sidebar is open
      setIsHistoryCollapsed(false)
      
      toast({
        title: "New conversation started",
        description: "You can now start chatting with the AI assistant"
      })
    } catch (error) {
      console.error('Error creating new chat:', error)
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      })
    } finally {
      setLoadingAction(false)
    }
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

  // Add this new function to update a single chat in history
  const updateChatInHistory = (chatId: string, title: string, lastMessage: string) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          title: (chat.messages?.length || 0) <= 2 ? title : chat.title,
          lastMessage,
          timestamp: new Date().toISOString()
        }
      }
      return chat
    }))
  }

  if (loading && status !== "loading") {
    return (
      <div className="flex flex-col h-full">
        <DashboardHeader 
          heading="AI Assistant" 
          text="Ask questions and get help from our AI assistant"
        />
        <Separator />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading chat history...</p>
            </div>
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
          {/* <Button 
            variant="outline" 
            size="sm" 
            onClick={createNewChat} 
            className="hidden md:flex items-center gap-1"
            disabled={loadingAction}
          >
            {loadingAction ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            New Chat
          </Button> */}
          
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end" className="max-w-sm p-4">
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
          
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end" className="max-w-sm p-4">
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
      
      <div className="flex-1 p-4 md:p-6">
        <div className="h-full flex gap-2 md:gap-4">
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
                    disabled={loadingAction}
                  >
                    {loadingAction ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                  </Button>
                  {chatHistory.slice(0, 5).map((chat) => (
                    <Button
                      key={chat.id}
                      variant={activeChat === chat.id ? "secondary" : "ghost"}
                      size="icon"
                      className="mb-2 w-[80%]"
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={createNewChat}
                      disabled={loadingAction}
                    >
                      {loadingAction ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Zap className="h-4 w-4 mr-1" />
                      )}
                      New Chat
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
                              className="absolute right-1 top-7 opacity-0 group-hover:opacity-100 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                              disabled={loadingAction}
                            >
                              <Trash2 className="h-3.5  text-red-500 w-3.5 text-muted-foreground" />
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
            {activeChat ? (
              <AIChatInterface 
                chatId={activeChat} 
                key={activeChat} 
                onMessageSent={(title: string, lastMessage: string) => {
                  updateChatInHistory(activeChat, title, lastMessage)
                }} 
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Bot className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No active conversation</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a new chat or select an existing one from the history
                  </p>
                  <Button onClick={createNewChat} disabled={loadingAction}>
                    {loadingAction ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Start New Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile action button for new chat */}
      <div className="md:hidden fixed bottom-20 right-6">
        <Button size="icon" onClick={createNewChat} className="h-12 w-12 rounded-full shadow-md" disabled={loadingAction}>
          {loadingAction ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
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
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={loadingAction}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteChat} 
              disabled={loadingAction}
            >
              {loadingAction ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 