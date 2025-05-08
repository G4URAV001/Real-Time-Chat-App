import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import Avatar from '@/components/UI/Avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface UserListProps {
  searchQuery?: string;
  onSelectUser: (userId: string) => void;
}

const UserList: React.FC<UserListProps> = ({ searchQuery = '', onSelectUser }) => {
  const { onlineUsers, startDirectConversation } = useChat();

  const filteredUsers = searchQuery
    ? onlineUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : onlineUsers;

  const handleUserClick = (userId: string) => {
    if (!userId) {
      console.error("Cannot start conversation with undefined user ID");
      return;
    }
    
    console.log(`Starting conversation with user ID: ${userId}`);
    startDirectConversation(userId);
    onSelectUser(userId);
  };

  return (
    <div className="space-y-1">
      {filteredUsers.length > 0 ? (
        filteredUsers.map((user) => (
          <div
            key={user.id || `user-${Math.random().toString(36).substring(7)}`}
            className="p-2 rounded-md hover:bg-accent/50 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Avatar 
                src={user.avatar} 
                name={user.username || "Unknown User"}
                size="md"
                status={user.status || 'offline'}
              />
              <div className="ml-3">
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => user.id && handleUserClick(user.id)}
              disabled={!user.id}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        ))
      ) : (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No users found</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserList;
