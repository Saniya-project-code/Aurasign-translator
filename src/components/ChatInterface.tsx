import { useState, useEffect, useRef } from "react";
import { MessageSquare, Mic, MicOff, Volume2, Send, ShieldAlert } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "signer" | "speaker";
  text: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  gestureLabel: string;
  confidence: number;
  onSendToAvatar: (text: string) => void;
}

export function ChatInterface({
  gestureLabel,
  confidence,
  onSendToAvatar
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "speaker",
      text: "Welcome to AuraSign! I can speak and voice transcribe. Start signing to translate into speech, or talk into your mic to sign back!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [textInput, setTextInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const historyEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Track stable gesture to avoid vocalizing noise
  const lastGestureRef = useRef("");
  const gestureStableTimerRef = useRef<any>(null);

  // Auto-scroll chat history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech Recognition API Initialization
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Speech Recognition API not supported in this browser. (Use Chrome/Edge).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        const newMsg: ChatMessage = {
          id: `speaker-${Date.now()}`,
          sender: "speaker",
          text: transcript,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, newMsg]);
        onSendToAvatar(transcript); // Animate avatar
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error !== "no-speech") {
        setSpeechError(`Voice Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [onSendToAvatar]);

  // Handle Gesture Translation triggers Text-To-Speech (TTS) & chat addition
  useEffect(() => {
    if (!gestureLabel || gestureLabel === "Unknown" || confidence < 75) {
      if (gestureStableTimerRef.current) {
        clearTimeout(gestureStableTimerRef.current);
      }
      return;
    }

    // If gesture changes, set a debounce timer to verify stability (800ms hold)
    if (gestureLabel !== lastGestureRef.current) {
      if (gestureStableTimerRef.current) {
        clearTimeout(gestureStableTimerRef.current);
      }

      gestureStableTimerRef.current = setTimeout(() => {
        // Confirmed stable sign posture
        lastGestureRef.current = gestureLabel;

        const newMsg: ChatMessage = {
          id: `signer-${Date.now()}`,
          sender: "signer",
          text: gestureLabel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, newMsg]);

        // Synthesize spoken audio (TTS)
        if (ttsEnabled && window.speechSynthesis) {
          window.speechSynthesis.cancel(); // clear queue
          const utterance = new SpeechSynthesisUtterance(gestureLabel);
          utterance.rate = 1.0;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      }, 900);
    }

    return () => {
      if (gestureStableTimerRef.current) {
        clearTimeout(gestureStableTimerRef.current);
      }
    };
  }, [gestureLabel, confidence, ttsEnabled]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition", e);
      }
    }
  };

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `manual-${Date.now()}`,
      sender: "speaker",
      text: textInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    onSendToAvatar(textInput); // Sign back in avatar
    setTextInput("");
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <MessageSquare size={20} />
          TWO-WAY CHAT TRANSLATOR
        </h2>
        
        {/* TTS Toggle Button */}
        <button
          className={`btn btn-secondary ${ttsEnabled ? "active" : ""}`}
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
          onClick={() => setTtsEnabled(!ttsEnabled)}
          title={ttsEnabled ? "Speech Output Active" : "Speech Output Muted"}
        >
          <Volume2 size={15} /> {ttsEnabled ? "TTS ON" : "TTS MUTED"}
        </button>
      </div>

      <div className="chat-container">
        {/* Conversations Timeline */}
        <div className="chat-history">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-bubble ${msg.sender}`}
            >
              <div style={{ fontWeight: 700, fontSize: "0.75rem", marginBottom: "0.15rem", color: msg.sender === "signer" ? "var(--neon-mint)" : "var(--neon-purple)" }}>
                {msg.sender === "signer" ? "SIGN TRANSLATION (DEAF)" : "VOCALIZED RESPONSE (HEARING)"}
              </div>
              <div>{msg.text}</div>
              <div className="chat-bubble-meta">
                <span>{msg.timestamp}</span>
              </div>
            </div>
          ))}
          <div ref={historyEndRef} />
        </div>

        {/* Input Dock */}
        <form onSubmit={handleManualSend} className="chat-input-area">
          {/* Micro Listening Button */}
          <button
            type="button"
            className={`btn ${isListening ? "btn-pink" : "btn-primary"}`}
            style={{ 
              padding: "0.75rem", 
              borderRadius: "8px",
              animation: isListening ? "pulse-border 1.2s infinite alternate" : "none"
            }}
            onClick={handleToggleListening}
            title={isListening ? "Listening..." : "Tap to Speak"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            className="chat-input"
            type="text"
            placeholder={isListening ? "Speaking... listening to microphone" : "Type a response to sign back..."}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isListening}
          />
          
          <button 
            type="submit" 
            className="btn btn-mint"
            style={{ padding: "0.75rem", borderRadius: "8px" }}
            disabled={!textInput.trim() || isListening}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {speechError && (
        <div style={{ color: "#f72585", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "-0.5rem" }}>
          <ShieldAlert size={14} />
          <span>{speechError}</span>
        </div>
      )}
    </div>
  );
}
