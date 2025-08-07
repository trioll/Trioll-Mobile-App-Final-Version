import React, { useState, useCallback, useMemo } from 'react';
import { Image, ImageProps, ImageSourcePropType } from 'react-native';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSourcePropType;
  fallbackSource?: ImageSourcePropType;
  onError?: (error: unknown) => void;
}

/**
 * SafeImage component that handles CloudFront 403 errors
 * and falls back to direct S3 URLs or placeholder images
 * Memoized for better performance
 */
export const SafeImage = React.memo<SafeImageProps>(({
  source,
  fallbackSource,
  onError,
  ...props
}) => {
  const [imageSource, setImageSource] = useState(source);
  const [hasError, setHasError] = useState(false);

  // Optimize source with cache control
  const optimizedSource = useMemo(() => {
    if (typeof imageSource === 'object' && 'uri' in imageSource) {
      return {
        ...imageSource,
        cache: 'force-cache' as const,
      };
    }
    return imageSource;
  }, [imageSource]);

  const handleError = useCallback(
    (error: unknown) => {
      // Image failed to load: (source as any).uri

      // If source has a CloudFront URL, try direct S3 URL
      if (!hasError && typeof source === 'object' && 'uri' in source && source.uri) {
        const uri = source.uri;

        // Check if it's a CloudFront URL
        if (uri.includes('cloudfront.net')) {
          // Extract the path after cloudfront.net
          const pathMatch = uri.match(/cloudfront\.net\/(.+)/);
          if (pathMatch && pathMatch[1]) {
            const s3Path = pathMatch[1];
            const s3Url = `https://trioll-prod-games-us-east-1.s3.amazonaws.com/${s3Path}`;
            // Trying S3 fallback
            setImageSource({ uri: s3Url });
            setHasError(true);
            return;
          }
        }
      }

      // If we already tried S3 or it's not a CloudFront URL, use fallback
      if (fallbackSource) {
        // Using fallback image
        setImageSource(fallbackSource);
      }

      // Call original onError handler
      if (onError) {
        onError(error as any);
      }
    },
    [source, fallbackSource, hasError, onError]
  );

  return <Image {...props} source={optimizedSource} onError={handleError} />;
});

// Default placeholder image
export const DEFAULT_GAME_IMAGE = {
  uri: 'https://img.gamedistribution.com/07326c59e55a4796b087aa7c3ac51204-512x512.jpeg',
};
