"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Mic } from "lucide-react";
import { SiriWaveSlot } from "./siri-wave-slot";
import { VoiceModeModal } from "./voice-mode-modal";
import type { IdeaTurn, ProjectBrief } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export interface SpeechToTextProps {
  onTranscript: (text: string) => void;
  className?: string;
  buttonLabel?: string;
  mode?: "conversational" | "dictation";
  initialSeed?: string;
  initialHistory?: IdeaTurn[];
  onSessionComplete?: (history: IdeaTurn[], brief?: ProjectBrief | null) => Promise<void> | void;
}

export function SpeechToText({
  onTranscript,
  className,
  buttonLabel = "Voice AI",
  mode = "conversational",
  initialSeed = "",
  initialHistory,
  onSessionComplete,
}: SpeechToTextProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [currentText, setCurrentText] = React.useState("");
  const [supported, setSupported] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  const [showConversationalModal, setShowConversationalModal] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const isActiveRef = React.useRef(false);
  const finalTranscriptRef = React.useRef("");

  React.useEffect(() => {
    setMounted(true);
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSupported(false);
    }
  }, []);

  const startListening = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    isActiveRef.current = true;
    finalTranscriptRef.current = "";
    setCurrentText("");

    const initRecognition = () => {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = "";
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res?.[0]) {
              if (res.isFinal) {
                finalTranscriptRef.current += res[0].transcript + " ";
              } else {
                interim += res[0].transcript;
              }
            }
          }
          const full = (finalTranscriptRef.current + interim).trim();
          setCurrentText(full);
        };

        recognition.onerror = (err) => {
          // "no-speech" is just Chrome detecting momentary silence - do NOT close modal
          if (err.error === "no-speech") {
            return;
          }
          if (err.error === "not-allowed") {
            alert("Microphone access was denied. Please allow microphone permissions in your browser.");
            stopListening();
          }
        };

        recognition.onend = () => {
          // If the user hasn't explicitly stopped, keep session alive seamlessly
          if (isActiveRef.current) {
            try {
              recognition.start();
            } catch {
              // Ignore if already starting
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition notice:", err);
      }
    };

    initRecognition();
  };

  const stopListening = (shouldSave = true) => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);

    if (shouldSave && currentText.trim()) {
      onTranscript(currentText.trim());
    }
  };

  const cancelListening = () => {
    stopListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening(true);
    } else {
      startListening();
    }
  };

  const handleButtonClick = () => {
    if (mode === "conversational") {
      setShowConversationalModal(true);
    } else {
      toggleListening();
    }
  };

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        aria-label={isListening || showConversationalModal ? "Stop listening" : "Start voice AI"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-200",
          isListening || showConversationalModal
            ? "border border-emerald-500 bg-forest-900 text-emerald-300 shadow-glow-sm animate-pulse"
            : "border border-rule bg-white text-mute hover:border-forest-500/50 hover:bg-forest-50 hover:text-forest-800 dark:border-dark-border dark:bg-dark-card dark:text-dark-mute dark:hover:border-forest-500/50 dark:hover:bg-forest-950/60 dark:hover:text-forest-200",
          className,
        )}
      >
        <Mic className={cn("h-3.5 w-3.5", (isListening || showConversationalModal) && "animate-bounce text-emerald-400")} />
        <span>{isListening || showConversationalModal ? "Active..." : buttonLabel}</span>
      </button>

      {/* Conversational Voice Mode (Gemini / ChatGPT Style) */}
      {mounted && showConversationalModal
        ? createPortal(
            <VoiceModeModal
              isOpen={showConversationalModal}
              initialSeed={initialSeed}
              initialHistory={initialHistory}
              onSessionComplete={onSessionComplete}
              onClose={() => setShowConversationalModal(false)}
              onApplyBrief={(summary) => {
                if (summary) onTranscript(summary);
                setShowConversationalModal(false);
              }}
            />,
            document.body,
          )
        : null}

      {/* Dictation Mode (Siri Wave Slot) */}
      {mounted && isListening && mode === "dictation"
        ? createPortal(
            <SiriWaveSlot
              isListening={isListening}
              transcript={currentText}
              onStop={() => stopListening(true)}
              onCancel={cancelListening}
            />,
            document.body,
          )
        : null}
    </>
  );
}
