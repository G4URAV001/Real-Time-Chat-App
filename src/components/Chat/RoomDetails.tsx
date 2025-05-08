import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Dialog as DialogNoClose, DialogContentNoClose, DialogHeader as DialogHeaderNoClose, DialogTitle as DialogTitleNoClose, DialogDescription as DialogDescriptionNoClose, DialogFooter as DialogFooterNoClose } from '@/components/ui/dialog-no-close';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/UI/Avatar';
import { Copy, Users, Lock, Crown, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import axios from 'axios';

interface RoomDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberInfo {
  id: string;
  username: string;
  online: boolean;
  avatar?: string | null;
  isCurrentUser?: boolean;
  isCreator?: boolean;
}

const RoomDetails = ({ open, onOpenChange }: RoomDetailsProps) => {
  const { currentRoom, leaveRoom, generateNewInviteCode, removeMember, onlineUsers } = useChat();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [creatorName, setCreatorName] = useState<string>('Room Creator');
  const [roomMembers, setRoomMembers] = useState<MemberInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Room editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  
  // Room deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  
  // Check if current user is the creator
  const isCreator = useMemo(() => {
    if (!currentRoom || !currentUser) return false;
    
    const creatorId = typeof currentRoom.createdBy === 'object' ? 
                    (currentRoom.createdBy as any)._id : currentRoom.createdBy;
    return currentUser.id === creatorId;
  }, [currentRoom, currentUser]);

  // Fetch room members with usernames
  useEffect(() => {
    if (!currentRoom || !open) return;
    
    console.log('Current room data:', currentRoom);
    console.log('Creator ID:', currentRoom.createdBy);
    
    const fetchRoomMembers = async () => {
      try {
        setIsLoading(true);
        
        // Handle creator info - check if createdBy is an object or string
        if (typeof currentRoom.createdBy === 'object' && currentRoom.createdBy !== null) {
          // Creator info is already embedded in the room object
          console.log('Creator info is embedded in room object');
          const creatorObject = currentRoom.createdBy as any;
          const creatorName = creatorObject.username || `${currentRoom.name} Creator`;
          console.log('Setting creator name from embedded data:', creatorName);
          setCreatorName(creatorName);
        } else if (currentRoom.createdBy === currentUser?.id) {
          // Current user is the creator
          console.log('Current user is the creator');
          setCreatorName(currentUser.username || 'You');
        } else {
          // Creator ID is a string, try to find creator info
          console.log('Attempting to find creator name for ID:', currentRoom.createdBy);
          // Try to find creator in online users
          const creator = onlineUsers.find(user => user.id === currentRoom.createdBy);
          console.log('Online users:', onlineUsers);
          
          if (creator) {
            console.log('Found creator in online users:', creator);
            setCreatorName(creator.username);
          } else {
            console.log('Creator not found in online users, fetching from API');
            // Fetch creator info from API
            try {
              const token = localStorage.getItem('chatToken');
              // Get API base URL from environment or use default
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const creatorId = typeof currentRoom.createdBy === 'string' ? currentRoom.createdBy : 
                               (currentRoom.createdBy as any)?._id || 'unknown';
              const apiUrl = `${API_BASE_URL}/users/${creatorId}`;
              console.log('Fetching creator from API:', apiUrl);
              
              const response = await axios.get(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              console.log('API response for creator:', response.data);
              
              if (response.data && response.data.user) {
                console.log('Setting creator name from API:', response.data.user.username);
                setCreatorName(response.data.user.username);
              } else {
                console.log('No user data in API response, using fallback');
                setCreatorName(`${currentRoom.name} Creator`);
              }
            } catch (error) {
              console.error('Failed to fetch creator info:', error);
              setCreatorName(`${currentRoom.name} Creator`);
            }
          }
        }
        
        // Get member IDs from context - handle both string IDs and object members
        let memberIds: any[] = [];
        if (Array.isArray(currentRoom.members)) {
          memberIds = currentRoom.members.map(member => {
            // Check if member is an object or string
            if (typeof member === 'object' && member !== null) {
              // Extract member info directly
              const memberId = (member as any)._id || (member as any).id;
              console.log('Member is an object:', member, 'extracted ID:', memberId);
              return {
                id: memberId,
                userData: member
              };
            } else {
              // Member is just an ID string
              return {
                id: member,
                userData: null
              };
            }
          });
        }
        console.log('Processed member IDs from context:', memberIds);
        
        if (memberIds.length === 0) return;
        
        // Create a map to track which members we've processed
        const processedMembers = new Map<string, MemberInfo>();
        
        // First, add members that already have embedded user data
        memberIds.forEach(memberInfo => {
          if (memberInfo.userData) {
            const userData = memberInfo.userData;
            const memberId = memberInfo.id;
            processedMembers.set(memberId, {
              id: memberId,
              username: userData.username || `Member ${memberId.substring(0, 4)}`,
              online: userData.status === 'online',
              avatar: userData.avatar,
              isCurrentUser: memberId === currentUser?.id,
              isCreator: memberId === (typeof currentRoom.createdBy === 'object' ? 
                                      (currentRoom.createdBy as any)._id : currentRoom.createdBy)
            });
          }
        });
        
        // Next, add current user if they're a member and not already processed
        if (currentUser) {
          const currentUserMember = memberIds.find(m => m.id === currentUser.id);
          if (currentUserMember && !processedMembers.has(currentUser.id)) {
            processedMembers.set(currentUser.id, {
              id: currentUser.id,
              username: currentUser.username || 'You',
              online: true,
              avatar: currentUser.avatar,
              isCurrentUser: true,
              isCreator: currentUser.id === (typeof currentRoom.createdBy === 'object' ? 
                                           (currentRoom.createdBy as any)._id : currentRoom.createdBy)
            });
          }
        }
        
        // Next, add any online users that are members
        onlineUsers.forEach(user => {
          const memberEntry = memberIds.find(m => m.id === user.id);
          if (memberEntry && !processedMembers.has(user.id)) {
            processedMembers.set(user.id, {
              id: user.id,
              username: user.username,
              online: user.status === 'online',
              avatar: user.avatar,
              isCreator: user.id === (typeof currentRoom.createdBy === 'object' ? 
                                    (currentRoom.createdBy as any)._id : currentRoom.createdBy)
            });
          }
        });
        
        // For any remaining members, fetch their info from the API
        const remainingMemberIds = memberIds.filter(m => !processedMembers.has(m.id));
        
        if (remainingMemberIds.length > 0) {
          console.log('Fetching remaining member info from API:', remainingMemberIds);
          
          try {
            const token = localStorage.getItem('chatToken');
            // Get API base URL from environment or use default
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            
            // Fetch each member's info
            const memberPromises = remainingMemberIds.map(async (memberInfo) => {
              try {
                const apiUrl = `${API_BASE_URL}/users/${memberInfo.id}`;
                const response = await axios.get(apiUrl, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (response.data && response.data.user) {
                  const userData = response.data.user;
                  processedMembers.set(memberInfo.id, {
                    id: memberInfo.id,
                    username: userData.username || `Member ${memberInfo.id.substring(0, 4)}`,
                    online: userData.status === 'online',
                    avatar: userData.avatar,
                    isCreator: memberInfo.id === (typeof currentRoom.createdBy === 'object' ? 
                                                (currentRoom.createdBy as any)._id : currentRoom.createdBy)
                  });
                }
              } catch (error) {
                console.error(`Failed to fetch info for member ${memberInfo.id}:`, error);
                // Add a placeholder for the member
                processedMembers.set(memberInfo.id, {
                  id: memberInfo.id,
                  username: `Member ${memberInfo.id.substring(0, 4)}`,
                  online: false,
                  isCreator: memberInfo.id === (typeof currentRoom.createdBy === 'object' ? 
                                              (currentRoom.createdBy as any)._id : currentRoom.createdBy)
                });
              }
            });
            
            await Promise.all(memberPromises);
          } catch (error) {
            console.error('Failed to fetch member info:', error);
          }
        }
        
        // Convert the map to an array and sort it
        const membersList = Array.from(processedMembers.values());
        
        // Sort members: creator first, then current user, then online users, then alphabetically
        const sortedMembers = membersList.sort((a, b) => {
          if (a.isCreator && !b.isCreator) return -1;
          if (!a.isCreator && b.isCreator) return 1;
          if (a.isCurrentUser && !b.isCurrentUser) return -1;
          if (!a.isCurrentUser && b.isCurrentUser) return 1;
          if (a.online && !b.online) return -1;
          if (!a.online && b.online) return 1;
          return a.username.localeCompare(b.username);
        });
        
        console.log('Final sorted members list:', sortedMembers);
        setRoomMembers(sortedMembers);
      } catch (error) {
        console.error('Error fetching room members:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoomMembers();
  }, [currentRoom, open, currentUser, onlineUsers]);
  
  // Set initial values for editing
  useEffect(() => {
    if (currentRoom && isEditing) {
      setEditedName(currentRoom.name);
      setEditedDescription(currentRoom.description || '');
    }
  }, [currentRoom, isEditing]);
  
  const handleStartEditing = () => {
    if (!currentRoom) return;
    
    setEditedName(currentRoom.name);
    setEditedDescription(currentRoom.description || '');
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleSaveEdit = async () => {
    if (!currentRoom || !editedName.trim()) return;
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('chatToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get API base URL from environment or use default
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await axios.put(
        `${API_BASE_URL}/rooms/${currentRoom._id}`,
        {
          name: editedName,
          description: editedDescription
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Room updated:', response.data);
      
      // Update room in context
      // This would typically be handled by the context itself via a websocket event
      // But for immediate feedback, we can update the UI directly
      if (response.data && response.data.room) {
        // Ideally, the context would have an updateRoom method
        // For now, we'll just close the edit mode and let the next data fetch update it
        toast({
          title: 'Success',
          description: 'Room updated successfully'
        });
      }
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Update room error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update room',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteRoom = async () => {
    if (!currentRoom) return;
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('chatToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get API base URL from environment or use default
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.delete(
        `${API_BASE_URL}/rooms/${currentRoom._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast({
        title: 'Success',
        description: 'Room deleted successfully'
      });
      
      // Close the dialogs
      setDeleteDialogOpen(false);
      onOpenChange(false);
      
      // The context should handle removing the room from the list
      // This would typically happen via a websocket event
    } catch (error: any) {
      console.error('Delete room error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete room',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    
    try {
      setIsLoading(true);
      
      // Use the leaveRoom function from context
      await leaveRoom(currentRoom._id);
      
      toast({
        title: 'Success',
        description: 'You have left the room'
      });
      
      // Close the dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error('Leave room error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave room',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!currentRoom) return;
    
    try {
      setIsLoading(true);
      
      // Use the removeMember function from context
      await removeMember(currentRoom._id, memberId);
      
      toast({
        title: 'Success',
        description: 'Member removed from room'
      });
      
      // Update the local state to reflect the change
      setRoomMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (error: any) {
      console.error('Remove member error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateNewInviteCode = async () => {
    if (!currentRoom) return;
    
    try {
      setIsLoading(true);
      
      // Use the generateNewInviteCode function from context
      await generateNewInviteCode(currentRoom._id);
      
      toast({
        title: 'Success',
        description: 'New invite code generated'
      });
    } catch (error: any) {
      console.error('Generate invite code error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate new invite code',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyInviteCode = () => {
    if (currentRoom && currentRoom.inviteCode) {
      navigator.clipboard.writeText(currentRoom.inviteCode);
      toast({
        title: 'Copied!',
        description: 'Invite code copied to clipboard'
      });
    }
  };

  if (!currentRoom) return null;

  const isPrivate = currentRoom.isPrivate;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <DialogTitle>{currentRoom.name}</DialogTitle>
                <Badge variant={isPrivate ? 'outline' : 'secondary'}>
                  {isPrivate ? 'Private' : 'Public'}
                </Badge>
              </div>
              
              {isCreator && !isEditing && (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleStartEditing}
                    title="Edit Room"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                    title="Delete Room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>
              {currentRoom.description || `Private discussion for ${currentRoom.name}`}
            </DialogDescription>
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter room name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-description">Description</Label>
                <Textarea
                  id="room-description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Enter room description"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isLoading || !editedName.trim()}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="text-sm font-medium">Room Information</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Created by:</span>
                    <span className="text-sm text-violet-700 dark:text-violet-300">{creatorName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm text-primary">
                      {isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                  
                  {isPrivate && currentRoom.inviteCode && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Invite Code:</span>
                      <div className="flex items-center gap-2 bg-background p-2 rounded-md">
                        <code className="text-sm text-primary">{currentRoom.inviteCode}</code>
                        <button 
                          onClick={copyInviteCode} 
                          className="p-1 hover:bg-muted rounded"
                          aria-label="Copy invite code"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {isCreator && isPrivate && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateNewInviteCode}
                    className="mt-2 text-xs"
                    disabled={isLoading}
                  >
                    Generate New Invite Code
                  </Button>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Members ({roomMembers.length})
                  </h3>
                  
                  {!isCreator && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLeaveRoom}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Leave Room
                    </Button>
                  )}
                </div>
                
                <ScrollArea className="h-[200px] rounded-md border">
                  {roomMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          name={member.username} 
                          src={member.avatar || ''} 
                          status={member.online ? 'online' : 'offline'}
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">
                              {member.username}
                              {member.isCurrentUser && ' (You)'}
                            </span>
                            {member.isCreator && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {member.online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Edit Room Dialog with No Close Button */}
      <DialogNoClose open={isEditing}>
        <DialogContentNoClose className="max-w-md">
          <DialogHeaderNoClose>
            <DialogTitleNoClose>Edit Room</DialogTitleNoClose>
            <DialogDescriptionNoClose>
              Update room details
            </DialogDescriptionNoClose>
          </DialogHeaderNoClose>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name-edit">Room Name</Label>
              <Input
                id="room-name-edit"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter room name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-description-edit">Description</Label>
              <Textarea
                id="room-description-edit"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Enter room description"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading || !editedName.trim()}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContentNoClose>
      </DialogNoClose>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room
              and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRoom} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RoomDetails;
