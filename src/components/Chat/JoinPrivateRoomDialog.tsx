
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface JoinPrivateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinRoom: (inviteCode: string) => void;
}

const JoinPrivateRoomDialog: React.FC<JoinPrivateRoomDialogProps> = ({
  open,
  onOpenChange,
  onJoinRoom
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const { toast } = useToast();

  const handleJoinRoom = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invite code is required",
        description: "Please enter a valid invite code to join the room.",
        variant: "destructive"
      });
      return;
    }

    onJoinRoom(inviteCode);
    setInviteCode('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">Join a Private Room</DialogTitle>
          <DialogDescription>
            Enter an invite code to join a private room.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="grid gap-2">
            <label htmlFor="invite-code" className="text-sm font-medium">Invite Code</label>
            <Input
              id="invite-code"
              placeholder="Enter the room invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="border-violet-100 focus:border-violet-300"
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinRoom}
            className="flex-1 sm:flex-none bg-violet-400 hover:bg-violet-500"
          >
            Join Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinPrivateRoomDialog;
