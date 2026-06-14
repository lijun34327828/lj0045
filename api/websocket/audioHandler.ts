import type { WebSocket } from 'ws';
import { AudioAnalyzer, type AnalysisResult } from '../audioAnalyzer.js';

interface AudioChunkMessage {
  type: 'audio_chunk';
  data: string;
  sampleRate: number;
  timestamp: number;
}

interface ControlMessage {
  type: 'start' | 'stop';
  timestamp: number;
}

type ClientMessage = AudioChunkMessage | ControlMessage;

export function handleWebSocket(ws: WebSocket) {
  const analyzer = new AudioAnalyzer();
  let isRecording = false;
  let analysisInterval: NodeJS.Timeout | null = null;
  let latestAudioChunk: Float32Array | null = null;

  console.log('New WebSocket connection established');

  ws.on('message', (message: string) => {
    try {
      const data: ClientMessage = JSON.parse(message);

      switch (data.type) {
        case 'start':
          isRecording = true;
          analyzer.reset();
          console.log('Recording started');
          startAnalysisLoop();
          break;

        case 'stop':
          isRecording = false;
          latestAudioChunk = null;
          stopAnalysisLoop();
          console.log('Recording stopped');
          break;

        case 'audio_chunk':
          if (!isRecording) break;
          analyzer.setSampleRate(data.sampleRate);
          const decodedData = decodeAudioData(data.data);
          latestAudioChunk = decodedData;
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    stopAnalysisLoop();
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  function startAnalysisLoop() {
    stopAnalysisLoop();
    analysisInterval = setInterval(() => {
      if (isRecording && latestAudioChunk && ws.readyState === 1) {
        const result = analyzer.analyze(latestAudioChunk);
        sendAnalysisResult(result);
      }
    }, 100);
  }

  function stopAnalysisLoop() {
    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = null;
    }
  }

  function sendAnalysisResult(result: AnalysisResult) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(result));
    }
  }

  function decodeAudioData(base64Data: string): Float32Array {
    const binaryString = Buffer.from(base64Data, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    const floatArray = new Float32Array(bytes.length / 4);
    for (let i = 0; i < floatArray.length; i++) {
      floatArray[i] = view.getFloat32(i * 4, true);
    }
    return floatArray;
  }
}
