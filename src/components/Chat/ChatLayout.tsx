import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { Button } from '@/components/ui/button';
import { MenuIcon, X, Info } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/components/ui/use-toast';
import CreateRoomDialog from './CreateRoomDialog';
import JoinPrivateRoomDialog from './JoinPrivateRoomDialog';
import JoinPublicRoomDialog from './JoinPublicRoomDialog';
import NewConversationDialog from './NewConversationDialog';
import ProfileMenu from '../UI/ProfileMenu';

const ChatLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { createRoom, joinRoomByInviteCode, currentRoom, startDirectConversation } = useChat();
  const { toast } = useToast();
  
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [isJoinPrivateRoomDialogOpen, setIsJoinPrivateRoomDialogOpen] = useState(false);
  const [isJoinPublicRoomDialogOpen, setIsJoinPublicRoomDialogOpen] = useState(false);
  const [isNewConversationDialogOpen, setIsNewConversationDialogOpen] = useState(false);
  
  // Add event listener for opening the new conversation dialog from other components
  React.useEffect(() => {
    const handleOpenNewConversationDialog = () => {
      setIsNewConversationDialogOpen(true);
    };
    
    window.addEventListener('open-new-conversation-dialog', handleOpenNewConversationDialog);
    
    return () => {
      window.removeEventListener('open-new-conversation-dialog', handleOpenNewConversationDialog);
    };
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isMobile = useIsMobile();

  const handleCreateRoom = async (name: string, description: string, isPrivate: boolean) => {
    if (name.trim()) {
      try {
        await createRoom(name.trim(), description.trim() || undefined, isPrivate);
        setIsCreateRoomDialogOpen(false);
        
        toast({
          title: `Room "${name}" created`,
          description: isPrivate 
            ? "Invite code has been generated. Share it with users you want to invite." 
            : "Your room is now available in the rooms list.",
        });
      } catch (error) {
        toast({
          title: "Error creating room",
          description: error instanceof Error ? error.message : "Failed to create room",
          variant: "destructive"
        });
      }
    }
  };

  const handleJoinPrivateRoom = async (inviteCode: string) => {
    try {
      await joinRoomByInviteCode(inviteCode);
      setIsJoinPrivateRoomDialogOpen(false);
      
      toast({
        title: "Room joined",
        description: "You've successfully joined the private room.",
      });
    } catch (error) {
      toast({
        title: "Failed to join room",
        description: error instanceof Error ? error.message : "Invalid invite code or room not found",
        variant: "destructive"
      });
    }
  };

  const handleStartConversation = (userId: string) => {
    startDirectConversation(userId);
    setIsNewConversationDialogOpen(false);
    
    toast({
      title: "Conversation started",
      description: "You can now chat with this user directly.",
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="relative flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b bg-white shadow-sm z-10">
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
              <MenuIcon className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold">
            <span className="text-violet-400">Instant Wave</span>
            <span className="text-black"> Talk</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 border border-violet-300 dark:border-violet-700 px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-sm font-medium hidden sm:inline-block text-violet-700 dark:text-violet-300 font-semibold">
            Hello, {currentUser?.username}
          </span>
          <ProfileMenu />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`${
            isMobile 
              ? `fixed inset-y-0 left-0 z-40 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out bg-white shadow-lg`
              : 'w-64 border-r bg-white'
          } flex flex-col`}
        >
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Chat</h2>
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
          <ChatSidebar 
            onNewRoom={() => setIsCreateRoomDialogOpen(true)}
            onJoinPublicRoom={() => setIsJoinPublicRoomDialogOpen(true)}
            onJoinPrivateRoom={() => setIsJoinPrivateRoomDialogOpen(true)}
            onNewDirectMessage={() => setIsNewConversationDialogOpen(true)}
            onSelectRoom={() => isMobile && setIsSidebarOpen(false)}
          />
        </aside>

        {/* Overlay for mobile when sidebar is open */}
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-30" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <ChatWindow />
        </main>
      </div>

      {/* Create Room Dialog */}
      <CreateRoomDialog
        open={isCreateRoomDialogOpen}
        onOpenChange={setIsCreateRoomDialogOpen}
        onCreateRoom={handleCreateRoom}
      />

      {/* Join Private Room Dialog */}
      <JoinPrivateRoomDialog
        open={isJoinPrivateRoomDialogOpen}
        onOpenChange={setIsJoinPrivateRoomDialogOpen}
        onJoinRoom={handleJoinPrivateRoom}
      />

      {/* Join Public Room Dialog */}
      <JoinPublicRoomDialog
        open={isJoinPublicRoomDialogOpen}
        onOpenChange={setIsJoinPublicRoomDialogOpen}
      />

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={isNewConversationDialogOpen}
        onOpenChange={setIsNewConversationDialogOpen}
        onStartConversation={handleStartConversation}
      />
    </div>
  );
};

export default ChatLayout;
