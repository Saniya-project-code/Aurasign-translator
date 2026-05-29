import { useEffect, useState, useRef } from "react";
import type { Point3D } from "../utils/aslLandmarks";

// Declare global types for MediaPipe variables injected via CDN scripts
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

interface UseHandTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onLandmarksDetected: (landmarks: Point3D[], isRightHand: boolean) => void;
  onTrackingLost: () => void;
}

export function useHandTracker({
  videoRef,
  onLandmarksDetected,
  onTrackingLost
}: UseHandTrackerProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const framesCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  useEffect(() => {
    let active = true;
    let checkInterval: any;

    // 1. Wait for MediaPipe scripts to load in window
    const initializeMediaPipe = () => {
      if (!window.Hands || !window.Camera) {
        setLoadingError("Loading MediaPipe Tracking Libraries...");
        return false;
      }
      
      setLoadingError(null);
      try {
        // Initialize Hands model
        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        hands.onResults((results: any) => {
          if (!active) return;

          // Track FPS
          framesCountRef.current++;
          const now = performance.now();
          const elapsed = now - lastFpsUpdateRef.current;
          if (elapsed >= 1000) {
            setFps(Math.round((framesCountRef.current * 1000) / elapsed));
            framesCountRef.current = 0;
            lastFpsUpdateRef.current = now;
          }

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const rawLandmarks = results.multiHandLandmarks[0] as Point3D[];
            
            // Check if hand is left or right in image coordinates
            const isRightHand = results.multiHandedness 
              ? results.multiHandedness[0].label === "Right"
              : true;

            onLandmarksDetected(rawLandmarks, isRightHand);
          } else {
            onTrackingLost();
          }
        });

        handsRef.current = hands;
        setIsModelLoaded(true);
        return true;
      } catch (err: any) {
        console.error("Error initializing MediaPipe Hands:", err);
        setLoadingError("Failed to initialize Hand tracking model. Please refresh.");
        return true; // Stop retrying
      }
    };

    // Poll to check if script is loaded
    const checkLoaded = () => {
      const done = initializeMediaPipe();
      if (!done) {
        checkInterval = setTimeout(checkLoaded, 500);
      }
    };

    checkLoaded();

    return () => {
      active = false;
      clearTimeout(checkInterval);
      
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.warn("Error stopping camera", e);
        }
      }
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {
          console.warn("Error closing hands model", e);
        }
      }
    };
  }, []);

  // Toggle Camera Stream
  const startCamera = async () => {
    if (!isModelLoaded || !videoRef.current) {
      console.warn("Model not loaded yet or Video ref is empty");
      return;
    }

    try {
      setLoadingError(null);
      // Access camera stream to verify permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, frameRate: { ideal: 30 } }
      });
      
      // Stop stream tracks so MediaPipe Camera can take ownership
      stream.getTracks().forEach(track => track.stop());

      if (cameraRef.current) {
        cameraRef.current.stop();
      }

      // Initialize MediaPipe Camera helper
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 360
      });

      cameraRef.current = camera;
      await camera.start();
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setLoadingError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow access to use the translator."
          : "Could not open camera. Make sure it is not used by another application."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
        setIsCameraActive(false);
        onTrackingLost();
      } catch (e) {
        console.error("Error stopping camera helper", e);
      }
    }
  };

  return {
    isModelLoaded,
    isCameraActive,
    loadingError,
    fps,
    startCamera,
    stopCamera
  };
}
