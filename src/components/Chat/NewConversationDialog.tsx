
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageSquare } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import Avatar from '@/components/UI/Avatar';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (userId: string) => void;
}

const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onOpenChange,
  onStartConversation
}) => {
  const { onlineUsers } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = searchQuery 
    ? onlineUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : onlineUsers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">New Conversation</DialogTitle>
          <DialogDescription>
            Select a user to start a direct conversation
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-violet-100 focus-visible:ring-violet-300"
          />
        </div>

        <div className="overflow-y-auto max-h-[300px]">
          {filteredUsers.length > 0 ? (
            <ul className="space-y-2">
              {filteredUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      name={user.username} 
                      src={user.avatar}
                      size="sm"
                      status={user.lastActive > Date.now() - 300000 ? "online" : "offline"}
                    />
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-gray-500">
                        {user.lastActive > Date.now() - 300000 ? "Online" : "Away"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onStartConversation(user.id);
                      onOpenChange(false);
                    }}
                    title={`Chat with ${user.username}`}
                  >
                    <MessageSquare className="h-5 w-5 text-violet-500" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
