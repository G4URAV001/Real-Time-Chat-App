import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Avatar from '@/components/UI/Avatar';
import { User, Settings, LogOut } from 'lucide-react';
import api from '@/utils/api';

const ProfileMenu: React.FC = () => {
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const { toast } = useToast();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [username, setUsername] = useState(currentUser?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleOpenProfileDialog = () => {
    setUsername(currentUser?.username || '');
    setPassword('');
    setConfirmPassword('');
    setIsProfileDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    // Validate input
    if (!username.trim()) {
      toast({
        title: 'Error',
        description: 'Username is required',
        variant: 'destructive'
      });
      return;
    }

    if (password && password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create update data object
      const updateData: { username?: string; password?: string } = {};
      
      if (username !== currentUser?.username) {
        updateData.username = username;
      }
      
      if (password) {
        updateData.password = password;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length > 0) {
        console.log('Making profile update request with data:', updateData);
        
        // Use the API utility to update the profile
        const response = await api.users.updateProfile(updateData) as { message: string; user: { id: string; username: string; email: string; avatar?: string; status?: string } };
        console.log('Profile update response:', response);

        // Update the current user in context
        if (response.user) {
          updateCurrentUser(response.user);
          
          // Update local state to reflect changes
          setUsername(response.user.username || username);
        }

        toast({
          title: 'Success',
          description: 'Profile updated successfully'
        });
        
        // Reset password fields
        setPassword('');
        setConfirmPassword('');
        setShowPasswordFields(false);
      }

      setIsProfileDialogOpen(false);
    } catch (error: any) {
      console.error('Update profile error:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 overflow-hidden">
            <Avatar 
              name={currentUser?.username || 'User'} 
              src={currentUser?.avatar || ''} 
              size="sm"
              status={currentUser?.status as 'online' | 'offline' | 'away' | 'busy' || 'online'}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{currentUser?.username}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>
          <DropdownMenuItem onClick={handleOpenProfileDialog}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <div className="relative h-24 w-24 rounded-full overflow-hidden">
              <Avatar 
                name={currentUser?.username || 'User'} 
                src={currentUser?.avatar || ''} 
                size="lg"
                status={currentUser?.status as 'online' | 'offline' | 'away' | 'busy' || 'online'}
              />
            </div>
          </div>
          
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={currentUser?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm font-medium">Password</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="text-xs"
              >
                {showPasswordFields ? 'Hide Password Fields' : 'Change Password'}
              </Button>
            </div>
            
            {showPasswordFields && (
              <div className="space-y-3 mt-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                <div className="grid gap-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileMenu;
