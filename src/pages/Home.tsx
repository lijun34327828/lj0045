import { useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioStore, type AnalysisResult, type Gender, type AgeGroup } from '@/store/useAudioStore';
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

class DemoAnalyzer {
  private f0History: number[] = [];
  private energyHistory: number[] = [];
  private startTime: number = Date.now();
  private syllableCount: number = 0;
  private lastSyllableTime: number = 0;

  reset() {
    this.f0History = [];
    this.energyHistory = [];
    this.startTime = Date.now();
    this.syllableCount = 0;
    this.lastSyllableTime = 0;
  }

  analyze(): AnalysisResult {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;

    const baseVolume = 35 + Math.sin(elapsed * 0.8) * 15;
    const volume = Math.max(5, Math.min(95, baseVolume + (Math.random() - 0.5) * 10));
    this.energyHistory.push(volume);
    if (this.energyHistory.length > 30) this.energyHistory.shift();

    const baseF0 = 180 + Math.sin(elapsed * 0.3) * 50;
    const f0 = Math.max(80, Math.min(280, baseF0 + (Math.random() - 0.5) * 20));
    this.f0History.push(f0);
    if (this.f0History.length > 50) this.f0History.shift();

    if (volume > 20 && now - this.lastSyllableTime > 150 + Math.random() * 100) {
      this.syllableCount++;
      this.lastSyllableTime = now;
    }
    const speechRate = Math.max(50, Math.min(280, 100 + this.syllableCount * 1.5 + Math.sin(elapsed * 0.5) * 30));

    const { gender, genderConfidence } = this.classifyGender();
    const { ageGroup, ageConfidence } = this.classifyAge();

    return {
      type: 'analysis',
      gender,
      genderConfidence,
      ageGroup,
      ageConfidence,
      volume: Math.round(volume),
      speechRate: Math.round(speechRate),
      timestamp: now,
    };
  }

  private classifyGender(): { gender: Gender; genderConfidence: number } {
    if (this.f0History.length < 3) {
      return { gender: 'female', genderConfidence: 65 };
    }
    const avgF0 = this.f0History.reduce((a, b) => a + b, 0) / this.f0History.length;
    let gender: Gender;
    let confidence: number;

    if (avgF0 > 170) {
      gender = 'female';
      const distance = Math.abs(avgF0 - 210);
      confidence = Math.max(65, Math.min(95, 92 - distance / 3));
    } else {
      gender = 'male';
      const distance = Math.abs(avgF0 - 130);
      confidence = Math.max(65, Math.min(95, 90 - distance / 2));
    }
    return { gender, genderConfidence: Math.round(confidence + (Math.random() - 0.5) * 3) };
  }

  private classifyAge(): { ageGroup: AgeGroup; ageConfidence: number } {
    if (this.f0History.length < 5) {
      return { ageGroup: 'young_adult', ageConfidence: 68 };
    }
    const avgF0 = this.f0History.reduce((a, b) => a + b, 0) / this.f0History.length;
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

    let ageGroup: AgeGroup;
    let confidence: number;

    if (avgF0 > 200 && avgEnergy > 45) {
      ageGroup = 'youth';
      confidence = 78;
    } else if (avgF0 >= 160) {
      ageGroup = 'young_adult';
      confidence = 82;
    } else if (avgF0 >= 120) {
      ageGroup = 'middle_aged';
      confidence = 72;
    } else {
      ageGroup = 'elderly';
      confidence = 68;
    }

    if (avgEnergy > 40) {
      confidence = Math.min(95, confidence + 5);
    }

    return { ageGroup, ageConfidence: Math.round(confidence + (Math.random() - 0.5) * 3) };
  }
}

export default function Home() {
  const setCurrentResult = useAudioStore((state) => state.setCurrentResult);
  const setDemoMode = useAudioStore((state) => state.setDemoMode);
  const isRecording = useAudioStore((state) => state.isRecording);
  const wsConnectedRef = useRef(false);
  const demoAnalyzerRef = useRef<DemoAnalyzer | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const { startRecording, stopRecording, getWaveformData, isDemoMode } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
  });

  const startDemoAnalysis = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
    }
    if (!demoAnalyzerRef.current) {
      demoAnalyzerRef.current = new DemoAnalyzer();
    }
    demoAnalyzerRef.current.reset();

    demoIntervalRef.current = setInterval(() => {
      if (demoAnalyzerRef.current) {
        const result = demoAnalyzerRef.current.analyze();
        setCurrentResult(result);
      }
    }, 100);
  }, [setCurrentResult]);

  const stopDemoAnalysis = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  }, []);

  const handleStart = async () => {
    connect();
    await new Promise(resolve => setTimeout(resolve, 300));
    sendJSON({ type: 'start', timestamp: Date.now() });
    const success = await startRecording();
    if (success) {
      const demo = isDemoMode();
      setDemoMode(demo);
      if (demo) {
        startDemoAnalysis();
      }
    }
    return success;
  };

  const handleStop = () => {
    stopRecording();
    stopDemoAnalysis();
    sendJSON({ type: 'stop', timestamp: Date.now() });
    setTimeout(() => {
      disconnect();
    }, 200);
    setDemoMode(false);
  };

  const isDemo = useAudioStore((state) => state.isDemoMode);

  return (
    <div className="min-h-screen bg-[#0a0e1a] bg-grid-pattern bg-radial-glow text-white">
      {isDemo && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 backdrop-blur-md">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-3 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>
            <span className="text-amber-300 font-medium text-sm">
              🎙️ 演示模式 — 当前使用内置示例音频进行分析（未检测到可用麦克风）
            </span>
          </div>
        </div>
      )}

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
                <span className={`w-2 h-2 rounded-full ${isDemo ? 'bg-amber-400' : 'bg-green-400'} animate-pulse`} />
                <span className="text-gray-300 text-sm">
                  {isDemo ? '演示模式' : '服务正常'}
                </span>
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
