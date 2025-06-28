"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  MoreHorizontal,
  Archive,
  Star,
  StarOff,
  RefreshCw,
  CheckCheck,
  Check,
  X,
  Plus,
  Download,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import MessagingLayout from "@/components/layouts/messaging-layout"

// Types
interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  content: string
  attachments?: Attachment[]
  isRead: boolean
  isStarred: boolean
  createdAt: Date
  readAt?: Date
}

interface Conversation {
  id: string
  participants: User[]
  lastMessage?: Message
  unreadCount: number
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("inbox")
  const [searchQuery, setSearchQuery] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me")
        if (!response.ok) {
          throw new Error(`Error fetching current user: ${response.status}`)
        }
        const data = await response.json()
        setCurrentUser(data)
      } catch (error) {
        console.error("Error fetching current user:", error)
        toast.error("Failed to load user data")
      }
    }

    fetchCurrentUser()
  }, [])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users")
        if (!response.ok) {
          throw new Error(`Error fetching users: ${response.status}`)
        }
        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error("Error fetching users:", error)
        toast.error("Failed to load users")
      }
    }

    fetchUsers()
  }, [])

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/messages/conversations")
        if (!response.ok) {
          throw new Error(`Error fetching conversations: ${response.status}`)
        }

        const data = await response.json()

        // Convert string dates to Date objects
        const processedData = data.map((conversation: any) => ({
          ...conversation,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
          lastMessage: conversation.lastMessage
            ? {
                ...conversation.lastMessage,
                createdAt: new Date(conversation.lastMessage.createdAt),
                readAt: conversation.lastMessage.readAt ? new Date(conversation.lastMessage.readAt) : undefined,
              }
            : undefined,
        }))

        setConversations(processedData)
        setFilteredConversations(processedData.filter((c: Conversation) => !c.isArchived))
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching conversations:", error)
        toast.error("Failed to load conversations")
        setIsLoading(false)
      }
    }

    if (currentUser) {
      fetchConversations()
    }
  }, [currentUser])

  // Filter conversations based on active tab and search query
  useEffect(() => {
    if (conversations.length === 0) return

    let filtered = [...conversations]

    // Filter by tab
    if (activeTab === "inbox") {
      filtered = filtered.filter((conversation) => !conversation.isArchived)
    } else if (activeTab === "archived") {
      filtered = filtered.filter((conversation) => conversation.isArchived)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((conversation) => {
        const otherParticipant = conversation.participants.find((p) => p.id !== currentUser?.id)
        return (
          otherParticipant?.name.toLowerCase().includes(query) || otherParticipant?.email.toLowerCase().includes(query)
        )
      })
    }

    setFilteredConversations(filtered)
  }, [conversations, activeTab, searchQuery, currentUser])

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async (conversationId: string) => {
      try {
        const response = await fetch(`/api/messages/conversations/${conversationId}`)
        if (!response.ok) {
          throw new Error(`Error fetching messages: ${response.status}`)
        }

        const data = await response.json()

        // Convert string dates to Date objects
        const processedData = data.map((message: any) => ({
          ...message,
          createdAt: new Date(message.createdAt),
          readAt: message.readAt ? new Date(message.readAt) : undefined,
        }))

        setMessages(processedData)

        // Mark unread messages as read
        if (selectedConversation?.unreadCount) {
          markConversationAsRead(conversationId)
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
        toast.error("Failed to load messages")
      }
    }

    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/messages/conversations")
      if (!response.ok) {
        throw new Error(`Error refreshing conversations: ${response.status}`)
      }

      const data = await response.json()

      // Convert string dates to Date objects
      const processedData = data.map((conversation: any) => ({
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        lastMessage: conversation.lastMessage
          ? {
              ...conversation.lastMessage,
              createdAt: new Date(conversation.lastMessage.createdAt),
              readAt: conversation.lastMessage.readAt ? new Date(conversation.lastMessage.readAt) : undefined,
            }
          : undefined,
      }))

      setConversations(processedData)
      setFilteredConversations(processedData.filter((c: Conversation) => !c.isArchived))
      setIsRefreshing(false)
      toast.success("Messages refreshed")
    } catch (error) {
      console.error("Error refreshing conversations:", error)
      toast.error("Failed to refresh conversations")
      setIsRefreshing(false)
    }
  }

  // Mark conversation as read
  const markConversationAsRead = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error marking conversation as read: ${response.status}`)
      }

      // Update local state
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      )
    } catch (error) {
      console.error("Error marking conversation as read:", error)
      toast.error("Failed to mark conversation as read")
    }
  }

  // Archive/unarchive conversation
  const toggleArchiveConversation = async (conversationId: string) => {
    try {
      const isCurrentlyArchived = conversations.find((c) => c.id === conversationId)?.isArchived || false

      const response = await fetch(`/api/messages/conversations/${conversationId}/archive`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: !isCurrentlyArchived }),
      })

      if (!response.ok) {
        throw new Error(`Error toggling archive status: ${response.status}`)
      }

      // Update local state
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, isArchived: !conversation.isArchived } : conversation,
        ),
      )

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }

      toast.success(`Conversation ${isCurrentlyArchived ? "unarchived" : "archived"}`)
    } catch (error) {
      console.error("Error toggling archive status:", error)
      toast.error("Failed to update conversation")
    }
  }

  // Star/unstar message
  const toggleStarMessage = async (messageId: string) => {
    try {
      const isCurrentlyStarred = messages.find((m) => m.id === messageId)?.isStarred || false

      const response = await fetch(`/api/messages/${messageId}/star`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ starred: !isCurrentlyStarred }),
      })

      if (!response.ok) {
        throw new Error(`Error toggling star status: ${response.status}`)
      }

      // Update local state
      setMessages((prev) =>
        prev.map((message) => (message.id === messageId ? { ...message, isStarred: !message.isStarred } : message)),
      )
    } catch (error) {
      console.error("Error toggling star status:", error)
      toast.error("Failed to update message")
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return

    if (!selectedConversation && !selectedRecipient) {
      toast.error("Please select a recipient")
      return
    }

    try {
      // Create form data for file uploads
      const formData = new FormData()
      formData.append("content", newMessage)

      if (selectedConversation) {
        formData.append("conversationId", selectedConversation.id)
      } else if (selectedRecipient) {
        formData.append("recipientId", selectedRecipient.id)
      }

      // Add attachments
      attachments.forEach((file) => {
        formData.append("attachments", file)
      })

      // Send the message
      const response = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`)
      }

      const data = await response.json()

      // Process the returned message
      const newMessageObj = {
        ...data,
        createdAt: new Date(data.createdAt),
        readAt: data.readAt ? new Date(data.readAt) : undefined,
      }

      // If this is a new conversation
      if (!selectedConversation) {
        // Fetch the newly created conversation
        const convResponse = await fetch(`/api/messages/conversations/${data.conversationId}`)
        if (!convResponse.ok) {
          throw new Error(`Error fetching new conversation: ${convResponse.status}`)
        }

        const convData = await convResponse.json()

        // Process conversation data
        const newConversation = {
          ...convData,
          createdAt: new Date(convData.createdAt),
          updatedAt: new Date(convData.updatedAt),
          lastMessage: {
            ...newMessageObj,
          },
        }

        setConversations((prev) => [newConversation, ...prev])
        setSelectedConversation(newConversation)
        setMessages([newMessageObj])
      } else {
        // Add message to existing conversation
        setMessages((prev) => [...prev, newMessageObj])

        // Update conversation
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === selectedConversation.id
              ? {
                  ...conversation,
                  lastMessage: newMessageObj,
                  updatedAt: new Date(),
                }
              : conversation,
          ),
        )
      }

      // Clear input
      setNewMessage("")
      setAttachments([])
      setIsComposing(false)
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    }
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setAttachments((prev) => [...prev, ...filesArray])
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Format conversation time
  const formatConversationTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return format(date, "h:mm a")
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return format(date, "MMM d")
    }
  }

  // Format message time
  const formatMessageTime = (date: Date) => {
    return format(date, "h:mm a")
  }

  // Get other participant in conversation
  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.id !== currentUser?.id)
  }

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Loading state
  if (isLoading) {
    return (
      <MessagingLayout>
        <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Messages</h1>
              <p className="text-muted-foreground">Communicate with advertisers, partners, and team members</p>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Skeleton className="h-12 w-full mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <Skeleton className="h-[500px] w-full" />
            </div>
          </div>
        </div>
      </MessagingLayout>
    )
  }

  return (
    <MessagingLayout>
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Communicate with advertisers, partners, and team members</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedConversation(null)
                setSelectedRecipient(null)
                setIsComposing(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Conversations List */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search messages..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="inbox" value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList className="w-full">
                <TabsTrigger value="inbox" className="flex-1">
                  Inbox
                  {conversations.filter((c) => !c.isArchived && c.unreadCount > 0).length > 0 && (
                    <Badge variant="default" className="ml-2">
                      {conversations.filter((c) => !c.isArchived && c.unreadCount > 0).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex-1">
                  Archived
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <ScrollArea className="h-[calc(100vh-300px)]">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No messages found</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "inbox" ? "Your inbox is empty" : "No archived conversations"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation)
                    if (!otherParticipant) return null

                    return (
                      <div
                        key={conversation.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors",
                          selectedConversation?.id === conversation.id ? "bg-accent" : "hover:bg-muted",
                          conversation.unreadCount > 0 && "bg-muted/80",
                        )}
                        onClick={() => {
                          setSelectedConversation(conversation)
                          setIsComposing(false)
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
                          <AvatarFallback>{getUserInitials(otherParticipant.name)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3
                              className={cn(
                                "text-sm font-medium truncate",
                                conversation.unreadCount > 0 && "font-semibold",
                              )}
                            >
                              {otherParticipant.name}
                            </h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatConversationTime(conversation.updatedAt)}
                            </span>
                          </div>

                          <p
                            className={cn(
                              "text-xs text-muted-foreground truncate",
                              conversation.unreadCount > 0 && "text-foreground font-medium",
                            )}
                          >
                            {conversation.lastMessage?.content || "No messages yet"}
                          </p>

                          <div className="flex items-center justify-between mt-1">
                            <Badge
                              variant={
                                otherParticipant.role === "ADMIN"
                                  ? "default"
                                  : otherParticipant.role === "ADVERTISER"
                                    ? "outline"
                                    : "secondary"
                              }
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              {otherParticipant.role.charAt(0) + otherParticipant.role.slice(1).toLowerCase()}
                            </Badge>

                            {conversation.unreadCount > 0 && (
                              <Badge variant="default" className="text-[10px] px-1 py-0 h-4">
                                {conversation.unreadCount} new
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleArchiveConversation(conversation.id)
                              }}
                            >
                              {conversation.isArchived ? (
                                <>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Unarchive
                                </>
                              ) : (
                                <>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </>
                              )}
                            </DropdownMenuItem>
                            {conversation.unreadCount > 0 && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markConversationAsRead(conversation.id)
                                }}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Content */}
          <div className="md:col-span-2 lg:col-span-3">
            {isComposing ? (
              <Card className="h-[calc(100vh-200px)] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>New Message</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsComposing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Select
                      value={selectedRecipient?.id || ""}
                      onValueChange={(value) => {
                        const recipient = users.find((user) => user.id === value)
                        setSelectedRecipient(recipient || null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((user) => user.id !== currentUser?.id)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center">
                                <span>{user.name}</span>
                                <Badge
                                  variant={
                                    user.role === "ADMIN"
                                      ? "default"
                                      : user.role === "ADVERTISER"
                                        ? "outline"
                                        : "secondary"
                                  }
                                  className="ml-2 text-[10px] px-1 py-0 h-4"
                                >
                                  {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto">
                  {attachments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Attachments</h4>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded-md text-xs">
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t pt-3">
                  <div className="flex flex-col w-full gap-3">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[100px]"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Paperclip className="h-4 w-4 mr-2" />
                          Attach Files
                        </Button>
                      </div>

                      <Button
                        onClick={sendMessage}
                        disabled={(!newMessage.trim() && attachments.length === 0) || !selectedRecipient}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ) : selectedConversation ? (
              <Card className="h-[calc(100vh-200px)] flex flex-col">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={getOtherParticipant(selectedConversation)?.avatar}
                        alt={getOtherParticipant(selectedConversation)?.name || ""}
                      />
                      <AvatarFallback>
                        {getUserInitials(getOtherParticipant(selectedConversation)?.name || "")}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <CardTitle className="text-lg">{getOtherParticipant(selectedConversation)?.name}</CardTitle>
                      <CardDescription>{getOtherParticipant(selectedConversation)?.email}</CardDescription>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleArchiveConversation(selectedConversation.id)}>
                        {selectedConversation.isArchived ? (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <Separator />

                <CardContent className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isCurrentUser = message.senderId === currentUser?.id
                      const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId

                      return (
                        <div
                          key={message.id}
                          className={cn("flex gap-3", isCurrentUser ? "justify-end" : "justify-start")}
                        >
                          {!isCurrentUser && showAvatar && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage
                                src={getOtherParticipant(selectedConversation)?.avatar}
                                alt={getOtherParticipant(selectedConversation)?.name || ""}
                              />
                              <AvatarFallback>
                                {getUserInitials(getOtherParticipant(selectedConversation)?.name || "")}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          {!isCurrentUser && !showAvatar && <div className="w-8" />}

                          <div className={cn("max-w-[80%] space-y-1", isCurrentUser && "items-end")}>
                            <div className="flex items-start gap-2">
                              <div
                                className={cn(
                                  "rounded-lg p-3",
                                  isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted",
                                )}
                              >
                                <p className="text-sm">{message.content}</p>

                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment) => (
                                      <div
                                        key={attachment.id}
                                        className={cn(
                                          "flex items-center gap-2 rounded-md p-2 text-xs",
                                          isCurrentUser
                                            ? "bg-primary-foreground/10 text-primary-foreground"
                                            : "bg-background",
                                        )}
                                      >
                                        <Paperclip className="h-3 w-3" />
                                        <span className="truncate flex-1">{attachment.name}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={cn("h-5 w-5", isCurrentUser && "text-primary-foreground")}
                                          onClick={() => window.open(attachment.url, "_blank")}
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                                  message.isStarred && "opacity-100 text-yellow-500",
                                )}
                                onClick={() => toggleStarMessage(message.id)}
                              >
                                {message.isStarred ? (
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                ) : (
                                  <StarOff className="h-3 w-3" />
                                )}
                              </Button>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{formatMessageTime(message.createdAt)}</span>
                              {isCurrentUser && (
                                <CheckCheck
                                  className={cn(
                                    "h-3 w-3 ml-1",
                                    message.isRead ? "text-blue-500" : "text-muted-foreground",
                                  )}
                                />
                              )}
                            </div>
                          </div>

                          {isCurrentUser && showAvatar && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                              <AvatarFallback>{getUserInitials(currentUser.name)}</AvatarFallback>
                            </Avatar>
                          )}

                          {isCurrentUser && !showAvatar && <div className="w-8" />}
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                <CardFooter className="border-t pt-3">
                  <div className="flex flex-col w-full gap-3">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[100px]"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Paperclip className="h-4 w-4 mr-2" />
                          Attach Files
                        </Button>
                      </div>

                      <Button onClick={sendMessage} disabled={!newMessage.trim() && attachments.length === 0}>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-200px)] flex flex-col items-center justify-center">
                <CardContent className="flex flex-col items-center justify-center text-center py-10">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Select a conversation from the list or start a new message to communicate with advertisers,
                    partners, and team members.
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedConversation(null)
                      setSelectedRecipient(null)
                      setIsComposing(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MessagingLayout>
  )
}
