/**
 * Progressive Enhancement Utilities
 * Provides graceful degradation and enhancement features for web platform
 */

export interface DeviceCapabilities {
  hasJavaScript: boolean;
  hasWebGL: boolean;
  hasWebWorkers: boolean;
  hasServiceWorkers: boolean;
  hasIndexedDB: boolean;
  hasWebAssembly: boolean;
  hasIntersectionObserver: boolean;
  hasResizeObserver: boolean;
  hasTouchSupport: boolean;
  hasHover: boolean;
  hasMotionSupport: boolean;
  isOffline: boolean;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface PerformanceMetrics {
  isLowEndDevice: boolean;
  connectionSpeed: 'slow' | 'medium' | 'fast';
  memoryStatus: 'low' | 'medium' | 'high';
  cpuCores: number;
  reducedMotion: boolean;
  dataSaver: boolean;
}

/**
 * Detect device capabilities for progressive enhancement
 */
export const detectDeviceCapabilities = (): DeviceCapabilities => {
  if (typeof window === 'undefined') {
    return {
      hasJavaScript: false,
      hasWebGL: false,
      hasWebWorkers: false,
      hasServiceWorkers: false,
      hasIndexedDB: false,
      hasWebAssembly: false,
      hasIntersectionObserver: false,
      hasResizeObserver: false,
      hasTouchSupport: false,
      hasHover: false,
      hasMotionSupport: false,
      isOffline: false,
    };
  }

  return {
    hasJavaScript: true,
    hasWebGL: !!window.WebGLRenderingContext,
    hasWebWorkers: typeof Worker !== 'undefined',
    hasServiceWorkers: 'serviceWorker' in navigator,
    hasIndexedDB: 'indexedDB' in window,
    hasWebAssembly: typeof WebAssembly !== 'undefined',
    hasIntersectionObserver: 'IntersectionObserver' in window,
    hasResizeObserver: 'ResizeObserver' in window,
    hasTouchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hasHover: window.matchMedia('(hover: hover)').matches,
    hasMotionSupport: 'DeviceMotionEvent' in window,
    isOffline: !navigator.onLine,
    connectionType: (navigator as any).connection?.effectiveType,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
};

/**
 * Get performance metrics to adjust features
 */
export const getPerformanceMetrics = (): PerformanceMetrics => {
  const capabilities = detectDeviceCapabilities();
  const connection = (navigator as any).connection;

  // Determine connection speed
  let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium';
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      connectionSpeed = 'slow';
    } else if (effectiveType === '3g') {
      connectionSpeed = 'medium';
    } else {
      connectionSpeed = 'fast';
    }
  }

  // Determine if low-end device
  const deviceMemory = capabilities.deviceMemory || 4;
  const cpuCores = capabilities.hardwareConcurrency || 4;
  const isLowEndDevice = deviceMemory <= 2 || cpuCores <= 2;

  // Memory status
  let memoryStatus: 'low' | 'medium' | 'high' = 'medium';
  if (deviceMemory <= 2) {
    memoryStatus = 'low';
  } else if (deviceMemory >= 8) {
    memoryStatus = 'high';
  }

  // Check for reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check for data saver mode
  const dataSaver = connection?.saveData === true;

  return {
    isLowEndDevice,
    connectionSpeed,
    memoryStatus,
    cpuCores,
    reducedMotion,
    dataSaver,
  };
};

/**
 * Feature configuration based on device capabilities
 */
export interface FeatureConfig {
  enableAnimations: boolean;
  enableParallax: boolean;
  enableLazyLoading: boolean;
  enableServiceWorker: boolean;
  enableWebWorkers: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  maxImageSize: number;
  enableVideoAutoplay: boolean;
  enableHeavyComputation: boolean;
  enableRealTimeFeatures: boolean;
  chunkSize: 'small' | 'medium' | 'large';
}

/**
 * Get optimal feature configuration based on device capabilities
 */
export const getOptimalFeatureConfig = (): FeatureConfig => {
  const capabilities = detectDeviceCapabilities();
  const metrics = getPerformanceMetrics();

  return {
    enableAnimations: !metrics.reducedMotion && !metrics.isLowEndDevice,
    enableParallax: !metrics.reducedMotion && metrics.memoryStatus !== 'low' && capabilities.hasMotionSupport,
    enableLazyLoading: capabilities.hasIntersectionObserver,
    enableServiceWorker: capabilities.hasServiceWorkers,
    enableWebWorkers: capabilities.hasWebWorkers && metrics.cpuCores > 2,
    imageQuality: metrics.connectionSpeed === 'fast' && !metrics.dataSaver ? 'high' :
                  metrics.connectionSpeed === 'medium' ? 'medium' : 'low',
    maxImageSize: metrics.dataSaver ? 512 : metrics.connectionSpeed === 'fast' ? 1920 : 1024,
    enableVideoAutoplay: !metrics.dataSaver && metrics.connectionSpeed !== 'slow',
    enableHeavyComputation: !metrics.isLowEndDevice && metrics.cpuCores > 4,
    enableRealTimeFeatures: metrics.connectionSpeed !== 'slow' && !capabilities.isOffline,
    chunkSize: metrics.connectionSpeed === 'fast' ? 'large' :
               metrics.connectionSpeed === 'medium' ? 'medium' : 'small',
  };
};

