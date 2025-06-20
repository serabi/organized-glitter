import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AccountSettingsProps {
  loading: boolean;
  email?: string;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  userId?: string;
}

const AccountSettings = ({
  loading: profileLoading,
  email,
  name,
  setName,
  userId,
}: AccountSettingsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Username update state
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(name);
  const [usernameUpdateLoading, setUsernameUpdateLoading] = useState(false);

  if (profileLoading) {
    return (
      <div className="dark:glass-card mt-8 rounded-lg border border-border bg-card text-card-foreground shadow">
        <div className="border-b border-border p-6">
          <h2 className="text-xl font-semibold">Account Settings</h2>
          <p className="text-muted-foreground">
            Update your email, password and manage your account
          </p>
        </div>
        <div className="p-6 text-center">
          <p className="text-lg font-medium text-muted-foreground">Loading account details...</p>
          {/* Optional: Add a spinner component here if available */}
          {/* e.g., <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-4"></div> */}
        </div>
      </div>
    );
  }

  // Handle username update
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !newUsername.trim()) {
      toast({
        title: 'Error',
        description: 'Username cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setUsernameUpdateLoading(true);

    try {
      // Check if username already exists (except for current user)
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `username = "${newUsername}" && id != "${userId}"`,
      });

      if (existingUsers.items.length > 0) {
        toast({
          title: 'Username already taken',
          description: 'Please choose a different username',
          variant: 'destructive',
        });
        return;
      }

      // Update username in PocketBase
      await pb.collection('users').update(userId, { username: newUsername });

      setName(newUsername);
      setIsUsernameDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Your username has been updated',
      });
    } catch (error) {
      console.error('Error updating username:', error);

      toast({
        title: 'Error',
        description: 'Something went wrong while updating your profile',
        variant: 'destructive',
      });
    } finally {
      setUsernameUpdateLoading(false);
    }
  };

  return (
    <div className="dark:glass-card mt-8 rounded-lg border border-border bg-card text-card-foreground shadow">
      <div className="border-b border-border p-6">
        <h2 className="text-xl font-semibold">Account Settings</h2>
        <p className="text-muted-foreground">Update your email, password and manage your account</p>
      </div>

      <div className="p-6">
        <div className="grid gap-8">
          {/* Account Settings Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Username Section */}
            <div className="rounded-lg border border-border bg-background/50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 flex items-center text-lg font-medium">
                    <User className="mr-2 h-5 w-5 text-primary" />
                    Username
                  </h3>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Current username: <span className="font-medium">{name}</span>
                  </p>
                </div>

                <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                      Change Username
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Update Username</DialogTitle>
                      <DialogDescription>
                        Enter your new username. This will be visible to other users.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateUsername} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-username">New Username</Label>
                        <Input
                          id="new-username"
                          type="text"
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="Enter your new username"
                          required
                        />
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={usernameUpdateLoading}>
                          {usernameUpdateLoading ? 'Updating...' : 'Update Username'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Email Section */}
            <div className="rounded-lg border border-border bg-background/50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 flex items-center text-lg font-medium">
                    <Mail className="mr-2 h-5 w-5 text-primary" />
                    Email Address
                  </h3>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Current email:{' '}
                    <span className="font-medium">{email || user?.email || 'Not available'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Change your email address with secure verification
                  </p>
                </div>

                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link to="/change-email">Change Email</Link>
                </Button>
              </div>
            </div>

            {/* Password Section */}
            <div className="rounded-lg border border-border bg-background/50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 flex items-center text-lg font-medium">
                    <Lock className="mr-2 h-5 w-5 text-primary" />
                    Password
                  </h3>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Change your password to keep your account secure
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Update your password with enhanced security validation
                  </p>
                </div>

                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link to="/change-password">Change Password</Link>
                </Button>
              </div>
            </div>

            {/* Danger Zone Section */}
            <div className="rounded-lg border border-destructive/20 bg-background/50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 flex items-center text-lg font-medium text-destructive">
                    <Trash className="mr-2 h-5 w-5" />
                    Danger Zone
                  </h3>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>

                <Button variant="destructive" size="sm" className="shrink-0" asChild>
                  <Link to="/delete-account">Delete Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
