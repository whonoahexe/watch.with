import { Socket, Server as IOServer } from 'socket.io';
import { SocketData } from '../types';
import type { SocketEvents } from '../types';
import {
  RoomActionDataSchema,
  VoiceOfferDataSchema,
  VoiceAnswerDataSchema,
  VoiceIceCandidateDataSchema,
} from '@/types/schemas';

// In-memory voice participant tracking per room for MVP
const roomIdToVoiceParticipants: Map<string, Set<string>> = new Map();

function getOrCreateRoomSet(roomId: string): Set<string> {
  let set = roomIdToVoiceParticipants.get(roomId);
  if (!set) {
    set = new Set<string>();
    roomIdToVoiceParticipants.set(roomId, set);
  }
  return set;
}

export function registerVoiceHandlers(socket: Socket<SocketEvents, SocketEvents, object, SocketData>, io: IOServer) {
  // Join voice chat
  socket.on('voice-join', async data => {
    try {
      const validated = RoomActionDataSchema.safeParse(data);
      if (!validated.success) return;
      const { roomId } = validated.data;

      if (!socket.data.userId) {
        socket.emit('voice-error', { error: 'Not authenticated' });
        return;
      }

      const participants = getOrCreateRoomSet(roomId);
      if (!participants.has(socket.data.userId)) {
        if (participants.size >= 5) {
          socket.emit('voice-error', { error: 'Voice chat is limited to 5 participants.' });
          return;
        }
        participants.add(socket.data.userId);
      }

      // Notify existing participants in the room (except the joiner)
      socket.to(roomId).emit('voice-peer-joined', { userId: socket.data.userId });

      // Send back the current participants list to the joiner
      socket.emit('voice-participants', { userIds: Array.from(participants) });
    } catch (err) {
      socket.emit('voice-error', { error: 'Failed to join voice' });
    }
  });

  // Leave voice chat
  socket.on('voice-leave', async data => {
    try {
      const validated = RoomActionDataSchema.safeParse(data);
      if (!validated.success) return;
      const { roomId } = validated.data;
      if (!socket.data.userId) return;

      const participants = getOrCreateRoomSet(roomId);
      if (participants.delete(socket.data.userId)) {
        socket.to(roomId).emit('voice-peer-left', { userId: socket.data.userId });
      }
    } catch {
      // noop
    }
  });

  // Relay SDP offer
  socket.on('voice-offer', data => {
    const parsed = VoiceOfferDataSchema.safeParse(data);
    if (!parsed.success) {
      return;
    }
    const { roomId, targetUserId, sdp } = parsed.data;
    if (!socket.data.userId) return;
    // Broadcast within room; clients will filter by targetUserId
    socket.to(roomId).emit('voice-offer', {
      fromUserId: socket.data.userId,
      targetUserId,
      sdp,
    });
  });

  // Relay SDP answer
  socket.on('voice-answer', data => {
    const parsed = VoiceAnswerDataSchema.safeParse(data);
    if (!parsed.success) {
      return;
    }
    const { roomId, targetUserId, sdp } = parsed.data;
    if (!socket.data.userId) return;
    socket.to(roomId).emit('voice-answer', {
      fromUserId: socket.data.userId,
      targetUserId,
      sdp,
    });
  });

  // Relay ICE candidates
  socket.on('voice-ice-candidate', data => {
    const parsed = VoiceIceCandidateDataSchema.safeParse(data);
    if (!parsed.success) {
      return;
    }
    const { roomId, targetUserId, candidate } = parsed.data;
    if (!socket.data.userId) return;
    socket.to(roomId).emit('voice-ice-candidate', {
      fromUserId: socket.data.userId,
      targetUserId,
      candidate,
    });
  });

  // Cleanup on room leave or disconnect is handled by room handler; we also listen here to drop from sets
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (!roomId || !userId) return;
    const participants = roomIdToVoiceParticipants.get(roomId);
    if (participants && participants.delete(userId)) {
      socket.to(roomId).emit('voice-peer-left', { userId });
    }
  });
}

export { roomIdToVoiceParticipants };
