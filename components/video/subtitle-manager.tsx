'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Subtitles, Plus, X } from 'lucide-react';
import { SubtitleUploadDialog } from './subtitle-upload-dialog';
import type { SubtitleTrack } from '@/types/schemas';

interface SubtitleManagerProps {
  subtitleTracks: SubtitleTrack[];
  activeTrackId?: string;
  onAddTracks: (tracks: SubtitleTrack[]) => void;
  onRemoveTrack: (trackId: string) => void;
  onActiveTrackChange: (trackId?: string) => void;
  currentVideoTitle?: string;
  isHost?: boolean;
}

export function SubtitleManager({
  subtitleTracks,
  activeTrackId,
  onAddTracks,
  onRemoveTrack,
  onActiveTrackChange,
  currentVideoTitle,
  isHost = false,
}: SubtitleManagerProps) {
  const [showSearchDialog, setShowSearchDialog] = useState(false);

  const handleAddSubtitles = (newTracks: SubtitleTrack[]) => {
    onAddTracks(newTracks);
  };

  const handleRemoveTrack = (trackId: string) => {
    onRemoveTrack(trackId);
  };

  const handleTrackSelect = (trackId?: string) => {
    onActiveTrackChange(trackId);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-white transition-colors hover:bg-white/20">
            <Subtitles className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleTrackSelect(undefined)} className={!activeTrackId ? 'bg-accent' : ''}>
            Off
          </DropdownMenuItem>

          {subtitleTracks.map(track => (
            <div key={track.id} className="flex items-center">
              <DropdownMenuItem
                onClick={() => handleTrackSelect(track.id)}
                className={`flex-1 ${activeTrackId === track.id ? 'bg-accent' : ''}`}
              >
                <div className="flex-1">
                  <div className="font-medium">{track.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {track.language.toUpperCase()} • {track.format.toUpperCase()}
                  </div>
                </div>
              </DropdownMenuItem>
              {isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveTrack(track.id);
                  }}
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {isHost && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSearchDialog(true)} className="text-primary">
                <Plus className="mr-2 h-4 w-4" />
                Upload Subtitles
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isHost && (
        <SubtitleUploadDialog
          open={showSearchDialog}
          onOpenChange={setShowSearchDialog}
          onSubtitleSelected={handleAddSubtitles}
        />
      )}
    </>
  );
}