/**
 * CSS-in-JS adaptive styles based on capabilities
 */
export const getAdaptiveStyles = () => {
  const metrics = getPerformanceMetrics();

  return {
    transition: metrics.reducedMotion ? 'none' : 'all 0.3s ease',
    transform: metrics.isLowEndDevice ? 'none' : undefined,
    filter: metrics.isLowEndDevice ? 'none' : undefined,
    backdropFilter: metrics.isLowEndDevice ? 'none' : undefined,
    willChange: metrics.isLowEndDevice ? 'auto' : undefined,
  };
};

/**
 * Progressive image loading strategy
 */
export const getImageLoadingStrategy = (imageSrc: string) => {
  const config = getOptimalFeatureConfig();
  const metrics = getPerformanceMetrics();

  const quality = config.imageQuality === 'high' ? 90 :
                  config.imageQuality === 'medium' ? 70 : 50;

  const format = metrics.dataSaver ? 'jpeg' : 'webp';
  const maxWidth = config.maxImageSize;

  return {
    src: `${imageSrc}?w=${maxWidth}&q=${quality}&f=${format}`,
    loading: config.enableLazyLoading ? 'lazy' : 'eager',
    placeholder: metrics.isLowEndDevice ? 'none' : 'blur',
  };
};

/**
 * Adaptive component loading
 */
export class ComponentLoader {
  private static loadedComponents = new Set<string>();

  static async loadComponent<T>(
    componentName: string,
    loader: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const metrics = getPerformanceMetrics();

    try {
      // Use fallback for low-end devices if available
      if (metrics.isLowEndDevice && fallback) {
        return await fallback();
      }

      // Check if already loaded
      if (this.loadedComponents.has(componentName)) {
        return await loader();
      }

      // Load with timeout for slow connections
      const timeoutMs = metrics.connectionSpeed === 'slow' ? 10000 : 5000;
      const component = await Promise.race([
        loader(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Component load timeout')), timeoutMs)
        )
      ]);

      this.loadedComponents.add(componentName);
      return component;

    } catch (error) {
      console.warn(`Failed to load component ${componentName}:`, error);

      // Fallback to basic component
      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }
}

/**
 * Network-aware data fetching
 */
export const getDataFetchingStrategy = () => {
  const metrics = getPerformanceMetrics();
  const capabilities = detectDeviceCapabilities();

  return {
    timeout: metrics.connectionSpeed === 'slow' ? 30000 : 10000,
    retries: metrics.connectionSpeed === 'slow' ? 1 : 3,
    cacheFirst: metrics.dataSaver || capabilities.isOffline,
    compression: metrics.connectionSpeed !== 'fast',
    batchSize: metrics.connectionSpeed === 'fast' ? 50 :
               metrics.connectionSpeed === 'medium' ? 25 : 10,
  };
};

/**
 * Monitor performance and adjust features dynamically
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserver[] = [];
  private metrics: any = {};

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  startMonitoring() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Monitor paint metrics
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.metrics[entry.name] = entry.startTime;
      });
    });
    paintObserver.observe({ entryTypes: ['paint'] });
    this.observers.push(paintObserver);

    // Monitor layout shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.cls = clsValue;
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);

    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((_entry) => {
        this.metrics.longTasks = (this.metrics.longTasks || 0) + 1;
      });
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.push(longTaskObserver);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  shouldReduceFeatures(): boolean {
    const cls = this.metrics.cls || 0;
    const longTasks = this.metrics.longTasks || 0;

    return cls > 0.1 || longTasks > 5;
  }

  stopMonitoring() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Initialize progressive enhancement
 */
export const initializeProgressiveEnhancement = () => {
  if (typeof window === 'undefined') return;

  // Add capability classes to document
  const capabilities = detectDeviceCapabilities();
  const metrics = getPerformanceMetrics();

  const classes: string[] = [];

  if (capabilities.hasTouchSupport) classes.push('has-touch');
  if (capabilities.hasHover) classes.push('has-hover');
  if (metrics.reducedMotion) classes.push('reduced-motion');
  if (metrics.isLowEndDevice) classes.push('low-end-device');
  if (metrics.dataSaver) classes.push('data-saver');

  classes.push(`connection-${metrics.connectionSpeed}`);
  classes.push(`memory-${metrics.memoryStatus}`);

  document.documentElement.classList.add(...classes);

  // Start performance monitoring
  const monitor = PerformanceMonitor.getInstance();
  monitor.startMonitoring();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    monitor.stopMonitoring();
  });
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initializeProgressiveEnhancement();
}
