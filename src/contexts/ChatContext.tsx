import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';

// Define API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Define types
type Message = {
  id: string;
  roomId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
  isRead?: boolean;
  directRecipientId?: string;
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
    mimetype: string;
  }[];
};

type Room = {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  createdBy: string;
  isPrivate: boolean;
  inviteCode?: string;
  users?: string[]; // Array of user IDs who have joined this room
  lastActivity?: number;
  members?: any[];
  unreadCount?: number;
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
};

type DirectConversation = {
  userId: string;
  username: string;
  avatar?: string;
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
  unreadCount: number;
  isOnline?: boolean;
  lastActive?: number;
};

type OnlineUser = {
  id: string;
  username: string;
  avatar?: string;
  lastActive: number;
  status?: 'online' | 'offline' | 'away';
};

type ChatContextType = {
  messages: Message[];
  rooms: Room[];
  publicRooms: Room[];
  currentRoom: Room | null;
  directConversations: DirectConversation[];
  currentDirectRecipient: OnlineUser | null;
  onlineUsers: OnlineUser[];
  sendMessage: (roomId: string, text: string, attachments?: File[]) => void;
  sendDirectMessage: (recipientId: string, text: string, attachments?: File[]) => void;
  createRoom: (name: string, description?: string, isPrivate?: boolean) => Promise<void>;
  joinRoom: (roomId: string) => void;
  joinRoomByInviteCode: (inviteCode: string) => Promise<void>;
  leaveRoom: (roomId: string) => void;
  startDirectConversation: (userId: string) => void;
  removeMember: (roomId: string, userId: string) => void;
  generateNewInviteCode: (roomId: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<string, string[]>;
  setTyping: (roomId: string, isTyping: boolean) => void;
  setDirectTyping: (recipientId: string, isTyping: boolean) => void;
  fetchPublicRooms: () => Promise<void>;
  loadRoomMessages: (roomId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [directConversations, setDirectConversations] = useState<DirectConversation[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentDirectRecipient, setCurrentDirectRecipient] = useState<OnlineUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // Get token from localStorage
  const getToken = (): string | null => {
    return localStorage.getItem('chatToken');
  };

  // Connect to socket.io server when user logs in
  useEffect(() => {
    if (!currentUser) return;
    
    const token = getToken();
    if (!token) return;

    console.log('Initializing socket connection...');
    
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server with ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    setSocket(newSocket);

    // Clean up socket connection on unmount
    return () => {
      console.log('Disconnecting socket...');
      newSocket.disconnect();
    };
  }, [currentUser]);

  // Socket event handlers - separate from the connection setup
  useEffect(() => {
    if (!socket) return;
    
    console.log('Setting up socket event handlers...');

    // Handle room messages
    const handleRoomMessage = (message: any) => {
      console.log('Received room message via socket:', message);
      
      // Format the message to match our expected structure
      const formattedMessage: Message = {
        id: message._id || message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: message.sender?._id || message.sender?.id || message.senderId,
        senderName: message.sender?.username || message.senderName || 'Unknown User',
        senderAvatar: message.sender?.avatar || message.senderAvatar,
        text: message.text || message.content || '',
        timestamp: message.timestamp || message.createdAt ? new Date(message.timestamp || message.createdAt).getTime() : Date.now(),
        roomId: message.room || message.roomId,
        isRead: false
      };
      
      console.log('Formatted room message:', formattedMessage);
      
      // Check if we have a valid roomId
      if (!formattedMessage.roomId) {
        console.error('Message has no roomId:', formattedMessage);
        return;
      }
      
      // Check if the message is from the current user and is a temporary message
      const isTemporaryMessage = formattedMessage.id.toString().startsWith('temp-');
      const isFromCurrentUser = formattedMessage.senderId === currentUser?.id;
      
      // If it's from the current user, we need to check if we already have a temporary version
      if (isFromCurrentUser) {
        console.log('Message is from current user, checking for duplicates');
      }
      
      // Add message to state if it's for the current room
      // Note: We need to compare both id and _id formats since MongoDB uses _id
      if (currentRoom && (
          formattedMessage.roomId === currentRoom.id || 
          formattedMessage.roomId === currentRoom._id
        )) {
        console.log(`Adding message to current room ${currentRoom.name}`);
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          // For the current user, we might have a temporary message with different ID
          // So we need to check both the ID and the content/timestamp
          const exists = prev.some(m => 
            m.id === formattedMessage.id || 
            (isFromCurrentUser && 
             m.text === formattedMessage.text && 
             Math.abs(m.timestamp - formattedMessage.timestamp) < 5000 && // Within 5 seconds
             m.id.toString().startsWith('temp-'))
          );
          
          if (exists) {
            console.log('Message already exists in state, skipping');
            return prev;
          }
          
          // If it's from the current user, we might need to replace a temporary message
          if (isFromCurrentUser) {
            // Try to find a matching temporary message
            const tempIndex = prev.findIndex(m => 
              m.id.toString().startsWith('temp-') && 
              m.text === formattedMessage.text && 
              Math.abs(m.timestamp - formattedMessage.timestamp) < 5000 // Within 5 seconds
            );
            
            if (tempIndex >= 0) {
              console.log('Replacing temporary message with confirmed message');
              const newMessages = [...prev];
              newMessages[tempIndex] = formattedMessage;
              return newMessages;
            }
          }
          
          return [...prev, formattedMessage];
        });
      } else {
        console.log(`Message for room ${formattedMessage.roomId} but current room is ${currentRoom?.id || currentRoom?._id || 'none'}`);
        
        // Update unread count for the room
        setRooms(prev => 
          prev.map(room => {
            // Compare both id and _id
            if (room.id === formattedMessage.roomId || room._id === formattedMessage.roomId) {
              console.log(`Updating unread count for room ${room.name}`);
              return {
                ...room,
                unreadCount: (room.unreadCount || 0) + 1,
                lastMessage: {
                  text: formattedMessage.text,
                  timestamp: formattedMessage.timestamp,
                  senderId: formattedMessage.senderId
                }
              };
            }
            return room;
          })
        );
      }
    };

    // Handle direct messages
    const handleDirectMessage = (message: any) => {
      console.log('Received direct message via socket:', message);
      
      // Format the message to match our expected structure
      const formattedMessage: Message = {
        id: message._id || message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: message.sender?._id || message.sender?.id || message.senderId,
        senderName: message.sender?.username || message.senderName || 'Unknown User',
        senderAvatar: message.sender?.avatar || message.senderAvatar,
        text: message.text || message.content || '',
        timestamp: message.timestamp || message.createdAt ? new Date(message.timestamp || message.createdAt).getTime() : Date.now(),
        directRecipientId: message.directRecipient || message.recipientId,
        isRead: false,
        attachments: message.attachments || []
      };
      
      // Check if the message is from the current user and is a temporary message
      const isFromCurrentUser = formattedMessage.senderId === currentUser?.id;
      
      // Determine the other user's ID (the one we're chatting with)
      const otherUserId = formattedMessage.senderId === currentUser?.id 
        ? formattedMessage.directRecipientId 
        : formattedMessage.senderId;
        
      console.log(`Updating conversation with user: ${otherUserId}`);

      // Add message to messages state if we're in the direct conversation
      if (currentDirectRecipient && (currentDirectRecipient.id === otherUserId || currentDirectRecipient.id === formattedMessage.senderId)) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const hasAttachments = formattedMessage.attachments && formattedMessage.attachments.length > 0;
          
          // Only check for exact ID matches to avoid skipping messages with attachments
          const exists = prev.some(m => m.id === formattedMessage.id);
          
          if (exists) {
            console.log('Message with same ID already exists in state, skipping');
            return prev;
          }
          
          // If it's from the current user, we might need to replace a temporary message
          if (isFromCurrentUser) {
            // Try to find a matching temporary message
            const tempIndex = prev.findIndex(m => 
              m.id.toString().startsWith('temp-') && 
              m.text === formattedMessage.text && 
              Math.abs(m.timestamp - formattedMessage.timestamp) < 5000 // Within 5 seconds
            );
            
            if (tempIndex >= 0) {
              console.log('Replacing temporary message with confirmed message');
              const newMessages = [...prev];
              newMessages[tempIndex] = formattedMessage;
              return newMessages;
            }
          }
          
          return [...prev, formattedMessage];
        });
      }

      // Update direct conversations with new message
      setDirectConversations(prev => {
        // Try to find the conversation
        const conversationIndex = prev.findIndex(c => 
          c.userId === otherUserId
        );

        if (conversationIndex >= 0) {
          // Update existing conversation
          const updatedConversations = [...prev];
          const conversation = { ...updatedConversations[conversationIndex] };
          
          conversation.lastMessage = {
            text: formattedMessage.text,
            timestamp: formattedMessage.timestamp,
            senderId: formattedMessage.senderId
          };
          
          // Increment unread count if message is not from current user
          if (formattedMessage.senderId !== currentUser?.id && 
              (!currentDirectRecipient || currentDirectRecipient.id !== formattedMessage.senderId)) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
          
          updatedConversations[conversationIndex] = conversation;
          return updatedConversations;
        } else if (otherUserId && otherUserId !== currentUser?.id) {
          // If conversation doesn't exist, try to find the user in online users
          const otherUser = onlineUsers.find(u => u.id === otherUserId);
          
          if (otherUser) {
            // Create a new conversation
            return [...prev, {
              userId: otherUser.id,
              username: otherUser.username,
              avatar: otherUser.avatar,
              isOnline: otherUser.status === 'online',
              unreadCount: formattedMessage.senderId !== currentUser?.id ? 1 : 0,
              lastMessage: {
                text: formattedMessage.text,
                timestamp: formattedMessage.timestamp,
                senderId: formattedMessage.senderId
              }
            }];
          }
        }
        
        return prev;
      });
    };

    // Register event handlers
    socket.on('room:message', handleRoomMessage);
    socket.on('direct:message', handleDirectMessage);

    // Handle user status changes
    socket.on('user:status', ({ userId, status, lastActive }) => {
      // Update online users list
      setOnlineUsers(prev => {
        const userIndex = prev.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          const updatedUsers = [...prev];
          updatedUsers[userIndex] = {
            ...updatedUsers[userIndex],
            status,
            lastActive: new Date(lastActive).getTime()
          };
          return updatedUsers;
        }
        return prev;
      });
      
      // Update direct conversations
      setDirectConversations(prev => {
        const conversationIndex = prev.findIndex(c => c.userId === userId);
        if (conversationIndex >= 0) {
          const updatedConversations = [...prev];
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            isOnline: status === 'online'
          };
          return updatedConversations;
        }
        return prev;
      });
    });

    // Handle room typing
    socket.on('room:typing', ({ roomId, username, isTyping }) => {
      setTypingUsers(prev => {
        const roomTypers = prev[roomId] || [];
        
        if (isTyping && !roomTypers.includes(username)) {
          return { ...prev, [roomId]: [...roomTypers, username] };
        } else if (!isTyping && roomTypers.includes(username)) {
          return { ...prev, [roomId]: roomTypers.filter(name => name !== username) };
        }
        
        return prev;
      });
    });

    // Handle direct typing
    socket.on('direct:typing', ({ userId, username, isTyping }) => {
      setTypingUsers(prev => {
        const directTypers = prev[`direct:${userId}`] || [];
        
        if (isTyping && !directTypers.includes(username)) {
          return { ...prev, [`direct:${userId}`]: [...directTypers, username] };
        } else if (!isTyping && directTypers.includes(username)) {
          return { ...prev, [`direct:${userId}`]: directTypers.filter(name => name !== username) };
        }
        
        return prev;
      });
    });

    // Clean up event handlers
    return () => {
      console.log('Removing socket event handlers...');
      socket.off('room:message');
      socket.off('direct:message');
      socket.off('user:status');
      socket.off('room:typing');
      socket.off('direct:typing');
    };
  }, [socket, currentUser, currentRoom, currentDirectRecipient, onlineUsers]);

  // Fetch user's rooms
  const fetchUserRooms = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/rooms/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('User rooms data:', data);
      
      if (response.ok) {
        setRooms(data.rooms || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to fetch rooms');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch public rooms
  const fetchPublicRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching public rooms...');
      
      const response = await fetch(`${API_BASE_URL}/rooms/public`);
      const data = await response.json();
      
      console.log('Public rooms data:', data);
      
      if (response.ok) {
        setPublicRooms(data.rooms || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      setError('Failed to fetch public rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Online users data:', data);
      
      if (response.ok) {
        setOnlineUsers((data.users || []).map((user: any) => ({
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          lastActive: new Date(user.lastActive).getTime(),
          status: user.status
        })));
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, [currentUser]);

  // Fetch direct conversations
  const fetchDirectConversations = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Direct conversations data:', data);
      
      if (response.ok) {
        // Filter out any conversations with missing or invalid data
        const validConversations = (data.conversations || []).filter(
          (conv: any) => conv && conv.user && conv.user._id
        ).map((conv: any) => ({
          userId: conv.user._id,
          username: conv.user.username || 'Unknown User',
          avatar: conv.user.avatar,
          isOnline: conv.user.status === 'online',
          unreadCount: conv.unreadCount || 0,
          lastMessage: conv.lastMessage ? {
            text: conv.lastMessage.text,
            senderId: conv.lastMessage.sender._id,
            timestamp: new Date(conv.lastMessage.createdAt).getTime()
          } : null
        }));
        
        setDirectConversations(validConversations);
      }
    } catch (error) {
      console.error('Error fetching direct conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch initial data when user logs in
  useEffect(() => {
    if (currentUser) {
      console.log('Current user is logged in, fetching data...');
      fetchUserRooms();
      fetchPublicRooms();
      fetchOnlineUsers();
      fetchDirectConversations();
    }
  }, [currentUser, fetchUserRooms, fetchPublicRooms, fetchOnlineUsers, fetchDirectConversations]);

  // Load messages for a room
  const loadRoomMessages = useCallback(async (roomId: string) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      console.log(`Loading messages for room: ${roomId}`);
      const response = await fetch(`${API_BASE_URL}/messages/room/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Room messages data:', data);
      
      if (response.ok) {
        // Transform messages to ensure they have the correct format and required fields
        const formattedMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id || msg._id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roomId: roomId,
          senderId: msg.senderId || msg.sender?._id || msg.sender?.id || 'unknown',
          senderName: msg.senderName || msg.sender?.username || 'Unknown User',
          senderAvatar: msg.senderAvatar || msg.sender?.avatar,
          text: msg.text || msg.content || '',
          timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()).getTime(),
          isRead: msg.isRead || false,
          attachments: msg.attachments || []
        }));
        
        // Sort messages by timestamp
        formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Clear previous messages and set new ones
        setMessages(formattedMessages);
        
        // Mark room as read by resetting unread count
        setRooms(prev => 
          prev.map(room => {
            if (room.id === roomId || room._id === roomId) {
              console.log(`Updating unread count for room ${room.name}`);
              return {
                ...room,
                unreadCount: 0
              };
            }
            return room;
          })
        );
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error loading room messages:', error);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Send message to room
  const sendMessage = useCallback((roomId: string, text: string, attachments?: File[]) => {
    if (!socket || !currentUser || !roomId) {
      console.error('Cannot send message: Missing socket, user, or room ID');
      return;
    }
    
    console.log(`Sending message to room: ${roomId}`);
    
    // Create a temporary message to show immediately in the UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: currentUser.id,
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar,
      text,
      timestamp: Date.now(),
      roomId,
      isRead: false
    };

    // Handle file uploads if any
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('roomId', roomId);
      formData.append('text', text);
      
      // Add each file to the form data
      attachments.forEach((file, index) => {
        formData.append('files', file);
      });
      
      // Create temporary attachments for immediate display
      tempMessage.attachments = attachments.map(file => {
        const isImage = file.type.startsWith('image/');
        return {
          type: isImage ? 'image' : 'file',
          url: isImage ? URL.createObjectURL(file) : '#',
          name: file.name,
          size: file.size,
          mimetype: file.type
        };
      });
      
      // Add to messages state if we're in the room
      if (currentRoom && (currentRoom.id === roomId || currentRoom._id === roomId)) {
        console.log(`Adding temporary message with attachments to room ${currentRoom.name}`);
        setMessages(prev => [...prev, tempMessage]);
      }
      
      // Upload files and send message
      axios.post(`${API_BASE_URL}/messages/room-with-attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${getToken()}`
        }
      })
      .then(response => {
        console.log('Message with attachments sent successfully:', response.data);
        
        // Update the temporary message with the real one from the server
        if (currentRoom && (currentRoom.id === roomId || currentRoom._id === roomId)) {
          const serverMessage = response.data.data;
          
          // Replace the temporary message with the server message
          setMessages(prev => prev.map(msg => 
            msg.id === tempMessage.id ? {
              ...serverMessage,
              id: serverMessage._id || serverMessage.id,
              senderId: serverMessage.sender._id || serverMessage.sender.id,
              senderName: serverMessage.sender.username,
              senderAvatar: serverMessage.sender.avatar,
              timestamp: serverMessage.createdAt ? new Date(serverMessage.createdAt).getTime() : serverMessage.timestamp,
              roomId: serverMessage.room
            } : msg
          ));
          
          // Revoke any blob URLs to prevent memory leaks
          if (tempMessage.attachments) {
            tempMessage.attachments.forEach(attachment => {
              if (attachment.url.startsWith('blob:')) {
                URL.revokeObjectURL(attachment.url);
              }
            });
          }
        }
      })
      .catch(error => {
        console.error('Error sending message with attachments:', error);
        // Show error toast
        toast({
          title: 'Error',
          description: 'Failed to send message with attachments',
          variant: 'destructive'
        });
      });
      
      return;
    }
    
    // Add to messages state if we're in the room (for text-only messages)
    if (currentRoom && (currentRoom.id === roomId || currentRoom._id === roomId)) {
      console.log(`Adding temporary message to room ${currentRoom.name}`);
      setMessages(prev => [...prev, tempMessage]);
    }
    
    // Send via socket (for text-only messages)
    socket.emit('room:message', {
      roomId,
      text,
      timestamp: tempMessage.timestamp
    });
  }, [socket, currentUser, currentRoom, toast]);

  // Send a direct message to a user
  const sendDirectMessage = useCallback((recipientId: string, text: string, attachments?: File[]) => {
    if (!socket || !currentUser) {
      console.error('Cannot send message: Socket or user not available');
      return;
    }
    
    if (!recipientId) {
      console.error('Cannot send message: Recipient ID is undefined');
      return;
    }
    
    console.log(`Sending direct message to: ${recipientId}`);
    
    // Create a temporary message to show immediately in the UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: currentUser.id,
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar,
      text,
      timestamp: Date.now(),
      directRecipientId: recipientId,
      isRead: false
    };

    // Handle file uploads if any
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('recipientId', recipientId);
      formData.append('text', text);
      
      // Add each file to the form data
      attachments.forEach((file, index) => {
        formData.append('files', file);
      });
      
      // Create temporary attachments for immediate display
      tempMessage.attachments = attachments.map(file => {
        const isImage = file.type.startsWith('image/');
        return {
          type: isImage ? 'image' : 'file',
          url: isImage ? URL.createObjectURL(file) : '#',
          name: file.name,
          size: file.size,
          mimetype: file.type
        };
      });
      
      // Add to messages state if we're in the direct conversation
      if (currentDirectRecipient && currentDirectRecipient.id === recipientId) {
        console.log(`Adding temporary direct message with attachments to conversation with ${currentDirectRecipient.username}`);
        setMessages(prev => [...prev, tempMessage]);
      }
      
      // Upload files and send message
      axios.post(`${API_BASE_URL}/messages/direct-with-attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${getToken()}`
        }
      })
      .then(response => {
        console.log('Direct message with attachments sent successfully:', response.data);
        
        // Update the temporary message with the real one from the server
        if (currentDirectRecipient && currentDirectRecipient.id === recipientId) {
          const serverMessage = response.data.data;
          
          // Replace the temporary message with the server message
          setMessages(prev => {
            // Find the temporary message
            const tempIndex = prev.findIndex(msg => msg.id === tempMessage.id);
            
            if (tempIndex >= 0) {
              console.log('Replacing temporary message with server message');
              const newMessages = [...prev];
              newMessages[tempIndex] = {
                ...serverMessage,
                id: serverMessage._id || serverMessage.id,
                senderId: serverMessage.sender._id || serverMessage.sender.id,
                senderName: serverMessage.sender.username,
                senderAvatar: serverMessage.sender.avatar,
                timestamp: serverMessage.createdAt ? new Date(serverMessage.createdAt).getTime() : serverMessage.timestamp,
                directRecipientId: serverMessage.recipientId,
                attachments: serverMessage.attachments || []
              };
              return newMessages;
            }
            
            return prev;
          });
          
          // Revoke any blob URLs to prevent memory leaks
          if (tempMessage.attachments) {
            tempMessage.attachments.forEach(attachment => {
              if (attachment.url.startsWith('blob:')) {
                URL.revokeObjectURL(attachment.url);
              }
            });
          }
        }
      })
      .catch(error => {
        console.error('Error sending direct message with attachments:', error);
        // Show error toast
        toast({
          title: 'Error',
          description: 'Failed to send message with attachments',
          variant: 'destructive'
        });
      });
      
      return;
    }
    
    // Add to messages state if we're in the direct conversation (for text-only messages)
    if (currentDirectRecipient && currentDirectRecipient.id === recipientId) {
      console.log(`Adding temporary direct message to conversation with ${currentDirectRecipient.username}`);
      setMessages(prev => [...prev, tempMessage]);
    }
    
    // Send via socket (for text-only messages)
    socket.emit('direct:message', {
      recipientId,
      text,
      timestamp: tempMessage.timestamp
    });
  }, [socket, currentUser, currentDirectRecipient, toast]);

  // Create a new room
  const createRoom = useCallback(async (name: string, description?: string, isPrivate = false) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, isPrivate })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRooms(prev => [...prev, data.room]);
        setCurrentRoom(data.room);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Join a room
  const joinRoom = useCallback((roomId: string) => {
    if (!socket || !currentUser) {
      console.error('Cannot join room: Socket or user not available');
      return;
    }
    
    console.log(`Joining room with ID: ${roomId}`);
    
    // Leave current room if any
    if (currentRoom) {
      console.log(`Leaving current room: ${currentRoom.id || currentRoom._id}`);
      socket.emit('room:leave', { roomId: currentRoom.id || currentRoom._id });
    }
    
    // Join new room
    socket.emit('room:join', { roomId });
    
    // Find the room in our state, checking both id and _id properties
    const room = rooms.find(r => r.id === roomId || r._id === roomId) || 
                 publicRooms.find(r => r.id === roomId || r._id === roomId);
                 
    if (room) {
      console.log(`Found room: ${room.name}, setting as current room`);
      
      // Clear current messages
      setMessages([]);
      
      // Set the current room
      setCurrentRoom(room);
      
      // Reset direct recipient
      setCurrentDirectRecipient(null);
      
      // Load room messages
      loadRoomMessages(roomId);
    } else {
      console.error(`Room with ID ${roomId} not found in rooms or publicRooms`);
      console.log('Available rooms:', rooms.map(r => ({ id: r.id, _id: r._id, name: r.name })));
      console.log('Available public rooms:', publicRooms.map(r => ({ id: r.id, _id: r._id, name: r.name })));
    }
  }, [socket, currentUser, rooms, publicRooms, currentRoom, loadRoomMessages]);

  // Join a room by invite code
  const joinRoomByInviteCode = useCallback(async (inviteCode: string) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Check if room already exists in the list
        const roomExists = rooms.some(room => 
          (room.id === data.room.id) || 
          (room._id === data.room._id) || 
          (room._id === data.room.id) || 
          (room.id === data.room._id)
        );
        
        if (!roomExists) {
          // Add the new room to the rooms list
          setRooms(prev => {
            const updatedRooms = [...prev, data.room];
            console.log('Updated rooms list:', updatedRooms);
            return updatedRooms;
          });
          
          // If the room is public, also update the public rooms list
          if (!data.room.isPrivate) {
            setPublicRooms(prev => {
              const roomExists = prev.some(room => 
                (room.id === data.room.id) || 
                (room._id === data.room._id) || 
                (room._id === data.room.id) || 
                (room.id === data.room._id)
              );
              
              if (!roomExists) {
                return [...prev, data.room];
              }
              return prev;
            });
          }
        }
        
        // Set as current room
        setCurrentRoom(data.room);
        
        // Emit socket event to join the room
        if (socket) {
          socket.emit('room:join', { roomId: data.room.id || data.room._id });
        }
        
        return data.room;
      } else {
        setError(data.message);
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    if (!socket || !currentUser) return;
    
    socket.emit('room:leave', { roomId });
    
    // Remove room from our state
    setRooms(prev => prev.filter(r => r.id !== roomId));
    
    // If we're currently in this room, reset current room
    if (currentRoom && currentRoom.id === roomId) {
      setCurrentRoom(null);
    }
  }, [socket, currentUser, currentRoom]);

  // Load direct messages between users
  const loadDirectMessages = useCallback(async (recipientId: string) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      console.log(`Loading direct messages with user: ${recipientId}`);
      const response = await fetch(`${API_BASE_URL}/messages/direct/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Direct messages data:', data);
      
      if (response.ok) {
        // Transform messages to ensure they have the correct format
        const formattedMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id || msg._id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          senderId: msg.senderId || msg.sender?._id || msg.sender?.id || 'unknown',
          senderName: msg.senderName || msg.sender?.username || 'Unknown User',
          senderAvatar: msg.senderAvatar || msg.sender?.avatar,
          text: msg.text || msg.content || '',
          timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()).getTime(),
          isRead: msg.isRead || false,
          directRecipientId: recipientId,
          attachments: msg.attachments || []
        }));
        
        // Sort messages by timestamp
        formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Clear previous messages and set new ones
        setMessages(formattedMessages);
        
        // Mark conversation as read by resetting unread count
        setDirectConversations(prev => 
          prev.map(conv => {
            if (conv.userId === recipientId) {
              console.log(`Marking conversation with ${conv.username} as read`);
              return {
                ...conv,
                unreadCount: 0
              };
            }
            return conv;
          })
        );
        
        // Also update the backend about read status
        if (socket) {
          socket.emit('direct:mark-read', { recipientId });
          console.log(`Notified server that messages with ${recipientId} have been read`);
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error loading direct messages:', error);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, socket]);

  // Start a direct conversation
  const startDirectConversation = useCallback((userId: string) => {
    if (!currentUser || !userId) {
      console.error(`Cannot start conversation: ${!currentUser ? 'No current user' : 'Invalid recipient ID'}`);
      return;
    }
    
    console.log(`Starting direct conversation with user ID: ${userId}`);
    
    // Find the user in our online users list
    const user = onlineUsers.find(u => u.id === userId);
    
    if (user) {
      setCurrentDirectRecipient(user);
      
      // Reset current room
      setCurrentRoom(null);
      
      // Load direct messages
      loadDirectMessages(userId);
      
      // Reset unread count for this conversation
      setDirectConversations(prev => {
        return prev.map(conv => {
          if (conv.userId === userId) {
            console.log(`Resetting unread count for conversation with ${conv.username}`);
            return {
              ...conv,
              unreadCount: 0
            };
          }
          return conv;
        });
      });
      
      // If this is a new conversation, add it to the directConversations list
      const existingConversation = directConversations.find(
        conv => conv.userId === userId
      );
      
      if (!existingConversation) {
        console.log(`Adding new direct conversation with ${user.username}`);
        setDirectConversations(prev => [
          ...prev,
          {
            userId: user.id,
            username: user.username,
            avatar: user.avatar,
            isOnline: user.status === 'online',
            unreadCount: 0,
            lastMessage: null
          }
        ]);
      }
    } else {
      console.error(`User with ID ${userId} not found in online users`);
    }
  }, [currentUser, onlineUsers, directConversations, loadDirectMessages]);

  // Remove a member from a room
  const removeMember = useCallback((roomId: string, userId: string) => {
    if (!socket || !currentUser) return;
    
    socket.emit('room:remove-member', { roomId, userId });
  }, [socket, currentUser]);

  // Generate a new invite code for a room
  const generateNewInviteCode = useCallback(async (roomId: string) => {
    if (!currentUser) return '';
    
    try {
      setIsLoading(true);
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the room in our state
        setRooms(prev => prev.map(r => 
          r.id === roomId ? { ...r, inviteCode: data.inviteCode } : r
        ));
        
        return data.inviteCode;
      } else {
        setError(data.message);
        return '';
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
      setError('Failed to generate invite code');
      return '';
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Set typing status for room
  const setTyping = useCallback((roomId: string, isTyping: boolean) => {
    if (!socket || !currentUser) return;
    
    socket.emit('room:typing', { roomId, isTyping });
  }, [socket, currentUser]);

  // Set typing status for direct message
  const setDirectTyping = useCallback((recipientId: string, isTyping: boolean) => {
    if (!socket || !currentUser) return;
    
    socket.emit('direct:typing', { recipientId, isTyping });
  }, [socket, currentUser]);

  return (
    <ChatContext.Provider value={{
      messages,
      rooms,
      publicRooms,
      currentRoom,
      directConversations,
      currentDirectRecipient,
      onlineUsers,
      sendMessage,
      sendDirectMessage,
      createRoom,
      joinRoom,
      joinRoomByInviteCode,
      leaveRoom,
      startDirectConversation,
      removeMember,
      generateNewInviteCode,
      isLoading,
      error,
      typingUsers,
      setTyping,
      setDirectTyping,
      fetchPublicRooms,
      loadRoomMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
