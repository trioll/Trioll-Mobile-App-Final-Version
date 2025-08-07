import React from 'react';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { StyleProp } from 'react-native';
import { getLogger } from '../utils/logger';

const logger = getLogger('fastImageCompat');
interface FastImageProps {
  source: { uri?: string; headers?: { [key: string]: string } } | number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  onLoadStart?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  onLoadEnd?: () => void;
  priority?: 'low' | 'normal' | 'high';
  fallback?: boolean;
  defaultSource?: number;
  [key: string]: any;
}

// FastImage component using Expo Image
const FastImage: React.FC<FastImageProps> & {
  priority: {
    low: 'low';
    normal: 'normal';
    high: 'high';
  };
  resizeMode: {
    contain: 'contain';
    cover: 'cover';
    stretch: 'stretch';
    center: 'center';
  };
  preload: (sources: Array<{ uri: string }>) => void;
  clearMemoryCache: () => Promise<void>;
  clearDiskCache: () => Promise<void>;
} = props => {
  const {
    source,
    style,
    resizeMode = 'cover',
    onLoadStart,
    onLoad,
    onError,
    onLoadEnd,
    priority,
    fallback,
    defaultSource,
    ...otherProps
  } = props;

  // Convert FastImage source to Expo Image source
  const expoSource =
    typeof source === 'number'
      ? source
      : source.uri
        ? { uri: source.uri, headers: source.headers }
        : source;

  return (
    <ExpoImage
      source={expoSource}
      style={style}
      contentFit={resizeMode === 'center' ? 'contain' : (resizeMode as ImageContentFit)}
      onLoadStart={onLoadStart}
      onLoad={onLoad}
      onError={onError}
      onLoadEnd={onLoadEnd}
      placeholder={defaultSource}
      priority={priority}
      {...otherProps}
    />
  );
};

// Static properties
FastImage.priority = {
  low: 'low' as const,
  normal: 'normal' as const,
  high: 'high' as const,
};

FastImage.resizeMode = {
  contain: 'contain' as const,
  cover: 'cover' as const,
  stretch: 'stretch' as const,
  center: 'center' as const,
};

// Static methods
FastImage.preload = (sources: Array<{ uri: string }>) => {
  // Expo Image handles caching automatically
  // This is a no-op for compatibility
  logger.info(`FastImage.preload called with ${sources.length} images`);
};

FastImage.clearMemoryCache = async () => {
  // Expo Image doesn't expose cache clearing
  // This is a no-op for compatibility
  logger.info('FastImage.clearMemoryCache called');
};

FastImage.clearDiskCache = async () => {
  // Expo Image doesn't expose cache clearing
  // This is a no-op for compatibility
  logger.info('FastImage.clearDiskCache called');
};

export default FastImage;
