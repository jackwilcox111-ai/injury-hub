import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MediaPlayerProps {
  storageUrl: string;
  mediaType: 'video' | 'audio' | 'text';
  transcript?: string;
  textContent?: string;
  onViewed?: () => void;
}

export function MediaPlayer({ storageUrl, mediaType, transcript, textContent, onViewed }: MediaPlayerProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const viewedRef = useRef(false);

  const handlePlay = () => {
    if (!viewedRef.current && onViewed) {
      viewedRef.current = true;
      onViewed();
    }
  };

  return (
    <div className="space-y-3">
      {mediaType === 'video' && (
        <video
          src={storageUrl}
          controls
          onPlay={handlePlay}
          className="w-full rounded-lg border border-border bg-black"
        />
      )}
      {mediaType === 'audio' && (
        <div className="bg-accent/50 rounded-lg p-4 space-y-3">
          <div className="flex items-end gap-1 justify-center h-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 20}px`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.8s',
                }}
              />
            ))}
          </div>
          <audio src={storageUrl} controls onPlay={handlePlay} className="w-full" />
        </div>
      )}
      {mediaType === 'text' && textContent && (
        <div className="bg-card border border-border rounded-lg p-5" onClick={handlePlay}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xs">CL</span>
            </div>
            <span className="text-sm font-semibold text-foreground">CareLink Message</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{textContent}</p>
        </div>
      )}

      {transcript && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </Button>
          {showTranscript && (
            <p className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-3 mt-1 whitespace-pre-wrap">{transcript}</p>
          )}
        </div>
      )}
    </div>
  );
}
