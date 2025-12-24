
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { 
  InterviewConfig, 
  TranscriptionItem, 
  InterviewStatus 
} from './types';
import { 
  MODEL_NAME, 
  getSystemInstruction, 
  AUDIO_SAMPLE_RATE_IN, 
  AUDIO_SAMPLE_RATE_OUT 
} from './constants';
import { 
  decode, 
  decodeAudioData, 
  createPcmBlob 
} from './utils/audioUtils';

import InterviewSetup from './components/InterviewSetup';
import CameraPreview from './components/CameraPreview';
import TranscriptionPanel from './components/TranscriptionPanel';

const App: React.FC = () => {
  const [status, setStatus] = useState<InterviewStatus>(InterviewStatus.IDLE);
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcription Buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Gemini Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const cleanupSession = useCallback(() => {
    // Stop audio processing
    if (inputAudioCtxRef.current) {
        inputAudioCtxRef.current.close();
        inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
        outputAudioCtxRef.current.close();
        outputAudioCtxRef.current = null;
    }
    // Stop all playing sources
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    sessionPromiseRef.current = null;
  }, []);

  const handleStartInterview = async (newConfig: InterviewConfig) => {
    setConfig(newConfig);
    setStatus(InterviewStatus.CONNECTING);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Initialize Audio Contexts
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_IN });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUT });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            setStatus(InterviewStatus.ACTIVE);
            
            // Microphone stream
            if (inputAudioCtxRef.current) {
              const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioCtxRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const userText = currentInputTranscription.current.trim();
              const aiText = currentOutputTranscription.current.trim();
              
              if (userText) {
                setTranscripts(prev => [...prev, { type: 'user', text: userText, timestamp: Date.now() }]);
              }
              if (aiText) {
                setTranscripts(prev => [...prev, { type: 'ai', text: aiText, timestamp: Date.now() }]);
              }
              
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            // Handle Audio Playback
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await decodeAudioData(
                decode(audioData),
                ctx,
                AUDIO_SAMPLE_RATE_OUT,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interrupts
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (err) => {
            console.error("Session Error:", err);
            setError("Connection error. Please try again.");
            setStatus(InterviewStatus.ERROR);
            cleanupSession();
          },
          onclose: () => {
            console.log("Session Closed");
            setStatus(InterviewStatus.IDLE);
            cleanupSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: getSystemInstruction(newConfig.role, newConfig.company, newConfig.experience),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Setup Error:", err);
      setError("Failed to initialize session. Make sure camera and mic permissions are granted.");
      setStatus(InterviewStatus.ERROR);
    }
  };

  const handleFrame = useCallback((base64Frame: string) => {
    if (sessionPromiseRef.current && status === InterviewStatus.ACTIVE) {
      sessionPromiseRef.current.then(session => {
        session.sendRealtimeInput({
          media: { data: base64Frame, mimeType: 'image/jpeg' }
        });
      });
    }
  }, [status]);

  const handleStopInterview = () => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
    }
    cleanupSession();
    setStatus(InterviewStatus.IDLE);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <i className="fas fa-brain text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Gemini AI Interview</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Real-time Vision & Audio</p>
          </div>
        </div>

        {status === InterviewStatus.ACTIVE && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400">Live Session</span>
            </div>
            <button 
              onClick={handleStopInterview}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-1.5 rounded-lg border border-red-500/20 text-xs font-bold transition"
            >
              End Session
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 flex items-center justify-center">
        {status === InterviewStatus.IDLE || status === InterviewStatus.ERROR ? (
          <div className="w-full">
            {error && (
              <div className="max-w-md mx-auto mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm flex items-center gap-3">
                <i className="fas fa-triangle-exclamation"></i>
                {error}
              </div>
            )}
            <InterviewSetup onStart={handleStartInterview} />
          </div>
        ) : status === InterviewStatus.CONNECTING ? (
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Connecting to Gemini...</h2>
            <p className="text-slate-400">Preparing your virtual interviewer. Please wait.</p>
          </div>
        ) : (
          <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Vision/Feedback */}
            <div className="space-y-6">
              <CameraPreview isActive={status === InterviewStatus.ACTIVE} onFrame={handleFrame} />
              
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-circle-info text-emerald-400"></i>
                    Interview Details
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Role</p>
                        <p className="font-semibold text-slate-200">{config?.role}</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Company</p>
                        <p className="font-semibold text-slate-200">{config?.company}</p>
                    </div>
                 </div>
                 <p className="mt-4 text-xs text-slate-400 leading-relaxed italic">
                    Tip: Maintain eye contact with the camera. Gemini can see your expressions and posture to provide a more realistic mock experience.
                 </p>
              </div>
            </div>

            {/* Right Column: Audio Logs/Transcription */}
            <div className="space-y-6">
              <TranscriptionPanel transcripts={transcripts} />
              
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl flex items-center gap-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-microphone text-emerald-400 text-xl"></i>
                </div>
                <div>
                   <h4 className="font-bold text-slate-100">Audio Feedback</h4>
                   <p className="text-sm text-slate-400">Your microphone is active. Speak naturally as you would in a real interview.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 px-6 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p>Built with Gemini 2.5 Flash Native Audio Preview & Vision. Empowering the next generation of professionals.</p>
      </footer>
    </div>
  );
};

export default App;
