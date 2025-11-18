import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LiveSession, LiveServerMessage, Blob } from '@google/genai';
import { geminiService } from '../services/geminiService';
import { MicrophoneIcon, StopCircleIcon } from '../constants';
import { decode, decodeAudioData } from '../services/utils';

// Helper function for audio processing
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const LiveAgent: React.FC = () => {
  const [isConversing, setIsConversing] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ type: 'user' | 'model'; text: string }[]>([]);
  const [status, setStatus] = useState('Idle. Press Start to talk.');

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  
  const nextStartTime = useRef(0);
  const sources = useRef(new Set<AudioBufferSourceNode>());

  const stopConversation = useCallback(() => {
    setIsConversing(false);
    setStatus('Conversation ended. Press Start to talk again.');
    
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }

    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
  }, []);

  const startConversation = useCallback(async () => {
    setIsConversing(true);
    setStatus('Connecting...');
    setTranscriptions([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      const sessionPromise = geminiService.connectLive({
        onopen: () => {
          setStatus('Connected. Start speaking...');
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          mediaStreamSourceRef.current = source;
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                setTranscriptions(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.type === 'model') {
                        last.text = currentOutputTranscription.current;
                        return [...prev.slice(0, -1), last];
                    }
                    return [...prev, { type: 'model', text: currentOutputTranscription.current }];
                });
            } else if (message.serverContent?.inputTranscription) {
                currentInputTranscription.current += message.serverContent.inputTranscription.text;
                 setTranscriptions(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.type === 'user') {
                        last.text = currentInputTranscription.current;
                        return [...prev.slice(0, -1), last];
                    }
                    return [...prev, { type: 'user', text: currentInputTranscription.current }];
                });
            }

            if(message.serverContent?.turnComplete) {
                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio && outputAudioContextRef.current) {
                const audioCtx = outputAudioContextRef.current;
                nextStartTime.current = Math.max(nextStartTime.current, audioCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                  sources.current.delete(source);
                });
                source.start(nextStartTime.current);
                nextStartTime.current += audioBuffer.duration;
                sources.current.add(source);
            }
            if (message.serverContent?.interrupted) {
                sources.current.forEach(source => source.stop());
                sources.current.clear();
                nextStartTime.current = 0;
            }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Live session error:', e);
          setStatus(`Error: ${e.message}. Please try again.`);
          stopConversation();
        },
        onclose: (e: CloseEvent) => {
          setStatus('Connection closed. Press Start to talk again.');
          if (isConversing) {
            stopConversation();
          }
        },
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error('Error starting conversation:', err);
      setStatus('Could not start conversation. Please check microphone permissions.');
      setIsConversing(false);
    }
  }, [stopConversation, isConversing]);

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (isConversing) {
        stopConversation();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConversing]);


  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Conversation Agent</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Gemini Live</p>
      </div>

      <div className="flex-1 bg-gray-50/80 dark:bg-black/50 rounded-lg p-4 overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 space-y-4">
        {transcriptions.map((t, i) => (
          <div key={i} className={`flex ${t.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`p-3 rounded-lg max-w-lg ${t.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>
              {t.text}
            </p>
          </div>
        ))}
      </div>
      
      <div className="text-center text-gray-500 dark:text-gray-300 font-medium">{status}</div>

      <div className="flex justify-center">
        {!isConversing ? (
          <button
            onClick={startConversation}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-green-500"
          >
            <MicrophoneIcon />
            Start Conversation
          </button>
        ) : (
          <button
            onClick={stopConversation}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-br from-red-500 to-orange-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-red-500"
          >
            <StopCircleIcon />
            Stop Conversation
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveAgent;