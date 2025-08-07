import { Server, Socket } from 'socket.io';
import { RoomRepository } from '../../redis/handlers/room';
import { VoiceChatToggle, VoiceControl, WebRTCSignaling, User } from '../../../types';

const MAX_VOICE_USERS = 5;
const roomRepository = RoomRepository.getInstance();

export function handleVoiceChat(socket: Socket, io: Server) {
  // Toggle voice chat for a user
  socket.on('voice-chat-toggle', async ({ roomId, enabled }: VoiceChatToggle) => {
    try {
      console.log(`🎤 Voice chat toggle - Room: ${roomId}, User: ${socket.data.userId}, Enabled: ${enabled}`);

      const room = await roomRepository.getRoom(roomId);
      if (!room) {
        socket.emit('error', { error: 'Room not found' });
        return;
      }

      const user = room.users.find((u: User) => u.id === socket.data.userId);
      if (!user) {
        socket.emit('error', { error: 'User not found in room' });
        return;
      }

      // Check voice user limit when enabling
      if (enabled) {
        const currentVoiceUsers = room.users.filter((u: User) => u.voiceEnabled).length;
        if (currentVoiceUsers >= MAX_VOICE_USERS) {
          socket.emit('error', {
            error: `Voice chat is limited to ${MAX_VOICE_USERS} users. Please wait for someone to leave voice chat.`,
          });
          return;
        }
      }

      // Update user's voice status
      const updatedUsers = room.users.map((u: User) => {
        if (u.id === socket.data.userId) {
          return {
            ...u,
            voiceEnabled: enabled,
            isMuted: enabled ? u.isMuted : false,
            isDeafened: enabled ? u.isDeafened : false,
          };
        }
        return u;
      });

      // Update room in Redis
      const updatedRoom = {
        ...room,
        users: updatedUsers,
        voiceChatEnabled: updatedUsers.some((u: User) => u.voiceEnabled), // Enable room voice if any user has voice
      };

      await roomRepository.updateRoom(roomId, updatedRoom);

      // Notify all users in the room about the voice user update
      const updatedUser = updatedUsers.find((u: User) => u.id === socket.data.userId)!;
      io.to(roomId).emit('voice-user-update', {
        userId: updatedUser.id,
        userName: updatedUser.name,
        voiceEnabled: updatedUser.voiceEnabled,
        isMuted: updatedUser.isMuted,
        isDeafened: updatedUser.isDeafened,
      });

      // Notify about voice chat being enabled/disabled for the room
      io.to(roomId).emit('voice-chat-enabled', {
        roomId,
        enabled: updatedRoom.voiceChatEnabled,
      });
    } catch (error) {
      console.error('❌ Error toggling voice chat:', error);
      socket.emit('error', { error: 'Failed to toggle voice chat' });
    }
  });

  // Handle voice controls (mute, unmute, deafen, undeafen)
  socket.on('voice-control', async ({ roomId, action }: VoiceControl) => {
    try {
      console.log(`🎛️ Voice control - Room: ${roomId}, User: ${socket.data.userId}, Action: ${action}`);

      const room = await roomRepository.getRoom(roomId);
      if (!room) {
        socket.emit('error', { error: 'Room not found' });
        return;
      }

      const user = room.users.find((u: User) => u.id === socket.data.userId);
      if (!user || !user.voiceEnabled) {
        socket.emit('error', { error: 'Voice chat not enabled for user' });
        return;
      }

      // Update user's voice control status
      const updatedUsers = room.users.map((u: User) => {
        if (u.id === socket.data.userId) {
          switch (action) {
            case 'mute':
              return { ...u, isMuted: true };
            case 'unmute':
              return { ...u, isMuted: false };
            case 'deafen':
              return { ...u, isDeafened: true };
            case 'undeafen':
              return { ...u, isDeafened: false };
            default:
              return u;
          }
        }
        return u;
      });

      // Update room in Redis
      const updatedRoom = { ...room, users: updatedUsers };
      await roomRepository.updateRoom(roomId, updatedRoom);

      // Notify all users about the voice status change
      const updatedUser = updatedUsers.find((u: User) => u.id === socket.data.userId)!;
      io.to(roomId).emit('voice-user-update', {
        userId: updatedUser.id,
        userName: updatedUser.name,
        voiceEnabled: updatedUser.voiceEnabled,
        isMuted: updatedUser.isMuted,
        isDeafened: updatedUser.isDeafened,
      });
    } catch (error) {
      console.error('❌ Error handling voice control:', error);
      socket.emit('error', { error: 'Failed to update voice control' });
    }
  });

  // Handle WebRTC signaling
  socket.on('webrtc-signaling', async ({ roomId, targetUserId, type, data }: WebRTCSignaling) => {
    try {
      console.log(
        `📡 WebRTC signaling - Room: ${roomId}, From: ${socket.data.userId}, To: ${targetUserId}, Type: ${type}`
      );

      const room = await roomRepository.getRoom(roomId);
      if (!room) {
        socket.emit('error', { error: 'Room not found' });
        return;
      }

      // Verify both users are in the room and have voice enabled
      const fromUser = room.users.find((u: User) => u.id === socket.data.userId);
      const targetUser = room.users.find((u: User) => u.id === targetUserId);

      if (!fromUser || !targetUser) {
        socket.emit('error', { error: 'User not found in room' });
        return;
      }

      if (!fromUser.voiceEnabled || !targetUser.voiceEnabled) {
        socket.emit('error', { error: 'Voice chat not enabled for one or both users' });
        return;
      }

      // Find target user's socket and forward the signaling data
      const targetSockets = await io.in(roomId).fetchSockets();
      const targetSocket = targetSockets.find(s => s.data.userId === targetUserId);

      if (targetSocket) {
        targetSocket.emit('webrtc-signaling', {
          targetUserId: socket.data.userId, // From the sender's perspective
          type,
          data,
        });
        console.log(`✅ Forwarded ${type} to ${targetUserId}`);
      } else {
        console.log(`⚠️ Target user ${targetUserId} not found in room sockets`);
      }
    } catch (error) {
      console.error('❌ Error handling WebRTC signaling:', error);
      socket.emit('error', { error: 'Failed to handle WebRTC signaling' });
    }
  });

  // Handle disconnection - clean up voice chat
  socket.on('disconnect', async () => {
    try {
      const userId = socket.data.userId;
      const roomId = socket.data.roomId;

      if (!userId || !roomId) return;

      console.log(`🔌 User disconnected - cleaning up voice chat: ${userId}`);

      const room = await roomRepository.getRoom(roomId);
      if (!room) return;

      const user = room.users.find((u: User) => u.id === userId);
      if (!user || !user.voiceEnabled) return;

      // Update user to disable voice
      const updatedUsers = room.users.map((u: User) => {
        if (u.id === userId) {
          return {
            ...u,
            voiceEnabled: false,
            isMuted: false,
            isDeafened: false,
          };
        }
        return u;
      });

      // Update room
      const updatedRoom = {
        ...room,
        users: updatedUsers,
        voiceChatEnabled: updatedUsers.some((u: User) => u.voiceEnabled),
      };

      await roomRepository.updateRoom(roomId, updatedRoom);

      // Notify remaining users
      socket.to(roomId).emit('voice-user-update', {
        userId: user.id,
        userName: user.name,
        voiceEnabled: false,
        isMuted: false,
        isDeafened: false,
      });

      socket.to(roomId).emit('voice-chat-enabled', {
        roomId,
        enabled: updatedRoom.voiceChatEnabled,
      });
    } catch (error) {
      console.error('❌ Error cleaning up voice chat on disconnect:', error);
    }
  });
}
