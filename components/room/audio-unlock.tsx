import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2 } from 'lucide-react';

interface AudioUnlockProps {
  onUnlock: () => void;
}

export function AudioUnlock({ onUnlock }: AudioUnlockProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if audio context is suspended (indicates autoplay restriction)
    const checkAudioContext = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          setIsVisible(true);
        }
        audioContext.close();
      } catch (error) {
        console.log('AudioContext not available');
      }
    };

    checkAudioContext();
  }, []);

  const handleUnlock = async () => {
    try {
      // Create a minimal audio context to unlock audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContext.resume();
      audioContext.close();

      setIsVisible(false);
      onUnlock();
    } catch (error) {
      console.error('Failed to unlock audio:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Audio Permission Required</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Click to enable voice chat audio playback</p>
          </div>
          <Button
            onClick={handleUnlock}
            variant="outline"
            size="sm"
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-900"
          >
            Enable Audio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
