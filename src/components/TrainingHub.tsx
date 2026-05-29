import { useState, useEffect } from "react";
import { Award, Database, Trash2, Plus, Zap, AlertCircle } from "lucide-react";
import type { Point3D, GestureTemplate } from "../utils/aslLandmarks";
import { PRESEEDED_GESTURES } from "../utils/aslLandmarks";
import { normalizeLandmarks, detectFingerExtensions } from "../utils/gestureClassifier";

interface TrainingHubProps {
  rawLandmarks: Point3D[];
  customTemplates: GestureTemplate[];
  onAddTemplate: (newTemplate: GestureTemplate) => void;
  onClearTemplates: () => void;
  gestureLabel: string;
  confidence: number;
}

export function TrainingHub({
  rawLandmarks,
  customTemplates,
  onAddTemplate,
  onClearTemplates,
  gestureLabel,
  confidence
}: TrainingHubProps) {
  const [newLabel, setNewLabel] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState<"seeded" | "custom">("seeded");

  // Handles recording countdown and sample collection
  useEffect(() => {
    if (!isRecording) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 700);
      return () => clearTimeout(timer);
    }

    // Capture the normalized landmarks
    if (rawLandmarks.length === 21) {
      const normalized = normalizeLandmarks(rawLandmarks);
      const extensions = detectFingerExtensions(rawLandmarks);
      
      const newTemplate: GestureTemplate = {
        name: newLabel.trim().toUpperCase(),
        fingerExtensions: extensions,
        description: `Custom recorded gesture: ${newLabel}`,
        landmarks: normalized
      };

      onAddTemplate(newTemplate);
      
      // Flash success and stop recording
      setIsRecording(false);
      setNewLabel("");
    } else {
      // Hand not in view, wait/retry
      setIsRecording(false);
      alert("Capture Failed: Please keep your hand fully in front of the camera skeleton.");
    }
  }, [isRecording, countdown, rawLandmarks, newLabel]);

  const handleStartCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (rawLandmarks.length === 0) {
      alert("No hand detected. Please position your hand in front of the camera before capturing.");
      return;
    }

    setIsRecording(true);
    setCountdown(3); // 3-second delay to position hand
  };

  // Group preseeded by name
  const preseededNames = Array.from(new Set(PRESEEDED_GESTURES.map(g => g.name)));

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2 className="panel-title pink">
          <Database size={20} />
          AI TRAINING HUB (LOCAL LEARNING)
        </h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">System Library</span>
          <span className="stat-value">{PRESEEDED_GESTURES.length} Gestures</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">User Custom Library</span>
          <span className="stat-value purple">{customTemplates.length} Trained</span>
        </div>
      </div>

      {/* Record New Gesture Form */}
      <form onSubmit={handleStartCapture} className="training-form">
        <div className="input-group">
          <label className="input-label" htmlFor="gesture-input">
            TRAIN A NEW CUSTOM SIGN (REAL-TIME MODEL FINE-TUNING)
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="gesture-input"
              className="chat-input"
              type="text"
              placeholder="e.g., Water, Help, Yes, Code..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              disabled={isRecording}
              maxLength={15}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!newLabel.trim() || isRecording || rawLandmarks.length === 0}
            >
              <Plus size={18} /> TRAIN
            </button>
          </div>
        </div>
      </form>

      {/* Countdown overlay indicator */}
      {isRecording && (
        <div className="training-indicator">
          <Zap className="animate-bounce" size={18} />
          <span>
            {countdown > 0 
              ? `HOLD SHAPE! Capturing in ${countdown}...` 
              : "CAPTURING LANDMARK MATRIX..."}
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((3 - countdown) / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Database tab switcher */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem", marginTop: "0.5rem" }}>
        <button
          className={`btn btn-secondary ${activeTab === "seeded" ? "active" : ""}`}
          style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
          onClick={() => setActiveTab("seeded")}
        >
          Baseline ASL Library
        </button>
        <button
          className={`btn btn-secondary ${activeTab === "custom" ? "active" : ""}`}
          style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
          onClick={() => setActiveTab("custom")}
        >
          Custom Gestures ({customTemplates.length})
        </button>
      </div>

      {activeTab === "seeded" ? (
        <div>
          <p style={{ fontSize: "0.8rem", color: "--text-secondary", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Award size={14} style={{ color: "var(--neon-mint)" }} />
            Active Baseline Sign Vocabulary:
          </p>
          <div className="asl-letter-grid">
            {preseededNames.map((name) => {
              const isActive = gestureLabel === name && confidence > 70;
              return (
                <div 
                  key={name} 
                  className={`asl-letter-badge ${isActive ? "trained" : ""}`}
                  title={`Test shape: ${name}`}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {customTemplates.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px" }}>
              <AlertCircle size={20} className="text-muted" style={{ margin: "0 auto 0.5rem" }} />
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                No custom gestures trained yet. Enter a label above and perform a hand gesture to teach the AI!
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: "120px", overflowY: "auto" }}>
                {customTemplates.map((template, idx) => {
                  const isActive = gestureLabel === template.name && confidence > 70;
                  return (
                    <div 
                      key={idx} 
                      className={`asl-letter-badge ${isActive ? "trained" : ""}`}
                      style={{ borderStyle: "dashed" }}
                    >
                      {template.name}
                    </div>
                  );
                })}
              </div>
              <button 
                className="btn btn-pink" 
                style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", alignSelf: "flex-end" }}
                onClick={onClearTemplates}
              >
                <Trash2 size={14} /> Clear Trained Data
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
