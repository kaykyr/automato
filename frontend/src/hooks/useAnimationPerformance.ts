import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
  isLagging: boolean;
  lagCount: number;
}

export const useAnimationPerformance = (enabled = true) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    averageFps: 60,
    frameTime: 16.67,
    isLagging: false,
    lagCount: 0,
  });

  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);
  const lagCountRef = useRef<number>(0);

  const measureFrame = () => {
    if (!enabled) return;

    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Keep last 60 frame times for rolling average
    frameTimeRef.current.push(frameTime);
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift();
    }

    // Calculate metrics
    const currentFps = Math.round(1000 / frameTime);
    const averageFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
    const averageFps = Math.round(1000 / averageFrameTime);
    
    // Detect lag (frame time > 33ms = below 30fps)
    const isLagging = frameTime > 33;
    if (isLagging) {
      lagCountRef.current++;
    }

    setMetrics({
      fps: currentFps,
      averageFps,
      frameTime: Math.round(frameTime * 100) / 100,
      isLagging,
      lagCount: lagCountRef.current,
    });

    rafIdRef.current = requestAnimationFrame(measureFrame);
  };

  useEffect(() => {
    if (enabled) {
      rafIdRef.current = requestAnimationFrame(measureFrame);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Reset lag count
  const resetLagCount = () => {
    lagCountRef.current = 0;
    setMetrics(prev => ({ ...prev, lagCount: 0 }));
  };

  return {
    ...metrics,
    resetLagCount,
    isMonitoring: enabled && rafIdRef.current !== null,
  };
};