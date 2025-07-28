'use client';

import { useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import type { SubtitleTrack } from '@/types/schemas';

interface UseSubtitlesOptions {
  roomId: string;
  isHost: boolean;
  currentSubtitleTracks: SubtitleTrack[];
  currentActiveTrack?: string;
}

interface UseSubtitlesReturn {
  // Actions
  addSubtitleTracks: (newTracks: SubtitleTrack[]) => void;
  removeSubtitleTrack: (trackId: string) => void;
  setActiveSubtitleTrack: (trackId?: string) => void;
  updateSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  updateSubtitleTracksAndActive: (tracks: SubtitleTrack[], activeTrackId?: string) => void;
}

export function useSubtitles({
  roomId,
  isHost,
  currentSubtitleTracks,
  currentActiveTrack,
}: UseSubtitlesOptions): UseSubtitlesReturn {
  const { socket, isConnected } = useSocket();

  // Core function to emit subtitle changes
  const emitSubtitleChange = useCallback(
    (tracks: SubtitleTrack[], activeTrackId?: string) => {
      if (!socket || !isConnected || !isHost) return;

      socket.emit('set-subtitles', {
        roomId,
        subtitleTracks: tracks,
        activeTrackId,
      });
    },
    [socket, isConnected, isHost, roomId]
  );

  // Add new subtitle tracks and optionally auto-select the first one
  const addSubtitleTracks = useCallback(
    (newTracks: SubtitleTrack[]) => {
      const updatedTracks = [...currentSubtitleTracks, ...newTracks];

      // Auto-select the first new track if no track is currently active
      const newActiveTrackId = !currentActiveTrack && newTracks.length > 0 ? newTracks[0].id : currentActiveTrack;

      emitSubtitleChange(updatedTracks, newActiveTrackId);
    },
    [currentSubtitleTracks, currentActiveTrack, emitSubtitleChange]
  );

  // Remove a subtitle track
  const removeSubtitleTrack = useCallback(
    (trackId: string) => {
      const updatedTracks = currentSubtitleTracks.filter(track => track.id !== trackId);

      // If we removed the active track, clear the active track
      const newActiveTrackId = currentActiveTrack === trackId ? undefined : currentActiveTrack;

      emitSubtitleChange(updatedTracks, newActiveTrackId);
    },
    [currentSubtitleTracks, currentActiveTrack, emitSubtitleChange]
  );

  // Set the active subtitle track
  const setActiveSubtitleTrack = useCallback(
    (trackId?: string) => {
      emitSubtitleChange(currentSubtitleTracks, trackId);
    },
    [currentSubtitleTracks, emitSubtitleChange]
  );

  // Update subtitle tracks (for compatibility)
  const updateSubtitleTracks = useCallback(
    (tracks: SubtitleTrack[]) => {
      emitSubtitleChange(tracks, currentActiveTrack);
    },
    [currentActiveTrack, emitSubtitleChange]
  );

  // Update both tracks and active track in one operation (recommended)
  const updateSubtitleTracksAndActive = useCallback(
    (tracks: SubtitleTrack[], activeTrackId?: string) => {
      emitSubtitleChange(tracks, activeTrackId);
    },
    [emitSubtitleChange]
  );

  return {
    addSubtitleTracks,
    removeSubtitleTrack,
    setActiveSubtitleTrack,
    updateSubtitleTracks,
    updateSubtitleTracksAndActive,
  };
}
