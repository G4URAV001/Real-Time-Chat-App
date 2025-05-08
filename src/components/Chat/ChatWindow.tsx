import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import Message from './Message';
import MessageInput from './MessageInput';
import { Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/UI/Avatar';
import RoomDetails from './RoomDetails';
import MembersList from './MembersList';

const ChatWindow: React.FC = () => {
  const { 
    messages, 
    currentRoom, 
    currentDirectRecipient,
    sendMessage, 
    sendDirectMessage,
    isLoading 
  } = useChat();
  const { currentUser } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState(false);
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);
  
  // Filter messages for the current room or direct conversation
  const filteredMessages = React.useMemo(() => {
    if (currentRoom) {
      return messages.filter(message => 
        message.roomId === currentRoom.id || 
        message.roomId === currentRoom._id
      );
    } else if (currentDirectRecipient) {
      return messages.filter(message => 
        message.directRecipientId === currentDirectRecipient.id ||
        message.senderId === currentDirectRecipient.id
      );
    }
    return [];
  }, [messages, currentRoom, currentDirectRecipient]);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages]);

  const handleSendMessage = (text: string, attachments?: File[]) => {
    if ((text.trim() || (attachments && attachments.length > 0)) && currentUser) {
      if (currentRoom) {
        sendMessage(currentRoom.id || currentRoom._id, text, attachments);
      } else if (currentDirectRecipient) {
        sendDirectMessage(currentDirectRecipient.id, text, attachments);
      }
    }
  };

  // No active chat
  if (!currentRoom && !currentDirectRecipient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <h3 className="text-lg font-medium mb-2">No chat selected</h3>
          <p className="text-muted-foreground mb-4">Select a room or start a direct conversation to begin chatting</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => document.getElementById('join-public-room-button')?.click()}>
              Browse Public Rooms
            </Button>
            <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-new-conversation-dialog'))}>
              Find Users
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center">
          {currentRoom && (
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-800 font-semibold mr-3">
                {currentRoom.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold">{currentRoom.name}</h2>
                {currentRoom?.description && (
                  <p className="text-sm text-muted-foreground">{currentRoom.description}</p>
                )}
              </div>
            </div>
          )}
          {currentDirectRecipient && (
            <div className="flex items-center">
              <Avatar 
                name={currentDirectRecipient.username}
                src={currentDirectRecipient.avatar}
                size="md"
                status={currentDirectRecipient.status || 'offline'}
              />
              <div className="ml-3">
                <h2 className="font-semibold">{currentDirectRecipient.username}</h2>
                <p className="text-sm text-muted-foreground">
                  {currentDirectRecipient.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {currentRoom && (
            <Button 
              variant="ghost" 
              size="icon"
              id="room-info-button"
              onClick={() => setIsRoomDetailsOpen(true)}
              title="Room Information"
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
          {/* Room members button removed as requested */}
        </div>
      </div>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : filteredMessages.length > 0 ? (
          <div className="space-y-4">
            {filteredMessages.map((message, index) => (
              <Message
                key={message.id || `msg-${index}`}
                message={message}
                isOwnMessage={message.senderId === currentUser?.id}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-2">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              {currentRoom ? 'Start the conversation in this room!' : 'Send a message to start the conversation!'}
            </p>
          </div>
        )}
      </ScrollArea>
      
      {/* Message input */}
      <div className="p-3 border-t">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>

      {/* Room Details Dialog */}
      {currentRoom && (
        <RoomDetails
          open={isRoomDetailsOpen}
          onOpenChange={setIsRoomDetailsOpen}
        />
      )}

      {/* Members List Dialog */}
      {currentRoom && (
        <MembersList
          open={isMembersListOpen}
          onOpenChange={setIsMembersListOpen}
          roomId={currentRoom.id || currentRoom._id}
        />
      )}
    </div>
  );
};

export default ChatWindow;
