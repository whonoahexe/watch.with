'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './use-socket';

export interface UseVoiceChatOptions {
  roomId: string;
  currentUserId?: string;
}

export interface UseVoiceChatReturn {
  enabled: boolean;
  canEnable: boolean;
  toggleEnabled: () => Promise<void>;
  isMuted: boolean;
  toggleMute: () => void;
  peers: string[];
  error?: string;
}

type PeerConnectionBundle = {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useVoiceChat({ roomId, currentUserId }: UseVoiceChatOptions): UseVoiceChatReturn {
  const { socket } = useSocket();
  const [enabled, setEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnectionBundle>>(new Map());

  const rtcConfig = useMemo<RTCConfiguration>(() => ({ iceServers: ICE_SERVERS }), []);

  const cleanupPeer = useCallback((peerUserId: string) => {
    const bundle = peerConnectionsRef.current.get(peerUserId);
    if (!bundle) return;
    try {
      bundle.pc.ontrack = null;
      bundle.pc.onicecandidate = null;
      bundle.pc.onconnectionstatechange = null;
      bundle.pc.close();
    } catch {}
    bundle.audioEl.srcObject = null;
    bundle.audioEl.remove();
    peerConnectionsRef.current.delete(peerUserId);
    setPeers(prev => prev.filter(id => id !== peerUserId));
  }, []);

  const createPeerConnection = useCallback(
    (peerUserId: string): PeerConnectionBundle => {
      const pc = new RTCPeerConnection(rtcConfig);
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.setAttribute('data-peer-audio', peerUserId);
      document.body.appendChild(audioEl);

      pc.ontrack = event => {
        audioEl.srcObject = event.streams[0];
      };

      pc.onicecandidate = event => {
        if (event.candidate && socket) {
          socket.emit('voice-ice-candidate', {
            roomId,
            targetUserId: peerUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          cleanupPeer(peerUserId);
        }
      };

      // Add local audio track
      const localStream = localStreamRef.current;
      if (localStream) {
        for (const track of localStream.getAudioTracks()) {
          pc.addTrack(track, localStream);
        }
      }

      const bundle: PeerConnectionBundle = { pc, audioEl };
      peerConnectionsRef.current.set(peerUserId, bundle);
      setPeers(prev => (prev.includes(peerUserId) ? prev : [...prev, peerUserId]));
      return bundle;
    },
    [cleanupPeer, rtcConfig, roomId, socket]
  );

  const startLocalAudio = useCallback(async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
    } catch (e) {
      setError('Microphone permission denied or unavailable');
      throw e;
    }
  }, []);

  const startVoice = useCallback(async () => {
    if (!socket) return;
    await startLocalAudio();
    setEnabled(true);
    socket.emit('voice-join', { roomId });
  }, [roomId, socket, startLocalAudio]);

  const stopVoice = useCallback(async () => {
    if (!socket) return;
    socket.emit('voice-leave', { roomId });
    // cleanup peers
    for (const peerUserId of Array.from(peerConnectionsRef.current.keys())) {
      cleanupPeer(peerUserId);
    }
    // keep local stream but mute it; user can re-enable quickly
    setEnabled(false);
  }, [cleanupPeer, roomId, socket]);

  const toggleEnabled = useCallback(async () => {
    if (enabled) {
      await stopVoice();
    } else {
      await startVoice();
    }
  }, [enabled, startVoice, stopVoice]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach(t => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  const canEnable = peers.length < 5 || enabled; // allow disable any time

  // handle socket signaling
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onParticipants = ({ userIds }: { userIds: string[] }) => {
      // For each existing user, if not self, create an offer
      const others = userIds.filter(id => id !== currentUserId);
      // Create connections and generate offers
      Promise.all(
        others.map(async peerId => {
          const { pc } = createPeerConnection(peerId);
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          socket.emit('voice-offer', { roomId, targetUserId: peerId, sdp: offer });
        })
      ).catch(() => {});
    };

    const onPeerJoined = ({ userId }: { userId: string }) => {
      if (userId === currentUserId) return;
      // Avoid glare: existing participants do NOT proactively offer.
      // They will wait for the joiner's offer and respond with an answer.
    };

    const onPeerLeft = ({ userId }: { userId: string }) => {
      cleanupPeer(userId);
    };

    const onOffer = async ({
      fromUserId,
      targetUserId,
      sdp,
    }: {
      fromUserId?: string;
      targetUserId: string;
      sdp: any;
    }) => {
      if (targetUserId !== currentUserId) return;
      if (!fromUserId) return;
      let bundle = peerConnectionsRef.current.get(fromUserId);
      if (!bundle) {
        bundle = createPeerConnection(fromUserId);
      }
      const { pc } = bundle;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice-answer', { roomId, targetUserId: fromUserId, sdp: answer });
      } catch (e) {
        // Ignore invalid state (e.g., duplicate offers) for MVP
        console.warn('voice onOffer failed', e);
      }
    };

    const onAnswer = async ({
      fromUserId,
      targetUserId,
      sdp,
    }: {
      fromUserId?: string;
      targetUserId: string;
      sdp: any;
    }) => {
      if (targetUserId !== currentUserId) return;
      if (!fromUserId) return;
      const bundle = peerConnectionsRef.current.get(fromUserId);
      if (!bundle) return;
      const pc = bundle.pc;
      try {
        // Only accept answer when we have a local offer pending
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
      } catch (e) {
        console.warn('voice onAnswer failed', e);
      }
    };

    const onIceCandidate = async ({
      fromUserId,
      targetUserId,
      candidate,
    }: {
      fromUserId?: string;
      targetUserId: string;
      candidate: any;
    }) => {
      if (targetUserId !== currentUserId) return;
      if (!fromUserId) return;
      const bundle = peerConnectionsRef.current.get(fromUserId);
      if (!bundle) return;
      try {
        await bundle.pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
      } catch {}
    };

    const onVoiceError = ({ error }: { error: string }) => {
      setError(error);
    };

    socket.on('voice-participants', onParticipants);
    socket.on('voice-peer-joined', onPeerJoined);
    socket.on('voice-peer-left', onPeerLeft);
    socket.on('voice-offer', onOffer);
    socket.on('voice-answer', onAnswer);
    socket.on('voice-ice-candidate', onIceCandidate);
    socket.on('voice-error', onVoiceError);

    return () => {
      socket.off('voice-participants', onParticipants);
      socket.off('voice-peer-joined', onPeerJoined);
      socket.off('voice-peer-left', onPeerLeft);
      socket.off('voice-offer', onOffer);
      socket.off('voice-answer', onAnswer);
      socket.off('voice-ice-candidate', onIceCandidate);
      socket.off('voice-error', onVoiceError);
    };
  }, [cleanupPeer, createPeerConnection, currentUserId, roomId, socket]);

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      for (const peerUserId of Array.from(peerConnectionsRef.current.keys())) {
        cleanupPeer(peerUserId);
      }
      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        localStreamRef.current = null;
      }
    };
  }, [cleanupPeer]);

  return {
    enabled,
    canEnable,
    toggleEnabled,
    isMuted,
    toggleMute,
    peers,
    error,
  };
}
