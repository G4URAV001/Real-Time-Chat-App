import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useChat } from '@/contexts/ChatContext';
import Avatar from '@/components/UI/Avatar';
import { Users, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MembersListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

const MembersList: React.FC<MembersListProps> = ({ open, onOpenChange, roomId }) => {
  const { onlineUsers, removeMember, currentRoom } = useChat();
  const { toast } = useToast();

  if (!currentRoom) return null;

  const isCreator = currentRoom.createdBy === 'current-user-id'; // This should be replaced with actual user ID comparison
  const roomMembers = onlineUsers.filter(user => 
    currentRoom.users?.includes(user.id)
  );

  const handleRemoveMember = (memberId: string) => {
    if (isCreator && memberId !== currentRoom.createdBy) {
      removeMember(currentRoom.id, memberId);
      toast({
        title: "Member removed",
        description: "The member has been removed from this room",
        duration: 3000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-semibold">
            <Users className="h-5 w-5 mr-2 text-violet-500" />
            Room Members ({roomMembers.length})
          </DialogTitle>
        </DialogHeader>

        <div className="my-4">
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-2 space-y-1">
              {roomMembers.length > 0 ? (
                roomMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={member.username} 
                        src={member.avatar}
                        size="sm"
                        status={member.lastActive > Date.now() - 300000 ? "online" : "offline"}
                      />
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium">{member.username}</p>
                          {member.id === currentRoom.createdBy && (
                            <Crown className="h-3 w-3 ml-1 text-amber-500" aria-label="Room Creator" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {member.lastActive > Date.now() - 300000 
                            ? "Online" 
                            : `Last active ${formatDistanceToNow(member.lastActive)} ago`}
                        </p>
                      </div>
                    </div>
                    {isCreator && member.id !== currentRoom.createdBy && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No members found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembersList;
