import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useChat } from '@/contexts/ChatContext';
import { Search, Globe, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface JoinPublicRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinPublicRoomDialog: React.FC<JoinPublicRoomDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { publicRooms, joinRoom, isLoading, fetchPublicRooms } = useChat();

  // Fetch public rooms when dialog opens
  useEffect(() => {
    if (open) {
      fetchPublicRooms();
    }
  }, [open, fetchPublicRooms]);

  // Filter rooms based on search query
  const filteredRooms = publicRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoinRoom = (roomId: string) => {
    joinRoom(roomId);
    toast({
      title: "Room joined",
      description: "You have successfully joined the room",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Join Public Room
          </DialogTitle>
          <DialogDescription>
            Browse and join available public chat rooms
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-md border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : filteredRooms.length > 0 ? (
            // Room list
            filteredRooms.map((room) => (
              <div 
                key={room.id || room._id} 
                className="flex justify-between items-center p-3 rounded-md border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{room.name}</h4>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{room.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {room.members?.length || 0} members
                      </span>
                      {room.lastActivity && (
                        <span className="text-xs text-muted-foreground">
                          • Active {formatDistanceToNow(new Date(room.lastActivity), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleJoinRoom(room.id || room._id)}
                >
                  Join
                </Button>
              </div>
            ))
          ) : (
            // No rooms found
            <div className="text-center py-6">
              <p className="text-muted-foreground">No public rooms found</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term or create a new room
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinPublicRoomDialog;
