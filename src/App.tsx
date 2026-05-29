import { useState, useRef, useEffect } from "react";
import { Sparkles, ShieldCheck, Heart } from "lucide-react";
import type { Point3D, GestureTemplate } from "./utils/aslLandmarks";
import { classifyGesture } from "./utils/gestureClassifier";
import { useHandTracker } from "./hooks/useHandTracker";
import { CameraFeed } from "./components/CameraFeed";
import { TrainingHub } from "./components/TrainingHub";
import { SignLanguageAvatar } from "./components/SignLanguageAvatar";
import { ChatInterface } from "./components/ChatInterface";

function App() {
  // Core tracking and ML states
  const [rawLandmarks, setRawLandmarks] = useState<Point3D[]>([]);
  const [activeHand, setActiveHand] = useState<"Left" | "Right" | "None">("None");
  const [gestureLabel, setGestureLabel] = useState("Unknown");
  const [confidence, setConfidence] = useState(0);
  
  // Custom local learning training templates
  const [customTemplates, setCustomTemplates] = useState<GestureTemplate[]>([]);

  // Text string queued to animate the digital avatar
  const [textToSign, setTextToSign] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load custom-trained gestures from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aurasign_templates");
      if (stored) {
        setCustomTemplates(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load local gesture templates:", e);
    }
  }, []);

  // MediaPipe callback when landmarks are found in webcam frame
  const handleLandmarksDetected = (landmarks: Point3D[], isRightHand: boolean) => {
    setRawLandmarks(landmarks);
    setActiveHand(isRightHand ? "Right" : "Left");

    // Run real-time KNN classification
    const classification = classifyGesture(landmarks, customTemplates);
    setGestureLabel(classification.label);
    setConfidence(classification.confidence);
  };

  // Callback when no hands are in viewport
  const handleTrackingLost = () => {
    setRawLandmarks([]);
    setActiveHand("None");
    setGestureLabel("Unknown");
    setConfidence(0);
  };

  // Initialize MediaPipe Hands hook
  const {
    isModelLoaded,
    isCameraActive,
    loadingError,
    fps,
    startCamera,
    stopCamera
  } = useHandTracker({
    videoRef,
    onLandmarksDetected: handleLandmarksDetected,
    onTrackingLost: handleTrackingLost
  });

  // Local storage training handlers
  const handleAddTemplate = (newTemplate: GestureTemplate) => {
    const updated = [newTemplate, ...customTemplates];
    setCustomTemplates(updated);
    localStorage.setItem("aurasign_templates", JSON.stringify(updated));
  };

  const handleClearTemplates = () => {
    if (confirm("Are you sure you want to delete all custom trained gestures?")) {
      setCustomTemplates([]);
      localStorage.removeItem("aurasign_templates");
    }
  };

  const handleSendToAvatar = (text: string) => {
    setTextToSign(text);
  };

  return (
    <div className="app-container">
      {/* Premium Cyber Header */}
      <header className="app-header">
        <div className="logo-section">
          <Sparkles className="logo-icon animate-pulse" size={28} />
          <div>
            <h1 className="logo-text" style={{ fontSize: "1.6rem", margin: 0, letterSpacing: "1px" }}>AURASIGN</h1>
            <div className="app-subtitle">REAL-TIME TWO-WAY SIGN TRANSLATOR</div>
          </div>
        </div>
        
        <div className="header-status" style={{ borderColor: isCameraActive ? "var(--neon-mint)" : "var(--neon-purple)" }}>
          <span className={`status-dot ${isCameraActive ? "active" : ""}`} style={{ background: isCameraActive ? "var(--neon-mint)" : "var(--neon-purple)", boxShadow: isCameraActive ? "0 0 8px var(--neon-mint)" : "0 0 8px var(--neon-purple)" }}></span>
          <span style={{ color: isCameraActive ? "var(--neon-mint)" : "var(--text-secondary)" }}>
            {isCameraActive ? `ACTIVE ENGINE // ${fps} FPS` : "ENGINE STANDBY"}
          </span>
        </div>
      </header>

      {/* Main Translation Grid */}
      <main className="dashboard-grid">
        
        {/* LEFT COLUMN: Input Camera Feed + local training controls */}
        <div className="translation-workspace">
          <CameraFeed
            videoRef={videoRef}
            canvasRef={canvasRef}
            isModelLoaded={isModelLoaded}
            isCameraActive={isCameraActive}
            loadingError={loadingError}
            fps={fps}
            activeHand={activeHand}
            gestureLabel={gestureLabel}
            confidence={confidence}
            startCamera={startCamera}
            stopCamera={stopCamera}
            rawLandmarks={rawLandmarks}
          />
          
          <TrainingHub
            rawLandmarks={rawLandmarks}
            customTemplates={customTemplates}
            onAddTemplate={handleAddTemplate}
            onClearTemplates={handleClearTemplates}
            gestureLabel={gestureLabel}
            confidence={confidence}
          />
        </div>

        {/* RIGHT COLUMN: Output Sign Language Avatar + Unified Chat Interface */}
        <div className="translation-workspace">
          <SignLanguageAvatar textToSign={textToSign} />
          
          <ChatInterface
            gestureLabel={gestureLabel}
            confidence={confidence}
            onSendToAvatar={handleSendToAvatar}
          />
        </div>
      </main>

      {/* Modern Cyber Footer Details */}
      <footer style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "1rem 1.5rem", 
        background: "rgba(15, 22, 36, 0.4)", 
        border: "1px solid rgba(255, 255, 255, 0.05)", 
        borderRadius: "12px",
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        fontFamily: "monospace"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={14} style={{ color: "var(--neon-mint)" }} />
          <span>CLIENT-SIDE ML (PRIVACY SECURED)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span>CRAFTED WITH</span>
          <Heart size={12} style={{ color: "var(--neon-pink)", fill: "var(--neon-pink)" }} />
          <span>FOR ACCESSIBILITY AND EQUALITY</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
