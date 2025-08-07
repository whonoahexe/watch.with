import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { VoiceUserUpdate } from '@/types';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface VoiceNotificationsProps {
  voiceUsers: VoiceUserUpdate[];
  currentUserId: string;
}

export function VoiceNotifications({ voiceUsers, currentUserId }: VoiceNotificationsProps) {
  const prevVoiceUsersRef = React.useRef<VoiceUserUpdate[]>([]);

  useEffect(() => {
    const prevUsers = prevVoiceUsersRef.current;
    const currentUsers = voiceUsers;

    // Check for users who joined voice
    const newVoiceUsers = currentUsers.filter(
      user =>
        user.voiceEnabled &&
        user.userId !== currentUserId &&
        !prevUsers.find(prev => prev.userId === user.userId && prev.voiceEnabled)
    );

    // Check for users who left voice
    const leftVoiceUsers = prevUsers.filter(
      prev =>
        prev.voiceEnabled &&
        prev.userId !== currentUserId &&
        !currentUsers.find(current => current.userId === prev.userId && current.voiceEnabled)
    );

    // Show join notifications
    newVoiceUsers.forEach(user => {
      toast.success(`${user.userName} joined voice chat`, {
        icon: <Phone className="h-4 w-4" />,
        duration: 3000,
      });
    });

    // Show leave notifications
    leftVoiceUsers.forEach(user => {
      toast.info(`${user.userName} left voice chat`, {
        icon: <PhoneOff className="h-4 w-4" />,
        duration: 3000,
      });
    });

    // Check for mute/unmute changes (only for current voice users)
    currentUsers.forEach(user => {
      if (!user.voiceEnabled || user.userId === currentUserId) return;

      const prevUser = prevUsers.find(prev => prev.userId === user.userId);
      if (!prevUser || !prevUser.voiceEnabled) return;

      // Mute status changed
      if (prevUser.isMuted !== user.isMuted) {
        if (user.isMuted) {
          toast(`${user.userName} muted`, {
            icon: <MicOff className="h-4 w-4" />,
            duration: 2000,
          });
        } else {
          toast(`${user.userName} unmuted`, {
            icon: <Mic className="h-4 w-4" />,
            duration: 2000,
          });
        }
      }
    });

    // Update previous users reference
    prevVoiceUsersRef.current = [...currentUsers];
  }, [voiceUsers, currentUserId]);

  // This component doesn't render anything
  return null;
}
