import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Lock, Globe, MessageSquare, Users, MessageCircle } from "lucide-react";
import RoomList from './RoomList';
import UserList from './UserList';
import DirectConversationList from './DirectConversationList';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChatSidebarProps {
  onNewRoom: () => void;
  onJoinPublicRoom: () => void;
  onJoinPrivateRoom: () => void;
  onNewDirectMessage: () => void;
  onSelectRoom: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  onNewRoom, 
  onJoinPublicRoom,
  onJoinPrivateRoom, 
  onNewDirectMessage,
  onSelectRoom 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { directConversations } = useChat();
  
  // Calculate total unread messages
  const totalUnread = directConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white shadow-md z-10">
      <div className="p-4">
        <Button 
          className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          onClick={onNewRoom}
        >
          <Plus className="h-4 w-4" />
          <span>New Chat Room</span>
        </Button>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between px-4 pb-2">
        <Button
          id="join-public-room-button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs flex-1 mr-1 justify-center border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-800 hover:border-violet-400"
          onClick={onJoinPublicRoom}
        >
          <Globe className="h-3.5 w-3.5" />
          Join Public
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs flex-1 ml-1 justify-center border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-800 hover:border-violet-400"
          onClick={onJoinPrivateRoom}
        >
          <Lock className="h-3.5 w-3.5" />
          Join Private
        </Button>
      </div>

      <Tabs defaultValue="rooms" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="rooms" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            Direct
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger id="users-tab" value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rooms" className="flex-1 pt-2">
          <ScrollArea className="h-full">
            <div className="px-4">
              <RoomList 
                searchQuery={searchQuery}
                onSelectRoom={onSelectRoom}
              />
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="direct" className="flex-1 pt-2">
          <ScrollArea className="h-full">
            <div className="px-4">
              <div className="flex justify-end mb-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="text-xs flex items-center gap-1 bg-violet-500 hover:bg-violet-600 text-white font-medium shadow-sm"
                  onClick={onNewDirectMessage}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Conversation
                </Button>
              </div>
              <DirectConversationList 
                searchQuery={searchQuery}
                onSelectConversation={onSelectRoom}
              />
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="users" className="flex-1 pt-2">
          <ScrollArea className="h-full">
            <div className="px-4">
              <UserList 
                searchQuery={searchQuery}
                onSelectUser={onSelectRoom}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatSidebar;
