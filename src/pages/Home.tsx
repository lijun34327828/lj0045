import { useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioStore, type AnalysisResult } from '@/store/useAudioStore';
import WaveformCanvas from '@/components/WaveformCanvas';
import AnalysisPanel from '@/components/AnalysisPanel';
import MetricsPanel from '@/components/MetricsPanel';
import RecordControls from '@/components/RecordControls';
import RecordsList from '@/components/RecordsList';

function float32ToBase64(floatArray: Float32Array): string {
  const buffer = new ArrayBuffer(floatArray.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < floatArray.length; i++) {
    view.setFloat32(i * 4, floatArray[i], true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function Home() {
  const setCurrentResult = useAudioStore((state) => state.setCurrentResult);
  const isRecording = useAudioStore((state) => state.isRecording);
  const wsConnectedRef = useRef(false);

  const handleWebSocketMessage = useCallback((data: AnalysisResult) => {
    setCurrentResult(data);
  }, [setCurrentResult]);

  const { connect, sendJSON, disconnect } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onOpen: () => {
      wsConnectedRef.current = true;
    },
    onClose: () => {
      wsConnectedRef.current = false;
    },
  });

  const handleAudioChunk = useCallback((data: Float32Array, sampleRate: number) => {
    if (wsConnectedRef.current) {
      const base64Data = float32ToBase64(data);
      sendJSON({
        type: 'audio_chunk',
        data: base64Data,
        sampleRate,
        timestamp: Date.now(),
      });
    }
  }, [sendJSON]);

  const { startRecording, stopRecording, getWaveformData } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
  });

  const handleStart = async () => {
    connect();
    await new Promise(resolve => setTimeout(resolve, 300));
    sendJSON({ type: 'start', timestamp: Date.now() });
    const success = await startRecording();
    return success;
  };

  const handleStop = () => {
    stopRecording();
    sendJSON({ type: 'stop', timestamp: Date.now() });
    setTimeout(() => {
      disconnect();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] bg-grid-pattern bg-radial-glow text-white">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#00f5d4] via-cyan-300 to-[#ff6b35] bg-clip-text text-transparent">
                音频分析监测台
              </h1>
              <p className="text-gray-400 mt-2 text-sm">
                实时声纹分析 · 性别年龄识别 · 音量语速监测
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-300 text-sm">服务正常</span>
              </div>
              <div className="text-gray-500 text-sm font-mono">
                前端: 3765 · 后端: 8765
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="h-64 lg:h-80">
            <WaveformCanvas isRecording={isRecording} getWaveformData={getWaveformData} />
          </div>

          <RecordControls onStart={handleStart} onStop={handleStop} />

          <MetricsPanel />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-[500px]">
              <AnalysisPanel />
            </div>
            <div className="lg:col-span-2 h-[500px]">
              <RecordsList />
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-500 text-xs">
            使用 Web Audio API 采集音频 · WebSocket 实时传输 · DSP 算法分析
          </p>
        </footer>
      </div>
    </div>
  );
}
