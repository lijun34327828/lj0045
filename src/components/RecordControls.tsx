import { useState, useEffect } from 'react';
import { useAudioStore } from '@/store/useAudioStore';

interface RecordControlsProps {
  onStart: () => Promise<boolean>;
  onStop: () => void;
}

export default function RecordControls({ onStart, onStop }: RecordControlsProps) {
  const isRecording = useAudioStore((state) => state.isRecording);
  const recordingStartTime = useAudioStore((state) => state.recordingStartTime);
  const setRecording = useAudioStore((state) => state.setRecording);
  const setRecordingStartTime = useAudioStore((state) => state.setRecordingStartTime);
  const addRecord = useAudioStore((state) => state.addRecord);
  const currentResult = useAudioStore((state) => state.currentResult);
  const volumeHistory = useAudioStore((state) => state.volumeHistory);
  const speechRateHistory = useAudioStore((state) => state.speechRateHistory);
  const setCurrentResult = useAudioStore((state) => state.setCurrentResult);

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    const success = await onStart();
    if (success) {
      setRecording(true);
      setRecordingStartTime(Date.now());
      setElapsedTime(0);
    }
  };

  const handleStop = () => {
    if (currentResult && recordingStartTime) {
      const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
      const avgVolume = volumeHistory.length > 0
        ? volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length
        : 0;
      const avgSpeechRate = speechRateHistory.length > 0
        ? speechRateHistory.reduce((a, b) => a + b, 0) / speechRateHistory.length
        : 0;

      addRecord({
        id: Date.now().toString(),
        timestamp: Date.now(),
        duration,
        gender: currentResult.gender,
        genderConfidence: currentResult.genderConfidence,
        ageGroup: currentResult.ageGroup,
        ageConfidence: currentResult.ageConfidence,
        avgVolume: Math.round(avgVolume),
        avgSpeechRate: Math.round(avgSpeechRate),
      });
    }

    onStop();
    setRecording(false);
    setRecordingStartTime(null);
    setCurrentResult(null);
    setElapsedTime(0);
  };

  return (
    <div className="bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={isRecording ? handleStop : handleStart}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg'
                : 'bg-gradient-to-br from-[#00f5d4] to-[#00c4a7] shadow-lg hover:shadow-xl hover:scale-105'
            }`}
            style={{
              boxShadow: isRecording
                ? '0 0 60px rgba(239, 68, 68, 0.5)'
                : '0 0 40px rgba(0, 245, 212, 0.4)',
            }}
          >
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                <span className="absolute inset-2 rounded-full bg-red-500/50 animate-pulse" />
              </>
            )}
            {isRecording ? (
              <div className="relative w-8 h-8 bg-white rounded-sm" />
            ) : (
              <svg className="relative w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>

          <div>
            <div className="text-white/80 text-sm mb-1">
              {isRecording ? '正在收音中...' : '准备就绪'}
            </div>
            <div className="font-mono text-3xl font-bold bg-gradient-to-r from-[#00f5d4] to-[#ff6b35] bg-clip-text text-transparent">
              {formatTime(elapsedTime)}
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-gray-400 text-xs">REC</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">采样率</div>
            <div className="text-white font-mono">44.1 kHz</div>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="text-right">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">声道</div>
            <div className="text-white font-mono">单声道</div>
          </div>
        </div>
      </div>
    </div>
  );
}
