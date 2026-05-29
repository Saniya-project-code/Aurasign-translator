import { useEffect, useRef, useState } from "react";
import { UserCheck, Play, Pause, RotateCcw } from "lucide-react";

interface SignLanguageAvatarProps {
  textToSign: string;
}

interface Joint {
  x: number;
  y: number;
}

export function SignLanguageAvatar({ textToSign }: SignLanguageAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Animation state controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentWord, setCurrentWord] = useState("");
  const [currentLetterIdx, setCurrentLetterIdx] = useState(-1);
  const [signingSpeed, setSigningSpeed] = useState(800); // ms per letter
  
  // Internal animation state refs (for direct canvas-loop access)
  const animStateRef = useRef({
    textQueue: [] as string[],
    currentWordIdx: 0,
    currentLetterIdx: -1,
    lastStepTime: 0,
    activeGesture: "idle", // "idle", "hello", "thankyou", "yes", "no", "fingerspell"
    gestureProgress: 0, // 0 to 1
  });

  // Joint positions for skeletal ease animation
  const jointsRef = useRef({
    // Left Shoulder, Elbow, Wrist
    lShoulder: { x: 120, y: 190 } as Joint,
    lElbow: { x: 90, y: 250 } as Joint,
    lWrist: { x: 100, y: 300 } as Joint,
    
    // Right Shoulder, Elbow, Wrist (the active signing arm)
    rShoulder: { x: 280, y: 190 } as Joint,
    rElbow: { x: 310, y: 250 } as Joint,
    rWrist: { x: 300, y: 220 } as Joint,
    
    // Head and Neck
    head: { x: 200, y: 90 } as Joint,
    mouthSize: 2,
    blinkState: 0, // 0 = open, 1 = closed
    
    // Finger extensions [Thumb, Index, Middle, Ring, Pinky] (0 to 1 scale)
    fingers: [0.2, 0.2, 0.2, 0.2, 0.2] as number[],
    fingerSpread: 0.1
  });

  // Track text updates
  useEffect(() => {
    if (!textToSign.trim()) return;

    // Clean text and split into words
    const words = textToSign
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (words.length > 0) {
      animStateRef.current.textQueue = words;
      animStateRef.current.currentWordIdx = 0;
      animStateRef.current.currentLetterIdx = -1;
      animStateRef.current.lastStepTime = performance.now();
      
      const firstWord = words[0];
      setCurrentWord(firstWord);
      
      // Determine if first word is a special gesture
      if (["HELLO", "HI", "BYE", "GOODBYE"].includes(firstWord)) {
        animStateRef.current.activeGesture = "hello";
      } else if (["THANK", "THANKS", "THANKYOU"].includes(firstWord)) {
        animStateRef.current.activeGesture = "thankyou";
      } else if (["YES"].includes(firstWord)) {
        animStateRef.current.activeGesture = "yes";
      } else if (["NO"].includes(firstWord)) {
        animStateRef.current.activeGesture = "no";
      } else {
        animStateRef.current.activeGesture = "fingerspell";
        animStateRef.current.currentLetterIdx = 0;
        setCurrentLetterIdx(0);
      }
      animStateRef.current.gestureProgress = 0;
    }
  }, [textToSign]);

  // Main high-performance render and physics interpolation loop
  useEffect(() => {
    let animId: number;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const joints = jointsRef.current;
    const state = animStateRef.current;

    const animate = (timestamp: number) => {
      // 1. Process Timeline States (Word Gestures & Fingerspelling)
      if (isPlaying && state.textQueue.length > 0) {
        const timeDiff = timestamp - state.lastStepTime;
        const currentWordStr = state.textQueue[state.currentWordIdx] || "";
        
        if (state.activeGesture === "fingerspell") {
          // Progress letters
          if (timeDiff >= signingSpeed) {
            const nextLetterIdx = state.currentLetterIdx + 1;
            if (nextLetterIdx < currentWordStr.length) {
              state.currentLetterIdx = nextLetterIdx;
              setCurrentLetterIdx(nextLetterIdx);
              state.lastStepTime = timestamp;
            } else {
              // End of word, move to next word or idle
              const nextWordIdx = state.currentWordIdx + 1;
              if (nextWordIdx < state.textQueue.length) {
                state.currentWordIdx = nextWordIdx;
                const nextWord = state.textQueue[nextWordIdx];
                setCurrentWord(nextWord);
                state.lastStepTime = timestamp;
                
                // Re-evaluate word category
                if (["HELLO", "HI", "BYE"].includes(nextWord)) {
                  state.activeGesture = "hello";
                } else if (["THANK", "THANKS", "THANKYOU"].includes(nextWord)) {
                  state.activeGesture = "thankyou";
                } else if (["YES"].includes(nextWord)) {
                  state.activeGesture = "yes";
                } else if (["NO"].includes(nextWord)) {
                  state.activeGesture = "no";
                } else {
                  state.activeGesture = "fingerspell";
                  state.currentLetterIdx = 0;
                  setCurrentLetterIdx(0);
                }
                state.gestureProgress = 0;
              } else {
                // Done signing all text queue
                state.activeGesture = "idle";
                state.currentLetterIdx = -1;
                setCurrentLetterIdx(-1);
                setCurrentWord("");
              }
            }
          }
        } else if (state.activeGesture !== "idle") {
          // Progress word-level macro gesture animations
          const duration = state.activeGesture === "hello" ? 1500 : 2000;
          const prog = Math.min(1, timeDiff / duration);
          state.gestureProgress = prog;

          if (prog >= 1) {
            // Finished current gesture word, load next word
            const nextWordIdx = state.currentWordIdx + 1;
            if (nextWordIdx < state.textQueue.length) {
              state.currentWordIdx = nextWordIdx;
              const nextWord = state.textQueue[nextWordIdx];
              setCurrentWord(nextWord);
              state.lastStepTime = timestamp;
              
              if (["HELLO", "HI", "BYE"].includes(nextWord)) {
                state.activeGesture = "hello";
              } else if (["THANK", "THANKS", "THANKYOU"].includes(nextWord)) {
                state.activeGesture = "thankyou";
              } else if (["YES"].includes(nextWord)) {
                state.activeGesture = "yes";
              } else if (["NO"].includes(nextWord)) {
                state.activeGesture = "no";
              } else {
                state.activeGesture = "fingerspell";
                state.currentLetterIdx = 0;
                setCurrentLetterIdx(0);
              }
              state.gestureProgress = 0;
            } else {
              state.activeGesture = "idle";
              setCurrentWord("");
            }
          }
        }
      }

      // 2. Compute Target Joint Positions based on active state
      let targetRWrist = { x: 300, y: 260 }; // Rest position
      let targetRElbow = { x: 320, y: 260 };
      let targetFingers = [0.2, 0.2, 0.2, 0.2, 0.2]; // Fist (idle)
      let targetSpread = 0.1;
      let targetMouth = 2; // closed
      
      // Left arm resting idle
      let targetLWrist = { x: 100, y: 260 };
      let targetLElbow = { x: 80, y: 260 };

      // Periodic blink calculation
      joints.blinkState = Math.sin(timestamp / 500) > 0.97 ? 1 : 0;

      // Handle Mouth opening slightly during signing (mimicking vocalization)
      if (state.activeGesture !== "idle") {
        targetMouth = 5 + Math.sin(timestamp / 100) * 3;
      }

      // Gesture state animations
      if (state.activeGesture === "hello") {
        // Salute forehead then wave outwards
        const progress = state.gestureProgress;
        targetMouth = 7;
        
        if (progress < 0.3) {
          // Move up to temple
          targetRWrist = { x: 260, y: 100 };
          targetRElbow = { x: 330, y: 150 };
          targetFingers = [1, 1, 1, 1, 1]; // Open hand
        } else {
          // Wave out to the side
          const wave = Math.sin((progress - 0.3) * Math.PI * 4) * 20;
          targetRWrist = { x: 330 + wave, y: 110 };
          targetRElbow = { x: 340, y: 160 };
          targetFingers = [1, 1, 1, 1, 1];
          targetSpread = 0.3;
        }
      } else if (state.activeGesture === "thankyou") {
        // Touch chin then extend flat hand down towards viewer
        const progress = state.gestureProgress;
        targetMouth = 8;
        
        if (progress < 0.4) {
          // Touch chin
          targetRWrist = { x: 215, y: 125 };
          targetRElbow = { x: 260, y: 210 };
          targetFingers = [0, 1, 1, 1, 1]; // Flat open palm
        } else {
          // Sweep forward and down
          const t = (progress - 0.4) / 0.6;
          targetRWrist = { 
            x: 215 + (280 - 215) * t, 
            y: 125 + (185 - 125) * t 
          };
          targetRElbow = { x: 290, y: 230 };
          targetFingers = [0, 1, 1, 1, 1];
        }
      } else if (state.activeGesture === "yes") {
        // Shake fist forward/backward (ASL 'Yes' nod)
        const progress = state.gestureProgress;
        const nod = Math.sin(progress * Math.PI * 6) * 15;
        targetRWrist = { x: 250, y: 160 + nod };
        targetRElbow = { x: 290, y: 210 };
        targetFingers = [0, 0, 0, 0, 0]; // Closed Fist
      } else if (state.activeGesture === "no") {
        // Snap Index and Middle finger onto Thumb repeatedly
        const progress = state.gestureProgress;
        const snap = Math.sin(progress * Math.PI * 8) > 0 ? 0.8 : 0.1;
        targetRWrist = { x: 250, y: 160 };
        targetRElbow = { x: 290, y: 210 };
        // Index and Middle snap, Pinky and Ring are curled
        targetFingers = [snap, snap, snap, 0, 0];
      } else if (state.activeGesture === "fingerspell") {
        // Letters Fingerspelling definitions
        const currentWordStr = state.textQueue[state.currentWordIdx] || "";
        const letter = currentWordStr[state.currentLetterIdx] || "";

        // Positioning right wrist closer to neck level for optimal visual reading
        targetRWrist = { x: 260, y: 155 };
        targetRElbow = { x: 310, y: 210 };

        // Finger extensions profiles [Thumb, Index, Middle, Ring, Pinky]
        switch (letter) {
          case "A": targetFingers = [0, 0, 0, 0, 0]; break;
          case "B": targetFingers = [0, 1, 1, 1, 1]; targetSpread = 0.05; break;
          case "C": targetFingers = [0.6, 0.6, 0.6, 0.6, 0.6]; break;
          case "D": targetFingers = [0, 1, 0, 0, 0]; break;
          case "E": targetFingers = [0.1, 0.1, 0.1, 0.1, 0.1]; break;
          case "F": targetFingers = [0, 0, 1, 1, 1]; break; // Index & Thumb touch, others open
          case "G": targetFingers = [1, 1, 0, 0, 0]; targetRWrist = { x: 250, y: 165 }; break;
          case "H": targetFingers = [0, 1, 1, 0, 0]; break;
          case "I": targetFingers = [0, 0, 0, 0, 1]; break;
          case "J": targetFingers = [0, 0, 0, 0, 1]; targetRWrist.x += Math.sin(timestamp / 50) * 10; break;
          case "K": targetFingers = [1, 1, 0.8, 0, 0]; break;
          case "L": targetFingers = [1, 1, 0, 0, 0]; break;
          case "M": targetFingers = [0.2, 0.1, 0.1, 0.1, 0.1]; break;
          case "N": targetFingers = [0.2, 0.1, 0.1, 0.1, 0.1]; break;
          case "O": targetFingers = [0.4, 0.4, 0.4, 0.4, 0.4]; break;
          case "P": targetFingers = [0.9, 0.9, 0.7, 0, 0]; targetRWrist = { x: 255, y: 180 }; break;
          case "Q": targetFingers = [0.8, 0.8, 0, 0, 0]; targetRWrist = { x: 255, y: 185 }; break;
          case "R": targetFingers = [0, 0.9, 0.9, 0, 0]; break; // Crossed fingers
          case "S": targetFingers = [0, 0, 0, 0, 0]; break;
          case "T": targetFingers = [0.3, 0.1, 0, 0, 0]; break;
          case "U": targetFingers = [0, 1, 1, 0, 0]; targetSpread = 0.01; break;
          case "V": targetFingers = [0, 1, 1, 0, 0]; targetSpread = 0.25; break;
          case "W": targetFingers = [0, 1, 1, 1, 0]; targetSpread = 0.2; break;
          case "X": targetFingers = [0, 0.5, 0, 0, 0]; break; // Hooked index
          case "Y": targetFingers = [1, 0, 0, 0, 1]; targetSpread = 0.4; break;
          case "Z": targetFingers = [0, 1, 0, 0, 0]; targetRWrist.x += Math.sin(timestamp / 30) * 12; break;
          default: targetFingers = [0.2, 0.2, 0.2, 0.2, 0.2];
        }
      }

      // 3. Physics Easing Interpolation (Lerp) for ultra-smooth movement
      const lerpSpeed = 0.15; // smooth factor
      
      const lerp = (cur: number, tar: number) => cur + (tar - cur) * lerpSpeed;
      
      joints.rWrist.x = lerp(joints.rWrist.x, targetRWrist.x);
      joints.rWrist.y = lerp(joints.rWrist.y, targetRWrist.y);
      joints.rElbow.x = lerp(joints.rElbow.x, targetRElbow.x);
      joints.rElbow.y = lerp(joints.rElbow.y, targetRElbow.y);

      joints.lWrist.x = lerp(joints.lWrist.x, targetLWrist.x);
      joints.lWrist.y = lerp(joints.lWrist.y, targetLWrist.y);
      joints.lElbow.x = lerp(joints.lElbow.x, targetLElbow.x);
      joints.lElbow.y = lerp(joints.lElbow.y, targetLElbow.y);

      joints.mouthSize = lerp(joints.mouthSize, targetMouth);
      joints.fingerSpread = lerp(joints.fingerSpread, targetSpread);

      for (let i = 0; i < 5; i++) {
        joints.fingers[i] = lerp(joints.fingers[i], targetFingers[i]);
      }

      // 4. DRAW AVATAR TO CANVAS
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid/Cyber background lines
      ctx.strokeStyle = "rgba(157, 78, 221, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // A. Draw Torso & Clothes (Cyber jacket)
      ctx.beginPath();
      ctx.moveTo(70, 300);
      ctx.bezierCurveTo(90, 210, 120, 180, 160, 180);
      ctx.lineTo(240, 180);
      ctx.bezierCurveTo(280, 180, 310, 210, 330, 300);
      ctx.closePath();
      
      const grad = ctx.createLinearGradient(100, 180, 300, 300);
      grad.addColorStop(0, "rgba(22, 33, 54, 0.9)");
      grad.addColorStop(0.5, "rgba(123, 44, 191, 0.2)");
      grad.addColorStop(1, "rgba(22, 33, 54, 0.9)");
      
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(157, 78, 221, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Cyber jacket collar neon lining
      ctx.beginPath();
      ctx.moveTo(150, 180);
      ctx.lineTo(200, 215);
      ctx.lineTo(250, 180);
      ctx.strokeStyle = "#00f5d4";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00f5d4";
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // B. Draw Head & Face
      const head = joints.head;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 42, 0, 2 * Math.PI);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Stylized Cyber Glasses
      ctx.beginPath();
      ctx.rect(head.x - 28, head.y - 12, 23, 14);
      ctx.rect(head.x + 5, head.y - 12, 23, 14);
      ctx.fillStyle = "rgba(0, 245, 212, 0.15)";
      ctx.strokeStyle = "#00f5d4";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#00f5d4";
      ctx.fill();
      ctx.stroke();
      
      // Sunglasses bridge
      ctx.beginPath();
      ctx.moveTo(head.x - 5, head.y - 5);
      ctx.lineTo(head.x + 5, head.y - 5);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw Eyes (if blinking)
      if (joints.blinkState === 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(head.x - 22, head.y - 5); ctx.lineTo(head.x - 8, head.y - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(head.x + 8, head.y - 5); ctx.lineTo(head.x + 22, head.y - 5); ctx.stroke();
      }

      // Mouth
      ctx.beginPath();
      ctx.ellipse(head.x, head.y + 16, 6, joints.mouthSize, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(247, 37, 133, 0.4)";
      ctx.fill();
      ctx.strokeStyle = "rgba(247, 37, 133, 0.8)";
      ctx.stroke();

      // C. Draw Left Arm (Resting/Stable)
      ctx.beginPath();
      ctx.moveTo(joints.lShoulder.x, joints.lShoulder.y);
      ctx.lineTo(joints.lElbow.x, joints.lElbow.y);
      ctx.lineTo(joints.lWrist.x, joints.lWrist.y);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.stroke();

      // D. Draw Right Arm (Signing Arm - Main skeletal line)
      ctx.beginPath();
      ctx.moveTo(joints.rShoulder.x, joints.rShoulder.y);
      ctx.lineTo(joints.rElbow.x, joints.rElbow.y);
      ctx.lineTo(joints.rWrist.x, joints.rWrist.y);
      ctx.strokeStyle = "rgba(157, 78, 221, 0.85)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#9d4edd";
      ctx.lineWidth = 9;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // E. Draw Signing Hand on Right Wrist
      const wrist = joints.rWrist;
      
      // Determine overall arm direction vector to align hands naturally
      const dx = wrist.x - joints.rElbow.x;
      const dy = wrist.y - joints.rElbow.y;
      const armAngle = Math.atan2(dy, dx) + Math.PI / 2; // Perpendicular alignment

      ctx.save();
      ctx.translate(wrist.x, wrist.y);
      ctx.rotate(armAngle);

      // Palm base
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#9d4edd";
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Render 5 stylized fingers dynamically extending from palm base
      const fingerAngles = [-0.6, -0.25, 0, 0.25, 0.6];
      
      for (let i = 0; i < 5; i++) {
        const ext = joints.fingers[i]; // 0 to 1
        const baseAngle = fingerAngles[i] * joints.fingerSpread;
        
        ctx.save();
        ctx.rotate(baseAngle);
        
        // Thumb curves out slightly more
        const length = i === 0 ? 18 : i === 4 ? 20 : 25;
        const drawLen = 4 + ext * length;
        
        ctx.beginPath();
        ctx.moveTo(i === 0 ? -6 : -8 + i * 4, -8);
        ctx.lineTo(i === 0 ? -12 : -8 + i * 4, -8 - drawLen);
        
        ctx.strokeStyle = ext > 0.6 ? "#00f5d4" : "rgba(157, 78, 221, 0.6)";
        ctx.lineWidth = i === 0 ? 4.5 : 3.5;
        ctx.lineCap = "round";
        
        if (ext > 0.6) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#00f5d4";
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, signingSpeed]);

  const handleRestart = () => {
    animStateRef.current.currentWordIdx = 0;
    animStateRef.current.currentLetterIdx = -1;
    animStateRef.current.lastStepTime = performance.now();
    if (animStateRef.current.textQueue.length > 0) {
      setCurrentWord(animStateRef.current.textQueue[0]);
      animStateRef.current.activeGesture = "fingerspell";
      animStateRef.current.currentLetterIdx = 0;
      setCurrentLetterIdx(0);
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <UserCheck size={20} />
          AI SIGN TRANSLATOR AVATAR
        </h2>
      </div>

      <div className="avatar-container">
        <canvas ref={canvasRef} className="avatar-canvas" width={400} height={300} />
        
        {currentWord && (
          <div className="avatar-caption">
            {animStateRef.current.activeGesture === "fingerspell" ? (
              <div>
                <span>SPELLING: </span>
                <span style={{ color: "white" }}>
                  {currentWord.split("").map((letter, i) => (
                    <span 
                      key={i} 
                      style={{ 
                        fontWeight: i === currentLetterIdx ? 800 : 400,
                        color: i === currentLetterIdx ? "var(--neon-mint)" : "rgba(255,255,255,0.4)",
                        textDecoration: i === currentLetterIdx ? "underline" : "none",
                        padding: "0 2px",
                        fontSize: i === currentLetterIdx ? "1.1rem" : "0.95rem"
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
              </div>
            ) : (
              <div>
                <span>SIGNING WORD: </span>
                <span style={{ color: "var(--neon-pink)", fontWeight: "bold", textTransform: "uppercase" }}>
                  {currentWord}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control console for avatar speed & playback */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: "0.5rem" }} 
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Signing" : "Play Signing"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button 
            className="btn btn-secondary" 
            style={{ padding: "0.5rem" }} 
            onClick={handleRestart}
            title="Restart Animation Sequence"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>SPEED:</span>
          <select 
            className="select-control" 
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "6px" }}
            value={signingSpeed}
            onChange={(e) => setSigningSpeed(Number(e.target.value))}
          >
            <option value={1200}>0.5x (Slow)</option>
            <option value={800}>1.0x (Normal)</option>
            <option value={450}>1.5x (Fast)</option>
            <option value={250}>2.0x (Hyper)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
