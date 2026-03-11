import { useEffect, useRef, useState } from "react";
import { getSocket } from "../services/socket";

type DictState = {
  listening: boolean;
  interim: string;
  final: string;
  error?: string | null;
};

/**
 * useDictation — Streaming Edition
 * Uses WebSocket binary streaming for high-performance radiology dictation.
 */
export default function useDictation() {
  const [state, setState] = useState<DictState>({
    listening: false,
    interim: "",
    final: "",
    error: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socket = getSocket();

  // Handle incoming transcription results
  useEffect(() => {
    if (!socket) return;

    const handleResult = (data: { text: string; isFinal: boolean }) => {
      if (data.isFinal) {
        setState(s => ({ 
          ...s, 
          final: data.text, // Use only the latest final result to avoid duplication in one emit
          interim: "" 
        }));
      } else {
        setState(s => ({ ...s, interim: data.text }));
      }
    };

    const handleStarted = () => setState(s => ({ ...s, listening: true, error: null }));
    const handleStopped = () => setState(s => ({ ...s, listening: false, interim: "" }));
    const handleError = (err: any) => setState(s => ({ ...s, error: err.message, listening: false }));

    socket.on('DICTATION_RESULT', handleResult);
    socket.on('DICTATION_STARTED', handleStarted);
    socket.on('DICTATION_STOPPED', handleStopped);
    socket.on('DICTATION_ERROR', handleError);

    return () => {
      socket.off('DICTATION_RESULT', handleResult);
      socket.off('DICTATION_STARTED', handleStarted);
      socket.off('DICTATION_STOPPED', handleStopped);
      socket.off('DICTATION_ERROR', handleError);
    };
  }, [socket]);

  const start = async () => {
    if (!socket) {
      setState(s => ({ ...s, error: "Socket not initialized" }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // 4096 buffer size is a good balance for latency
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 for the STT engine
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // Emit binary chunk over WebSocket
        socket.emit('AUDIO_CHUNK', pcmData.buffer);
      };

      socket.emit('START_DICTATION');
    } catch (err: any) {
      console.error("Dictation start failed", err);
      setState(s => ({ ...s, error: "Microphone access denied or error: " + err.message }));
    }
  };

  const stop = () => {
    if (socket) socket.emit('STOP_DICTATION');
    
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    
    setState(s => ({ ...s, listening: false, interim: "" }));
  };

  const clearFinal = () => setState(s => ({ ...s, final: "" }));

  return { state, start, stop, clearFinal };
}
