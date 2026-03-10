import { useState, useRef, useEffect, useCallback } from 'react';

export type VideoState = 'loading' | 'ready' | 'playing' | 'error';

interface VideoSource {
  src: string;
  type: string;
}

interface ResponsivePoster {
  src: string;
  media?: string; // CSS media query
  type?: string; // image/webp, image/jpeg, etc.
}

interface ProfessionalVideoProps {
  src?: string; // Single source (backward compatibility)
  sources?: VideoSource[]; // Multiple sources for format fallback
  poster?: string; // Single poster image
  responsivePosters?: ResponsivePoster[]; // Multiple poster sizes and formats
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  className?: string;
  onStateChange?: (state: VideoState) => void;
  fallbackPoster?: string;
  enableRuntimePosterGeneration?: boolean;
}

const ProfessionalVideo = ({
  src,
  sources,
  poster,
  responsivePosters,
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = false,
  className = '',
  onStateChange,
  fallbackPoster,
  enableRuntimePosterGeneration = true
}: ProfessionalVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<VideoState>('loading');
  const [runtimePoster, setRuntimePoster] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  // Update parent component when state changes
  const updateState = useCallback((newState: VideoState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // Runtime poster generation using Canvas API
  const generateRuntimePoster = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !enableRuntimePosterGeneration) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to high-quality JPEG data URL
      const posterDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setRuntimePoster(posterDataUrl);

      console.log('✅ Generated runtime poster from video frame');
    } catch (error) {
      console.warn('Runtime poster generation failed:', error);
    }
  }, [enableRuntimePosterGeneration]);

  // Video event handlers
  const handleLoadStart = useCallback(() => {
    updateState('loading');
  }, [updateState]);

  const handleCanPlay = useCallback(() => {
    updateState('ready');
  }, [updateState]);

  const handleLoadedData = useCallback(() => {
    // Generate runtime poster when first frame is available
    if (!poster && !runtimePoster && enableRuntimePosterGeneration) {
      // Small delay to ensure frame is rendered
      setTimeout(generateRuntimePoster, 100);
    }
  }, [poster, runtimePoster, generateRuntimePoster, enableRuntimePosterGeneration]);

  const handlePlaying = useCallback(() => {
    updateState('playing');
    setShowVideo(true);
  }, [updateState]);

  const handleError = useCallback((error: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video error:', error);
    updateState('error');
  }, [updateState]);

  const handlePause = useCallback(() => {
    updateState('ready');
  }, [updateState]);

  // Clean up on unmount (React Strict Mode compatibility)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    return cleanup;
  }, []);

  // Determine which poster to show
  const currentPoster = poster || runtimePoster || fallbackPoster;
  const showPoster = !showVideo && state !== 'playing';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Video element with multi-format support */}
      <video
        ref={videoRef}
        poster={currentPoster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload="metadata"
        className={`w-full h-auto object-cover transition-opacity duration-300 ${
          showPoster ? 'opacity-0' : 'opacity-100'
        }`}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onLoadedData={handleLoadedData}
        onPlaying={handlePlaying}
        onError={handleError}
        onPause={handlePause}
      >
        {sources && sources.length > 0 ? (
          // Multiple source elements for format fallback
          sources.map((source, index) => (
            <source key={index} src={source.src} type={source.type} />
          ))
        ) : src ? (
          // Single source (backward compatibility)
          <source src={src} type="video/mp4" />
        ) : null}

        {/* Fallback content for browsers that don't support video */}
        <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
          <p>Your browser doesn't support video playback.</p>
        </div>
      </video>

      {/* Hidden canvas for runtime poster generation */}
      <canvas
        ref={canvasRef}
        className="hidden"
        aria-hidden="true"
      />

      {/* Poster overlay - shows when video is loading or error */}
      {showPoster && (responsivePosters || currentPoster) && (
        <div className="absolute inset-0">
          {responsivePosters && responsivePosters.length > 0 ? (
            // Responsive poster with multiple formats and sizes
            <picture className="w-full h-full">
              {responsivePosters.map((posterSrc, index) => (
                <source
                  key={index}
                  srcSet={posterSrc.src}
                  media={posterSrc.media}
                  type={posterSrc.type}
                />
              ))}
              <img
                src={currentPoster || responsivePosters[responsivePosters.length - 1].src}
                alt=""
                className="w-full h-full object-cover"
                loading="eager"
              />
            </picture>
          ) : currentPoster ? (
            // Single poster image
            <img
              src={currentPoster}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : null}
        </div>
      )}

      {/* Loading indicator */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm">Video unavailable</p>
          </div>
        </div>
      )}

      {/* Fallback gradient when no poster is available */}
      {showPoster && !currentPoster && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-muted/30 to-secondary/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-3">
                <span className="text-2xl">🎬</span>
              </div>
              <p className="text-sm font-medium">Pam</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalVideo;