import { useRef, useCallback } from 'react';

interface UseAudioRecorderOptions {
  onAudioChunk: (data: Float32Array, sampleRate: number) => void;
}

export function useAudioRecorder({ onAudioChunk }: UseAudioRecorderOptions) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isRecordingRef = useRef(false);
  const isDemoModeRef = useRef(false);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimeRef = useRef(0);
  const demoWaveformRef = useRef<Uint8Array | null>(null);

  const generateDemoWaveform = useCallback(() => {
    const t = demoTimeRef.current;
    const bufferLength = 1024;
    const dataArray = new Uint8Array(bufferLength);

    for (let i = 0; i < bufferLength; i++) {
      const phase = (i / bufferLength) * Math.PI * 2;
      const freq1 = Math.sin(t * 0.003 + phase * 3) * 40;
      const freq2 = Math.sin(t * 0.005 + phase * 5) * 25;
      const freq3 = Math.sin(t * 0.007 + phase * 2) * 20;
      const noise = (Math.random() - 0.5) * 15;
      const envelope = Math.sin(t * 0.001) * 0.5 + 0.5;
      dataArray[i] = 128 + (freq1 + freq2 + freq3 + noise) * envelope;
    }

    demoWaveformRef.current = dataArray;
    demoTimeRef.current++;
    return dataArray;
  }, []);

  const generateDemoAudioChunk = useCallback(() => {
    const sampleRate = 44100;
    const chunkSize = 2048;
    const chunk = new Float32Array(chunkSize);
    const t = demoTimeRef.current;

    for (let i = 0; i < chunkSize; i++) {
      const phase = (i / chunkSize) * Math.PI * 2;
      const baseFreq = 180 + Math.sin(t * 0.002) * 40;
      const harmonic1 = Math.sin(phase * baseFreq * 0.02) * 0.3;
      const harmonic2 = Math.sin(phase * baseFreq * 0.04) * 0.15;
      const harmonic3 = Math.sin(phase * baseFreq * 0.06) * 0.08;
      const noise = (Math.random() - 0.5) * 0.05;
      const envelope = Math.sin(t * 0.001) * 0.4 + 0.6;
      const speechMod = Math.sin(t * 0.0005 + i * 0.001) * 0.3 + 0.7;
      chunk[i] = (harmonic1 + harmonic2 + harmonic3 + noise) * envelope * speechMod;
    }

    return { chunk, sampleRate };
  }, []);

  const startDemoMode = useCallback(() => {
    isDemoModeRef.current = true;
    isRecordingRef.current = true;
    demoTimeRef.current = 0;

    demoIntervalRef.current = setInterval(() => {
      generateDemoWaveform();
      const { chunk, sampleRate } = generateDemoAudioChunk();
      onAudioChunk(chunk, sampleRate);
    }, 46);

    return true;
  }, [generateDemoWaveform, generateDemoAudioChunk, onAudioChunk]);

  const stopDemoMode = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    isDemoModeRef.current = false;
    isRecordingRef.current = false;
    demoWaveformRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return startDemoMode();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      isDemoModeRef.current = false;
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      source.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      scriptProcessor.onaudioprocess = (event) => {
        if (!isRecordingRef.current) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData);
        onAudioChunk(chunk, audioContext.sampleRate);
      };

      isRecordingRef.current = true;
      return true;
    } catch (error) {
      console.error('Failed to start recording, switching to demo mode:', error);
      return startDemoMode();
    }
  }, [onAudioChunk, startDemoMode]);

  const stopRecording = useCallback(() => {
    if (isDemoModeRef.current) {
      stopDemoMode();
      return;
    }

    isRecordingRef.current = false;

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, [stopDemoMode]);

  const getWaveformData = useCallback(() => {
    if (isDemoModeRef.current) {
      if (!demoWaveformRef.current) {
        return generateDemoWaveform();
      }
      return demoWaveformRef.current;
    }

    if (!analyserRef.current) return null;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);
    return dataArray;
  }, [generateDemoWaveform]);

  const isDemoMode = useCallback(() => isDemoModeRef.current, []);

  return { startRecording, stopRecording, getWaveformData, isRecording: isRecordingRef.current, isDemoMode };
}
