import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  webpSrc?: string;
  placeholderSrc?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  webpSrc,
  placeholderSrc = '/placeholder.svg',
  priority = false,
  className,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // For priority images, load immediately
    if (priority) {
      const img = new Image();
      img.src = webpSrc || src;
      img.onload = () => {
        setImageSrc(webpSrc || src);
        setIsLoading(false);
      };
      img.onerror = () => {
        // Fallback to original src if webp fails
        if (webpSrc && src !== webpSrc) {
          const fallbackImg = new Image();
          fallbackImg.src = src;
          fallbackImg.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
          };
          fallbackImg.onerror = () => {
            setHasError(true);
            setIsLoading(false);
          };
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      };
    } else {
      // For non-priority images, just set the src and let browser lazy load
      setImageSrc(webpSrc || src);
      setIsLoading(false);
    }
  }, [src, webpSrc, priority]);

  if (hasError) {
    return (
      <div className={cn(
        "bg-gray-200 flex items-center justify-center",
        className
      )}>
        <span className="text-gray-400 text-sm">Image failed to load</span>
      </div>
    );
  }

  return (
    <picture>
      {webpSrc && (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        className={cn(
          isLoading && "opacity-0 transition-opacity duration-300",
          !isLoading && "opacity-100",
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        {...props}
      />
    </picture>
  );
}