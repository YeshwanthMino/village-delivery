/**
 * Image Optimization Utilities for Web Platform
 * Provides responsive images, WebP support, and lazy loading
 */

export interface ResponsiveImageSizes {
  sm: number;   // 480px
  md: number;   // 768px
  lg: number;   // 1024px
  xl: number;   // 1440px
}

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  sizes?: ResponsiveImageSizes;
  lazy?: boolean;
  placeholder?: 'blur' | 'empty';
}

/**
 * Generate responsive image URLs with different sizes
 */
export const generateResponsiveImageUrls = (
  baseUrl: string,
  sizes: ResponsiveImageSizes = { sm: 480, md: 768, lg: 1024, xl: 1440 }
): Record<keyof ResponsiveImageSizes, string> => {
  return {
    sm: `${baseUrl}?w=${sizes.sm}&q=75&f=webp`,
    md: `${baseUrl}?w=${sizes.md}&q=80&f=webp`,
    lg: `${baseUrl}?w=${sizes.lg}&q=85&f=webp`,
    xl: `${baseUrl}?w=${sizes.xl}&q=90&f=webp`
  };
};

/**
 * Generate srcSet string for responsive images
 */
export const generateSrcSet = (imageUrls: Record<string, string>): string => {
  return Object.entries(imageUrls)
    .map(([size, url]) => {
      const width = size === 'sm' ? 480 : size === 'md' ? 768 : size === 'lg' ? 1024 : 1440;
      return `${url} ${width}w`;
    })
    .join(', ');
};

/**
 * Check if WebP is supported by the browser
 */
export const supportsWebP = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Generate optimized image URL based on browser capabilities
 */
export const getOptimizedImageUrl = async (
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): Promise<string> => {
  const {
    quality = 80,
    lazy = true
  } = options;

  // Check WebP support
  const webpSupported = await supportsWebP();
  const finalFormat = webpSupported ? 'webp' : 'jpeg';

  // Construct optimized URL (assuming you have an image optimization service)
  const params = new URLSearchParams({
    q: quality.toString(),
    f: finalFormat,
    auto: 'compress',
    ...(lazy && { loading: 'lazy' })
  });

  return `${originalUrl}?${params.toString()}`;
};

/**
 * Create a responsive image component props
 */
export interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: string;
  srcSet?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const createResponsiveImageProps = (
  src: string,
  alt: string,
  options: ImageOptimizationOptions = {}
): ResponsiveImageProps => {
  const sizes = options.sizes || { sm: 480, md: 768, lg: 1024, xl: 1440 };
  const imageUrls = generateResponsiveImageUrls(src, sizes);

  return {
    src: imageUrls.lg, // Default fallback
    alt,
    srcSet: generateSrcSet(imageUrls),
    sizes: '(max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1440px',
    loading: options.lazy ? 'lazy' : 'eager',
    style: {
      width: '100%',
      height: 'auto',
      objectFit: 'cover'
    }
  };
};

/**
 * Preload critical images for better performance
 */
export const preloadImage = (src: string, format: 'webp' | 'jpeg' = 'webp'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    if (format === 'webp') {
      link.type = 'image/webp';
    }

    link.onload = () => resolve();
    link.onerror = () => reject();

    document.head.appendChild(link);
  });
};

/**
 * Lazy loading observer for images
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;
  private images: Set<HTMLImageElement> = new Set();

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(this.handleIntersect.bind(this), {
        rootMargin: '50px 0px',
        threshold: 0.01,
        ...options
      });
    }
  }

  private handleIntersect(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
        this.observer?.unobserve(img);
        this.images.delete(img);
      }
    });
  }

  private async loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (!src) return;

    try {
      // Create optimized URL
      const optimizedSrc = await getOptimizedImageUrl(src);

      // Load image
      const image = new Image();
      image.onload = () => {
        img.src = optimizedSrc;
        img.classList.add('loaded');
      };
      image.onerror = () => {
        img.src = src; // Fallback to original
        img.classList.add('error');
      };
      image.src = optimizedSrc;
    } catch (error) {
      img.src = src; // Fallback to original
      img.classList.add('error');
    }
  }

  observe(img: HTMLImageElement) {
    if (this.observer) {
      this.images.add(img);
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
    }
  }

  disconnect() {
    this.observer?.disconnect();
    this.images.clear();
  }
}

/**
 * Image compression utility for client-side optimization
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get image dimensions without loading the full image
 */
export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

/**
 * Generate CSS for responsive background images
 */
export const generateResponsiveBackgroundCSS = (
  baseUrl: string,
  sizes: ResponsiveImageSizes = { sm: 480, md: 768, lg: 1024, xl: 1440 }
): string => {
  const imageUrls = generateResponsiveImageUrls(baseUrl, sizes);

  return `
    background-image: url('${imageUrls.sm}');

    @media (min-width: 481px) {
      background-image: url('${imageUrls.md}');
    }

    @media (min-width: 769px) {
      background-image: url('${imageUrls.lg}');
    }

    @media (min-width: 1025px) {
      background-image: url('${imageUrls.xl}');
    }
  `;
};

// Export singleton instance for lazy loading
export const imageLoader = new ImageLazyLoader();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imageLoader.disconnect();
  });
}
