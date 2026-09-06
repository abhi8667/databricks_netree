"use client";

import * as React from "react";
import {
  Check,
  CornerDownLeft,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import FluidVoiceOrb from "@/components/react-bits/fluid-voice-orb";
import { talkToResearchAgent } from "@/app/actions/projects";
import type { IdeaTurn, ProjectBrief } from "@/lib/types";
import { cn } from "@/lib/utils";

export type VoiceState = "listening" | "thinking" | "speaking" | "idle";

export interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBrief?: (text: string, brief?: ProjectBrief | null) => void;
  onSessionComplete?: (history: IdeaTurn[], brief?: ProjectBrief | null) => Promise<void> | void;
  initialSeed?: string;
  initialHistory?: IdeaTurn[];
}

export function VoiceModeModal({
  isOpen,
  onClose,
  onApplyBrief,
  onSessionComplete,
  initialSeed = "",
  initialHistory,
}: VoiceModeModalProps) {
  const [voiceState, setVoiceState] = React.useState<VoiceState>("listening");
  const [userTranscript, setUserTranscript] = React.useState("");
  const [history, setHistory] = React.useState<IdeaTurn[]>(initialHistory || []);
  const [aiSpeechText, setAiSpeechText] = React.useState("");
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [audioMuted, setAudioMuted] = React.useState(false);
  const [micMuted, setMicMuted] = React.useState(false);
  const [sessionSeconds, setSessionSeconds] = React.useState(0);
  const [lastBrief, setLastBrief] = React.useState<ProjectBrief | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const recognitionRef = React.useRef<any>(null);
  const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const synthUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = React.useRef(false);
  const activeSessionRef = React.useRef(false);

  // Timer for active call duration
  React.useEffect(() => {
    if (!isOpen) {
      setSessionSeconds(0);
      return;
    }
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Lock scroll
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const formatTimer = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Speaks AI message using Web Speech Synthesis
  const speakAiResponse = React.useCallback(
    (text: string, onComplete?: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onComplete?.();
        return;
      }
      window.speechSynthesis.cancel();

      if (audioMuted) {
        onComplete?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select a natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.lang.startsWith("en"),
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        setVoiceState("listening");
        onComplete?.();
      };

      utterance.onerror = () => {
        setVoiceState("listening");
        onComplete?.();
      };

      synthUtteranceRef.current = utterance;
      setVoiceState("speaking");
      window.speechSynthesis.speak(utterance);
    },
    [audioMuted],
  );

  // Send turn to backend Gemini agent
  const processUserTurn = React.useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const updatedHistory: IdeaTurn[] = [...history, { role: "user", content: text.trim() }];
      setHistory(updatedHistory);
      setUserTranscript("");
      setVoiceState("thinking");

      try {
        const res = await talkToResearchAgent(updatedHistory);
        if (res.ok && res.turn) {
          const aiReply = res.turn.reply;
          const nextHistory: IdeaTurn[] = [
            ...updatedHistory,
            { role: "assistant", content: aiReply },
          ];
          setHistory(nextHistory);
          setAiSpeechText(aiReply);
          if (res.turn.brief) setLastBrief(res.turn.brief);

          speakAiResponse(aiReply);
        } else {
          const fallback =
            "I heard your idea. What specific dataset or technical approach are you considering?";
          setAiSpeechText(fallback);
          speakAiResponse(fallback);
        }
      } catch (err) {
        console.warn("AI voice turn error:", err);
        setVoiceState("listening");
      }
    },
    [history, speakAiResponse],
  );

  // Setup Web Speech Recognition
  React.useEffect(() => {
    if (!isOpen) {
      activeSessionRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    isMountedRef.current = true;
    activeSessionRef.current = true;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      if (micMuted) return;

      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const combined = (final + interim).trim();
      if (combined) {
        setUserTranscript(combined);
        setVoiceState("listening");

        // Interrupt AI if it's currently speaking and user interrupts!
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        // Auto-turn debounce: if user stops speaking for 1.8s, submit turn automatically!
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (combined.length > 5 && activeSessionRef.current) {
            processUserTurn(combined);
          }
        }, 1800);
      }
    };

    recognition.onerror = (err: any) => {
      // no-speech is normal silence
      if (err.error === "no-speech") return;
      console.warn("Recognition notice:", err.error);
    };

    recognition.onend = () => {
      if (activeSessionRef.current && !micMuted) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // ignore
    }

    // Initial greeting if session starting fresh
    if (history.length === 0) {
      const greeting = initialSeed
        ? `I see you want to explore: ${initialSeed}. What problem are you trying to solve?`
        : "Hello! I'm Netree's research AI. What project idea would you like to explore today?";
      setAiSpeechText(greeting);
      setHistory([{ role: "assistant", content: greeting }]);
      speakAiResponse(greeting);
    }

    return () => {
      activeSessionRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, micMuted, initialSeed, processUserTurn, speakAiResponse, history.length]);

  const toggleMic = () => {
    if (micMuted) {
      setMicMuted(false);
      try {
        recognitionRef.current?.start();
      } catch {
        // ignore
      }
      setVoiceState("listening");
    } else {
      setMicMuted(true);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setVoiceState("idle");
    }
  };

  const toggleSpeaker = () => {
    if (audioMuted) {
      setAudioMuted(false);
    } else {
      setAudioMuted(true);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (voiceState === "speaking") setVoiceState("listening");
    }
  };

  const handleInterrupt = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState("listening");
  };

  const handleApplyAndFinish = async () => {
    setIsSaving(true);
    try {
      if (onSessionComplete) {
        await onSessionComplete(history, lastBrief);
      } else {
        const summary = lastBrief?.problem || history.find((t) => t.role === "user")?.content || "";
        onApplyBrief?.(summary, lastBrief);
      }
      onClose();
    } catch (err) {
      console.error("Failed to finish voice ideation:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex h-dvh w-screen flex-col items-center justify-between overflow-hidden bg-[#030805]/95 p-6 backdrop-blur-3xl transition-all duration-300 sm:p-10"
    >
      {/* Dynamic atmospheric lighting depending on state */}
      <div
        className={cn(
          "pointer-events-none absolute -left-36 -top-36 h-[600px] w-[600px] rounded-full blur-[180px] transition-all duration-700",
          voiceState === "listening" && "bg-emerald-500/20",
          voiceState === "thinking" && "bg-teal-400/25",
          voiceState === "speaking" && "bg-emerald-400/30",
          voiceState === "idle" && "bg-zinc-700/15",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -bottom-36 -right-36 h-[600px] w-[600px] rounded-full blur-[180px] transition-all duration-700",
          voiceState === "listening" && "bg-teal-500/20",
          voiceState === "thinking" && "bg-cyan-500/25",
          voiceState === "speaking" && "bg-forest-500/30",
          voiceState === "idle" && "bg-zinc-800/15",
        )}
      />

      {/* Top Header Bar (Gemini / ChatGPT Style) */}
      <header className="relative z-20 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Live Status Pill */}
          <div className="flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-forest-950/80 px-4 py-1.5 shadow-glow-sm backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75",
                  voiceState === "listening" && "animate-ping bg-emerald-400",
                  voiceState === "thinking" && "animate-pulse bg-teal-300",
                  voiceState === "speaking" && "animate-ping bg-mint-400",
                  voiceState === "idle" && "bg-zinc-500",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  voiceState === "listening" && "bg-emerald-500",
                  voiceState === "thinking" && "bg-teal-400",
                  voiceState === "speaking" && "bg-emerald-400",
                  voiceState === "idle" && "bg-zinc-400",
                )}
              />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              {voiceState === "listening" && "Listening"}
              {voiceState === "thinking" && "Thinking..."}
              {voiceState === "speaking" && "Netree AI Speaking"}
              {voiceState === "idle" && "Microphone Muted"}
            </span>
          </div>

          <span className="hidden font-mono text-xs text-zinc-400 sm:inline">
            {formatTimer(sessionSeconds)}
          </span>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2">
          {history.length > 1 && (
            <button
              type="button"
              onClick={() => setShowDrawer((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all",
                showDrawer
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:text-white",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Transcript ({history.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-400 transition-all hover:bg-white/15 hover:text-white"
            aria-label="End conversation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Stage: Borderless Organic Fluid Voice Orb & Live Subtitles */}
      <main className="relative z-10 my-auto flex w-full max-w-4xl flex-col items-center justify-center text-center">
        {/* 100% Borderless Organic Fluid Orb (ChatGPT Voice & Gemini Live) */}
        <FluidVoiceOrb
          state={voiceState}
          size={380}
          onClick={voiceState === "speaking" ? handleInterrupt : toggleMic}
        />

        {/* Dynamic Sound Equalizer Waveform Bars (Gemini Live style) */}
        <div className="mt-2 flex h-8 items-center justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
            <span
              key={bar}
              className={cn(
                "w-1 rounded-full transition-all duration-150",
                voiceState === "thinking"
                  ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  : voiceState === "speaking"
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    : voiceState === "listening"
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      : "bg-zinc-700",
              )}
              style={{
                height:
                  voiceState === "speaking"
                    ? `${Math.max(12, (Math.sin(bar * 1.1) + 1) * 12 + 6)}px`
                    : voiceState === "listening"
                      ? `${Math.max(8, (Math.sin(bar * 0.9) + 1) * 8 + 6)}px`
                      : voiceState === "thinking"
                        ? "14px"
                        : "4px",
                animationDelay: `${bar * 100}ms`,
                animationDuration: voiceState === "speaking" ? "450ms" : "900ms",
              }}
            />
          ))}
        </div>

        {/* Dynamic Voice Subtitles (ChatGPT / Gemini style text) */}
        <div className="relative z-10 mt-3 max-w-2xl px-6">
          {voiceState === "speaking" ? (
            <p className="min-h-[4rem] font-read text-xl leading-relaxed text-emerald-100 drop-shadow-md sm:text-2xl lg:text-3xl">
              &ldquo;{aiSpeechText}&rdquo;
            </p>
          ) : userTranscript ? (
            <p className="min-h-[4rem] font-read text-xl leading-relaxed text-white drop-shadow-md sm:text-2xl lg:text-3xl">
              &ldquo;{userTranscript}&rdquo;
            </p>
          ) : (
            <p className="min-h-[3.5rem] font-sans text-base leading-relaxed text-emerald-300/70 italic sm:text-lg">
              {voiceState === "thinking"
                ? "Synthesizing research questions..."
                : micMuted
                  ? "Microphone muted. Tap the mic button to speak."
                  : "Listening... speak freely about your hypothesis or research challenge."}
            </p>
          )}
        </div>
      </main>

      {/* Floating Control Bar Pill (Gemini Live & ChatGPT Voice HUD) */}
      <footer className="relative z-20 flex w-full max-w-lg flex-col items-center gap-3">
        <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/60 p-2.5 shadow-2xl backdrop-blur-2xl">
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-all",
              micMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
            title={micMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Interrupt AI Speech Button */}
          {voiceState === "speaking" && (
            <button
              type="button"
              onClick={handleInterrupt}
              className="flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-500/20 px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-teal-300 hover:bg-teal-500/30"
            >
              <span>Interrupt AI</span>
            </button>
          )}

          {/* Sound / Volume Toggle */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-all",
              audioMuted
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
            title={audioMuted ? "Unmute AI voice output" : "Mute AI voice output"}
          >
            {audioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Apply to Form / Insert Idea Button */}
          <button
            type="button"
            disabled={isSaving || history.filter((t) => t.role === "user").length === 0}
            onClick={handleApplyAndFinish}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-forest-950 shadow-glow transition-all hover:bg-emerald-400 hover:shadow-glow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>{isSaving ? "Saving Brief..." : "Finish Ideation & Save"}</span>
          </button>
        </div>

        {/* Dynamic Questions for Clarity Box */}
        {lastBrief?.open_questions && lastBrief.open_questions.length > 0 && (
          <div className="mt-2 w-full max-w-lg rounded-2xl border border-teal-500/30 bg-forest-950/90 p-3.5 text-left shadow-glow-sm backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-teal-300">
              <Sparkles className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
              <span>Questions for Clarity ({lastBrief.open_questions.length})</span>
            </div>
            <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-emerald-100">
              {lastBrief.open_questions.map((q, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-[10px] font-bold text-teal-400">0{idx + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="font-mono text-[11px] text-zinc-500">
          Two-way conversational AI powered by Gemini & Web Speech
        </p>
      </footer>

      {/* Slide-out Conversation Transcript Drawer */}
      {showDrawer && (
        <div className="absolute inset-y-0 right-0 z-30 w-full max-w-md border-l border-white/15 bg-black/90 p-6 shadow-2xl backdrop-blur-2xl transition-transform">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-read text-lg font-medium text-white">Conversation History</h3>
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex max-h-[calc(100vh-140px)] flex-col gap-3 overflow-y-auto pr-2">
            {history.map((turn, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl p-4 text-sm leading-relaxed",
                  turn.role === "user"
                    ? "ml-8 border border-emerald-500/30 bg-forest-950/80 text-emerald-100"
                    : "mr-8 border border-white/10 bg-white/5 text-zinc-200",
                )}
              >
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-mute">
                  {turn.role === "user" ? "You (Voice)" : "Netree Research Agent"}
                </span>
                <p>{turn.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
