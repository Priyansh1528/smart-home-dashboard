import { useState, useCallback, useRef, useEffect } from "react";

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Custom hook for Web Speech API integration
 * Provides real-time speech-to-text transcription with graceful fallback
 * 
 * Design: Glassmorphism + Neon Cyberpunk
 * Focus: Real microphone input with smooth, clean feedback
 */
export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    language = "en-US",
    continuous = false,
    interimResults = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isSupported = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasDetectedSpeechRef = useRef(false);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      isSupported.current = false;
      return;
    }

    isSupported.current = true;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.language = language;
    // Increase timeout for better speech detection
    recognition.maxAlternatives = 1;

    // Handle speech recognition results
    recognition.onresult = (event: any) => {
      // Clear silence timeout when speech is detected
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      hasDetectedSpeechRef.current = true;

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcriptSegment + " ";
        } else {
          interim += transcriptSegment;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        setTranscript((prev) => prev + final);
      }
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      const errorMessage = event.error;
      console.error("Speech Recognition Error:", errorMessage);

      // Map error codes to user-friendly messages
      const errorMap: Record<string, string> = {
        "no-speech": "No speech detected. Please speak clearly and try again.",
        "audio-capture": "No microphone found. Please check your device.",
        "network": "Network error. Please check your connection.",
        "not-allowed": "Microphone access denied. Please allow microphone access.",
        "service-not-allowed": "Speech recognition service not allowed.",
      };

      const userMessage = errorMap[errorMessage] || `Error: ${errorMessage}`;
      setError(userMessage);

      // Only stop listening if we haven't detected any speech
      // This allows the user to retry without restarting
      if (errorMessage === "no-speech" && !hasDetectedSpeechRef.current) {
        // Auto-retry after a short delay
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.abort();
              setTimeout(() => {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              }, 100);
            } catch (e) {
              console.error("Error restarting recognition:", e);
            }
          }
        }, 500);
      }
    };

    // Handle end of speech recognition
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };

    // Handle start of speech recognition
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      hasDetectedSpeechRef.current = false;

      // Set a timeout for silence detection (15 seconds)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening && !hasDetectedSpeechRef.current) {
          recognitionRef.current.abort();
          setError("No speech detected. Please try again.");
        }
      }, 15000);
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, interimResults, language]);

  const startListening = useCallback(() => {
    if (!isSupported.current) {
      setError("Speech Recognition not supported in your browser");
      return;
    }

    if (recognitionRef.current) {
      try {
        setTranscript("");
        setInterimTranscript("");
        setError(null);
        hasDetectedSpeechRef.current = false;
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting recognition:", e);
        setError("Failed to start microphone. Please try again.");
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    hasDetectedSpeechRef.current = false;
  }, []);

  return {
    isListening,
    isSupported: isSupported.current,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
