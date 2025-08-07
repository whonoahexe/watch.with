import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceUserUpdate } from '@/types';
import { AudioUnlock } from './audio-unlock';

interface VoiceChatControlsProps {
  isVoiceEnabled: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isConnecting: boolean;
  voiceUsers: VoiceUserUpdate[];
  needsAudioUnlock: boolean;
  onToggleVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onUnlockAudio: () => void;
  maxVoiceUsers: number;
}

export function VoiceChatControls({
  isVoiceEnabled,
  isMuted,
  isDeafened,
  isConnecting,
  voiceUsers,
  needsAudioUnlock,
  onToggleVoice,
  onToggleMute,
  onToggleDeafen,
  onUnlockAudio,
  maxVoiceUsers,
}: VoiceChatControlsProps) {
  const activeVoiceUsers = voiceUsers.filter(user => user.voiceEnabled);
  const isVoiceFull = activeVoiceUsers.length >= maxVoiceUsers;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Audio Unlock Banner */}
        {needsAudioUnlock && <AudioUnlock onUnlock={onUnlockAudio} />}

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="font-medium">Voice Chat</span>
            <Badge variant="outline">
              {activeVoiceUsers.length}/{maxVoiceUsers}
            </Badge>
          </div>

          {isVoiceFull && !isVoiceEnabled && (
            <Badge variant="destructive" className="text-xs">
              Voice chat full
            </Badge>
          )}
        </div>

        {/* Voice Control Buttons */}
        <div className="mb-4 flex gap-2">
          <Button
            onClick={onToggleVoice}
            disabled={isConnecting || (isVoiceFull && !isVoiceEnabled)}
            variant={isVoiceEnabled ? 'destructive' : 'default'}
            size="sm"
            className="flex-1"
          >
            {isConnecting ? (
              <div className="animate-pulse">Connecting...</div>
            ) : isVoiceEnabled ? (
              <>
                <PhoneOff className="mr-2 h-4 w-4" />
                Leave Voice
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Join Voice
              </>
            )}
          </Button>
        </div>

        {/* Audio Controls (only when voice is enabled) */}
        {isVoiceEnabled && (
          <div className="mb-4 flex gap-2">
            <Button onClick={onToggleMute} variant={isMuted ? 'destructive' : 'secondary'} size="sm" className="flex-1">
              {isMuted ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Mute
                </>
              )}
            </Button>

            <Button
              onClick={onToggleDeafen}
              variant={isDeafened ? 'destructive' : 'secondary'}
              size="sm"
              className="flex-1"
            >
              {isDeafened ? (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Undeafen
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Deafen
                </>
              )}
            </Button>
          </div>
        )}

        {/* Voice Users List */}
        {activeVoiceUsers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">In Voice Chat:</div>
            <div className="space-y-1">
              {activeVoiceUsers.map(user => (
                <div key={user.userId} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {user.isMuted ? (
                        <MicOff className="h-3 w-3 text-destructive" />
                      ) : (
                        <Mic className="h-3 w-3 text-green-500" />
                      )}
                      {user.isDeafened && <VolumeX className="h-3 w-3 text-destructive" />}
                    </div>
                    <span className="text-sm">{user.userName}</span>
                  </div>

                  {/* Voice level indicator (placeholder for future) */}
                  <div className="h-2 w-12 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: '0%' }} // Will be dynamic when voice levels are implemented
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info text */}
        <div className="mt-3 text-xs text-muted-foreground">
          {isVoiceEnabled
            ? 'Voice chat uses peer-to-peer connections for ultra-low latency.'
            : isVoiceFull
              ? `Voice chat is limited to ${maxVoiceUsers} users for optimal quality.`
              : 'Join voice chat to talk with other users in real-time.'}
        </div>
      </CardContent>
    </Card>
  );
}
