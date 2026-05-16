'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import Image, { type ImageProps } from 'next/image';

interface AppImageProps extends Omit<
  ImageProps,
  'src' | 'alt' | 'onError' | 'onLoad' | 'placeholder'
> {
  src: string;
  alt: string;
  placeholder?: 'blur' | 'empty';
  onClick?: () => void;
  fallbackSrc?: string;
}

const AppImage = memo(function AppImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  onClick,
  fallbackSrc = '/showcase/assets/images/no_image.png',
  loading = 'lazy',
  unoptimized = false,
  ...props
}: AppImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const resolvedUnoptimized = unoptimized;

  const handleError = useCallback(() => {
    if (!hasError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    }
    setIsLoading(false);
  }, [hasError, imageSrc, fallbackSrc]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const imageClassName = useMemo(() => {
    const classes = [className];
    if (isLoading) classes.push('bg-gray-200');
    if (onClick) classes.push('cursor-pointer hover:opacity-90 transition-opacity duration-200');
    return classes.filter(Boolean).join(' ');
  }, [className, isLoading, onClick]);

  const imageProps = useMemo(() => {
    return {
      src: imageSrc,
      alt,
      className: imageClassName,
      quality,
      placeholder,
      unoptimized: resolvedUnoptimized,
      onError: handleError,
      onLoad: handleLoad,
      onClick,
      ...(priority ? { priority: true as const } : { loading }),
      ...(blurDataURL && placeholder === 'blur' ? { blurDataURL } : {}),
    };
  }, [
    imageSrc,
    alt,
    imageClassName,
    quality,
    placeholder,
    blurDataURL,
    resolvedUnoptimized,
    priority,
    loading,
    handleError,
    handleLoad,
    onClick,
  ]);

  // Ensure we don't pass event handlers or non-standard props to the Next.js Image component
  // that might cause serializability issues if used in a way that triggers RSC boundaries.
  const {
    // Filter out props that shouldn't go to the native Image component
    onMouseEnter: _onMouseEnter,
    onMouseLeave: _onMouseLeave,
    onMouseMove: _onMouseMove,
    ...imageOnlyProps
  } = props;

  if (fill) {
    return (
      <Image
        {...imageProps}
        alt={alt}
        fill
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        style={{ objectFit: 'cover', ...props.style }}
        {...imageOnlyProps}
      />
    );
  }

  return (
    <Image
      {...imageProps}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      style={props.style}
      {...imageOnlyProps}
    />
  );
});

AppImage.displayName = 'AppImage';

export default AppImage;
