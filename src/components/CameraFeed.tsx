import React, { useEffect } from "react";
import { Camera, CameraOff, Cpu, RefreshCw } from "lucide-react";
import type { Point3D } from "../utils/aslLandmarks";

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isModelLoaded: boolean;
  isCameraActive: boolean;
  loadingError: string | null;
  fps: number;
  activeHand: string; // "Left", "Right", or "None"
  gestureLabel: string;
  confidence: number;
  startCamera: () => void;
  stopCamera: () => void;
  rawLandmarks: Point3D[];
}

export function CameraFeed({
  videoRef,
  canvasRef,
  isModelLoaded,
  isCameraActive,
  loadingError,
  fps,
  activeHand,
  gestureLabel,
  confidence,
  startCamera,
  stopCamera,
  rawLandmarks
}: CameraFeedProps) {
  
  // High-performance canvas drawing loop for hand landmark skeleton overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isCameraActive || rawLandmarks.length === 0) return;

    // MediaPipe landmarks are normalized (0 to 1). Scale them to canvas dimensions
    const width = canvas.width;
    const height = canvas.height;

    const points = rawLandmarks.map(p => ({
      x: p.x * width,
      y: p.y * height,
      z: p.z
    }));

    // Bounding Box Calculation
    let minX = width, maxX = 0, minY = height, maxY = 0;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    // Add padding to bounding box
    const padding = 20;
    minX = Math.max(0, minX - padding);
    maxX = Math.min(width, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(height, maxY + padding);

    // 1. Draw connections (Skeleton Lines)
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm base connectors
      [5, 9], [9, 13], [13, 17]
    ];

    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(points[start].x, points[start].y);
      ctx.lineTo(points[end].x, points[end].y);
      
      // Draw neon-mint glow for fingers, violet for base
      const isThumb = start <= 4 && end <= 4;
      ctx.strokeStyle = isThumb 
        ? "rgba(247, 37, 133, 0.6)" // Pink glow for thumb
        : "rgba(0, 245, 212, 0.6)"; // Mint glow for fingers
        
      ctx.shadowBlur = 8;
      ctx.shadowColor = isThumb ? "#f72585" : "#00f5d4";
      ctx.stroke();
    });

    // 2. Draw Keypoint Nodes
    points.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === 0 || idx % 4 === 0 ? 6 : 4, 0, 2 * Math.PI);
      
      // Select glowing color
      if (idx === 0) {
        ctx.fillStyle = "#9d4edd"; // Violet for Wrist
        ctx.shadowColor = "#9d4edd";
      } else if (idx <= 4) {
        ctx.fillStyle = "#f72585"; // Pink for Thumb
        ctx.shadowColor = "#f72585";
      } else {
        ctx.fillStyle = "#00f5d4"; // Neon Mint for other fingers
        ctx.shadowColor = "#00f5d4";
      }
      
      ctx.shadowBlur = 10;
      ctx.fill();
    });

    // 3. Draw Bounding Box (Glow border with status text)
    ctx.shadowBlur = 15;
    ctx.shadowColor = confidence > 70 ? "#00f5d4" : "#9d4edd";
    ctx.strokeStyle = confidence > 70 ? "rgba(0, 245, 212, 0.8)" : "rgba(157, 78, 221, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    // Draw tiny corners for styling
    const cornerLen = 12;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    
    // Top-Left corner
    ctx.beginPath(); ctx.moveTo(minX + cornerLen, minY); ctx.lineTo(minX, minY); ctx.lineTo(minX, minY + cornerLen); ctx.stroke();
    // Top-Right corner
    ctx.beginPath(); ctx.moveTo(maxX - cornerLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + cornerLen); ctx.stroke();
    // Bottom-Left corner
    ctx.beginPath(); ctx.moveTo(minX + cornerLen, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - cornerLen); ctx.stroke();
    // Bottom-Right corner
    ctx.beginPath(); ctx.moveTo(maxX - cornerLen, maxY); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX, maxY - cornerLen); ctx.stroke();

    // 4. Draw Overlay Text Info inside bounding box
    if (gestureLabel && gestureLabel !== "Unknown") {
      ctx.fillStyle = confidence > 70 ? "#00f5d4" : "#9d4edd";
      ctx.font = "bold 14px monospace";
      ctx.shadowBlur = 5;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      const labelText = `${gestureLabel} (${confidence}%)`;
      ctx.fillText(labelText, minX + 5, minY - 8);
    }

  }, [rawLandmarks, isCameraActive, gestureLabel, confidence, canvasRef]);

  return (
    <div className="glass-panel success">
      <div className="panel-header">
        <h2 className="panel-title mint">
          <Cpu size={20} />
          CAMERA VISION & AI SKELETON
        </h2>
        {isCameraActive && (
          <div className="header-status">
            <span className="status-dot active"></span>
            <span>{fps} FPS // {activeHand.toUpperCase()} HAND</span>
          </div>
        )}
      </div>

      <div className="camera-wrapper">
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          autoPlay
          style={{ display: isCameraActive ? "block" : "none" }}
        />
        
        <canvas
          ref={canvasRef}
          className="camera-canvas"
          width={640}
          height={360}
          style={{ display: isCameraActive ? "block" : "none" }}
        />

        {(!isCameraActive || !isModelLoaded) && (
          <div className="camera-placeholder">
            {!isModelLoaded ? (
              <>
                <RefreshCw className="logo-icon animate-spin" size={40} />
                <p style={{ fontFamily: "monospace", letterSpacing: "1px" }}>
                  {loadingError || "LOADING AI MODELS IN BROWSER..."}
                </p>
              </>
            ) : (
              <>
                <CameraOff size={44} className="text-muted" />
                <p style={{ fontWeight: 600 }}>WEB CAMERA INACTIVE</p>
                <p className="text-secondary" style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: "80%" }}>
                  Enable the camera to activate real-time MediaPipe hand landmark tracking and AI translation.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="camera-actions">
        {isCameraActive ? (
          <button className="btn btn-pink" onClick={stopCamera} disabled={!isModelLoaded}>
            <CameraOff size={18} /> STOP TRANSLATOR
          </button>
        ) : (
          <button className="btn btn-mint" onClick={startCamera} disabled={!isModelLoaded}>
            <Camera size={18} /> START LIVE CAMERA
          </button>
        )}
        
        {loadingError && !isCameraActive && (
          <div style={{ color: "#f72585", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: "monospace" }}>
            <span>[ERROR] {loadingError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
