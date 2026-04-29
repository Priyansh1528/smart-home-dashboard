import { useState, useRef, useEffect } from "react";
import { Lightbulb, Fan, Wind, Tv, Lock, Mic, Send, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

/**
 * Smart Home Automation Dashboard
 * Design: Glassmorphism + Neon Cyberpunk
 * Focus: Real Web Speech API integration with smooth voice command feedback
 */

interface Device {
  id: string;
  name: string;
  icon: React.ReactNode;
  state: boolean;
  color: string;
}

interface ActivityLog {
  id: string;
  message: string;
  timestamp: Date;
  type: "command" | "action" | "status" | "error";
}

const VOICE_COMMANDS: Record<string, { device: string; action: boolean }> = {
  "let there be light": { device: "light", action: true },
  "it is too bright": { device: "light", action: false },
  "i am freezing": { device: "ac", action: false },
  "turn on the cooler": { device: "ac", action: true },
  "turn on the tv": { device: "tv", action: true },
  "open the pod bay doors": { device: "door", action: true },
  "lockdown": { device: "door", action: false },
  "turn on fan": { device: "fan", action: true },
  "turn off fan": { device: "fan", action: false },
  "close door": { device: "door", action: false },
};

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "light",
      name: "Light",
      icon: <Lightbulb className="w-8 h-8" />,
      state: false,
      color: "#ffd700",
    },
    {
      id: "fan",
      name: "Fan",
      icon: <Fan className="w-8 h-8" />,
      state: false,
      color: "#00ff88",
    },
    {
      id: "ac",
      name: "AC",
      icon: <Wind className="w-8 h-8" />,
      state: false,
      color: "#00d9ff",
    },
    {
      id: "tv",
      name: "TV",
      icon: <Tv className="w-8 h-8" />,
      state: false,
      color: "#ff6b9d",
    },
    {
      id: "door",
      name: "Main Door",
      icon: <Lock className="w-8 h-8" />,
      state: false,
      color: "#ff00ff",
    },
  ]);

  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "init",
      message: "Dashboard initialized",
      timestamp: new Date(),
      type: "status",
    },
  ]);

  const [voiceInput, setVoiceInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<{
    status: "listening" | "processing" | "success" | "error";
    message: string;
  } | null>(null);

  const [useSimulation, setUseSimulation] = useState(false);
  const [showModeToggle, setShowModeToggle] = useState(false);

  // Web Speech API integration
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: "en-US",
    continuous: false,
    interimResults: true,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);

  // Show mode toggle on first load if API not supported
  useEffect(() => {
    if (!isSupported) {
      setUseSimulation(true);
      setShowModeToggle(true);
      addActivityLog("Web Speech API not supported. Using simulation mode.", "status");
    }
  }, [isSupported]);

  // Handle speech recognition results
  useEffect(() => {
    if (isListening) {
      const displayText = interimTranscript || transcript;
      setVoiceInput(displayText);
    }
  }, [isListening, transcript, interimTranscript]);

  // Handle speech recognition end
  useEffect(() => {
    if (!isListening && transcript && !isProcessing) {
      // Auto-process when speech ends
      setTimeout(() => {
        processVoiceCommand(transcript);
      }, 300);
    }
  }, [isListening, transcript, isProcessing]);

  // Auto-scroll activity log
  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activityLog]);

  const addActivityLog = (message: string, type: ActivityLog["type"] = "action") => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      type,
    };
    setActivityLog((prev) => [...prev, newLog]);
  };

  const toggleDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, state: !device.state } : device
      )
    );

    const device = devices.find((d) => d.id === deviceId);
    const newState = !device?.state;
    const action = newState ? "ON" : "OFF";
    addActivityLog(`${device?.name} turned ${action}`, "action");
  };

  const processVoiceCommand = async (command: string) => {
    if (!command.trim()) return;

    const normalizedCommand = command.toLowerCase().trim();

    // Show processing feedback
    setIsProcessing(true);
    setCommandFeedback({
      status: "processing",
      message: `Processing: "${normalizedCommand}"`,
    });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check if command matches any known voice command
    const matchedCommand = Object.entries(VOICE_COMMANDS).find(
      ([key]) => key === normalizedCommand
    );

    if (matchedCommand) {
      const [, { device: deviceId, action }] = matchedCommand;
      const device = devices.find((d) => d.id === deviceId);

      // Update device state
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, state: action } : d
        )
      );

      setCommandFeedback({
        status: "success",
        message: `✓ ${device?.name} ${action ? "activated" : "deactivated"}`,
      });

      addActivityLog(
        `Voice: "${normalizedCommand}" → ${device?.name} ${action ? "ON" : "OFF"}`,
        "command"
      );
    } else {
      // Try fallback patterns
      let executed = false;

      if (normalizedCommand.includes("turn on") && normalizedCommand.includes("light")) {
        setDevices((prev) =>
          prev.map((d) => (d.id === "light" ? { ...d, state: true } : d))
        );
        executed = true;
      } else if (normalizedCommand.includes("turn off") && normalizedCommand.includes("light")) {
        setDevices((prev) =>
          prev.map((d) => (d.id === "light" ? { ...d, state: false } : d))
        );
        executed = true;
      } else if (normalizedCommand.includes("turn on") && normalizedCommand.includes("tv")) {
        setDevices((prev) =>
          prev.map((d) => (d.id === "tv" ? { ...d, state: true } : d))
        );
        executed = true;
      } else if (normalizedCommand.includes("turn off") && normalizedCommand.includes("tv")) {
        setDevices((prev) =>
          prev.map((d) => (d.id === "tv" ? { ...d, state: false } : d))
        );
        executed = true;
      }

      if (executed) {
        setCommandFeedback({
          status: "success",
          message: "✓ Command executed",
        });
        addActivityLog(`Voice: "${normalizedCommand}" → Executed`, "command");
      } else {
        setCommandFeedback({
          status: "error",
          message: "✗ Command not recognized",
        });
        addActivityLog(`Voice: "${normalizedCommand}" → Not recognized`, "command");
      }
    }

    setIsProcessing(false);

    // Clear feedback after 2 seconds
    setTimeout(() => {
      setCommandFeedback(null);
    }, 2000);

    resetTranscript();
    setVoiceInput("");
    inputRef.current?.focus();
  };

  const handleMicClick = () => {
    if (useSimulation) {
      // Simulation mode: focus input
      inputRef.current?.focus();
    } else {
      // Real speech recognition
      if (isListening) {
        stopListening();
      } else {
        resetTranscript();
        // Show listening feedback
        setCommandFeedback({
          status: "listening",
          message: "Listening... Speak clearly",
        });
        startListening();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isListening && !isProcessing) {
      processVoiceCommand(voiceInput);
    }
  };

  const toggleMode = () => {
    setUseSimulation(!useSimulation);
    if (!useSimulation) {
      stopListening();
    }
    resetTranscript();
    setVoiceInput("");
    setCommandFeedback(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-background to-purple-900/20" />
        <motion.div
          className="absolute top-1/4 -left-1/3 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-1/3 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          className="mb-12 text-center relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">
            Smart Home Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Control your devices with voice commands
          </p>

            {/* Mode Indicator */}
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              useSimulation
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                : isListening
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse"
                : "bg-green-500/20 text-green-300 border border-green-500/30"
            }`}>
              {useSimulation ? "Simulation Mode" : isListening ? "🎤 Listening..." : "Live Microphone"}
            </div>
            {isSupported && (
              <button
                onClick={toggleMode}
                className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                title="Toggle between real microphone and simulation mode"
              >
                Switch
              </button>
            )}
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Device Cards Section */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {devices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`glass rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                    device.state ? "neon-glow-active" : "neon-glow"
                  }`}
                  onClick={() => toggleDevice(device.id)}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <motion.div
                      className={`p-4 rounded-full transition-all duration-300 ${
                        device.state
                          ? "bg-opacity-30 neon-glow-active"
                          : "bg-opacity-10"
                      }`}
                      style={{
                        backgroundColor: device.state
                          ? `${device.color}40`
                          : `${device.color}20`,
                        color: device.state ? device.color : "#a0a0b0",
                      }}
                      animate={device.state ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {device.icon}
                    </motion.div>

                    <div className="text-center">
                      <h3 className="text-xl font-bold">{device.name}</h3>
                      <p
                        className={`text-sm font-medium transition-colors ${
                          device.state
                            ? "text-cyan-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {device.state ? "ON" : "OFF"}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <motion.div
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        device.state ? "bg-cyan-500/50" : "bg-gray-700/50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDevice(device.id);
                      }}
                    >
                      <motion.div
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                        animate={{ x: device.state ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Activity Log Section */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 h-full flex flex-col neon-glow">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Latest Activity
              </h2>

              <div className="flex-1 overflow-y-auto space-y-3 min-h-96">
                <AnimatePresence>
                  {activityLog.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className={`p-3 rounded-lg text-sm ${
                        log.type === "command"
                          ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
                          : log.type === "action"
                          ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                          : log.type === "error"
                          ? "bg-red-500/20 border border-red-500/30 text-red-300"
                          : "bg-gray-700/20 border border-gray-600/30 text-gray-300"
                      }`}
                    >
                      <div className="font-medium">{log.message}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={activityEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Voice Command Bar */}
        <motion.div
          className="glass rounded-2xl p-6 neon-glow sticky bottom-0 left-0 right-0 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex flex-col gap-4">
            {/* Error Messages */}
            <AnimatePresence>
              {speechError && !useSimulation && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-lg text-sm font-medium flex items-center gap-2 bg-red-500/20 text-red-300 border border-red-500/30"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{speechError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Command Feedback */}
            <AnimatePresence>
              {commandFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    commandFeedback.status === "listening"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : commandFeedback.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : commandFeedback.status === "success"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {commandFeedback.status === "listening" && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 h-4 bg-cyan-400 rounded-full"
                          animate={{ height: ["8px", "16px", "8px"] }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.1,
                            repeat: Infinity,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {commandFeedback.status === "processing" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Zap className="w-4 h-4" />
                    </motion.div>
                  )}
                  <span>{commandFeedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice Input */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={voiceInput}
                  onChange={(e) => setVoiceInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isListening || isProcessing}
                  placeholder={
                    useSimulation
                      ? "Enter voice command... (e.g., 'let there be light')"
                      : "Click mic to start listening..."
                  }
                  className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
                />
                <motion.button
                  onClick={handleMicClick}
                  disabled={isProcessing}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                    isListening
                      ? "bg-cyan-500/30 text-cyan-400"
                      : "text-muted-foreground hover:text-cyan-400"
                  }`}
                  animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  title={useSimulation ? "Simulation mode" : "Click to start listening"}
                >
                  <Mic className="w-5 h-5" />
                </motion.button>
              </div>

              <motion.button
                onClick={() => processVoiceCommand(voiceInput)}
                disabled={isListening || isProcessing || !voiceInput.trim()}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-background font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </motion.button>
            </div>

            {/* Example Commands */}
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-2">Try these commands:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="text-cyan-400/70">• "let there be light"</div>
                <div className="text-cyan-400/70">• "turn on the tv"</div>
                <div className="text-cyan-400/70">• "i am freezing"</div>
                <div className="text-cyan-400/70">• "lockdown"</div>
              </div>
            </div>

            {/* Mode Info */}
            {!isSupported && (
              <div className="text-xs text-yellow-400/70 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                💡 Web Speech API is not available in your browser. Using simulation mode. Try Chrome, Edge, or Safari.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
