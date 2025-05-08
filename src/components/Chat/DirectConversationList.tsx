import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/UI/Avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

interface DirectConversationListProps {
  searchQuery?: string;
  onSelectConversation: () => void;
}

const DirectConversationList: React.FC<DirectConversationListProps> = ({
  searchQuery = '',
  onSelectConversation
}) => {
  const { directConversations, startDirectConversation, currentDirectRecipient, onlineUsers } = useChat();

  // Filter conversations based on search query
  const filteredConversations = searchQuery
    ? directConversations.filter(conversation =>
        conversation.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : directConversations;

  // Filter out conversations with undefined userId
  const validConversations = filteredConversations.filter(
    conversation => conversation.userId && conversation.username
  );

  // Helper function to safely format time
  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp || isNaN(timestamp)) return 'recently';
    
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error('Invalid timestamp:', timestamp, error);
      return 'recently';
    }
  };

  // Check if a user is currently selected
  const isSelected = (userId: string) => {
    return currentDirectRecipient?.id === userId;
  };

  return (
    <div className="space-y-1">
      {validConversations.length > 0 ? (
        validConversations.map((conversation) => (
          <div
            key={`direct-${conversation.userId || Math.random().toString(36).substring(7)}`}
            className={`p-2 rounded-md cursor-pointer flex items-center ${
              isSelected(conversation.userId) ? 'bg-primary/10' : 'hover:bg-accent/50'
            }`}
            onClick={() => {
              if (conversation.userId) {
                startDirectConversation(conversation.userId);
                onSelectConversation();
              }
            }}
          >
            <Avatar 
              name={conversation.username || 'User'} 
              src={conversation.avatar}
              size="md"
              status={conversation.isOnline ? "online" : "offline"}
            />
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">{conversation.username}</p>
                {conversation.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center">
                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                {conversation.lastMessage ? (
                  <p className="text-muted-foreground truncate max-w-[150px]">
                    {conversation.lastMessage.senderId === conversation.userId 
                      ? conversation.lastMessage.text 
                      : `You: ${conversation.lastMessage.text}`}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No messages yet</p>
                )}
                {conversation.lastMessage && (
                  <span className="text-muted-foreground ml-1 shrink-0">
                    {formatTime(conversation.lastMessage.timestamp)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No direct conversations yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start a chat with someone from the users list</p>
        </div>
      )}
    </div>
  );
};

export default DirectConversationList;
