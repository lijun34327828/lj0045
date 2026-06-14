import { useAudioStore } from '@/store/useAudioStore';

export default function MetricsPanel() {
  const currentResult = useAudioStore((state) => state.currentResult);
  const volumeHistory = useAudioStore((state) => state.volumeHistory);
  const speechRateHistory = useAudioStore((state) => state.speechRateHistory);
  const isRecording = useAudioStore((state) => state.isRecording);

  const volume = currentResult?.volume ?? 0;
  const speechRate = currentResult?.speechRate ?? 0;

  const getVolumeColor = (v: number) => {
    if (v < 30) return 'from-green-400 to-emerald-500';
    if (v < 60) return 'from-yellow-400 to-amber-500';
    return 'from-red-400 to-rose-500';
  };

  const getVolumeBarColor = (v: number) => {
    if (v < 30) return 'bg-green-400';
    if (v < 60) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-white/80 text-sm font-medium mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
        辅助指标
      </h3>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">音量</span>
            <span className={`font-mono text-lg font-bold bg-gradient-to-r ${getVolumeColor(volume)} bg-clip-text text-transparent`}>
              {volume.toFixed(0)}
              <span className="text-gray-500 text-sm ml-1">dB</span>
            </span>
          </div>

          <div className="flex items-end gap-1 h-32 mb-4">
            {Array.from({ length: 30 }).map((_, i) => {
              const histValue = volumeHistory[i] || 0;
              const height = Math.max(4, (histValue / 100) * 100);
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${getVolumeBarColor(histValue)} transition-all duration-150 opacity-80`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
            <div
              className={`absolute right-0 w-2 h-32 flex items-end gap-1`}
            >
              <div
                className={`w-4 rounded-t bg-gradient-to-t ${getVolumeColor(volume)} transition-all duration-150 animate-pulse`}
                style={{ height: `${Math.max(4, (volume / 100) * 100)}%`, boxShadow: '0 0 20px currentColor' }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>安静</span>
            <span>正常</span>
            <span>嘈杂</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">语速</span>
            <span className="font-mono text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {speechRate.toFixed(0)}
              <span className="text-gray-500 text-sm ml-1">字/分</span>
            </span>
          </div>

          <div className="h-32 mb-4 flex items-center">
            <div className="w-full relative">
              {Array.from({ length: 20 }).map((_, i) => {
                const histValue = speechRateHistory[i] || 0;
                const radius = 30 + (histValue / 300) * 40;
                const opacity = 0.1 + (i / 20) * 0.4;
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 transition-all duration-300"
                    style={{
                      width: `${radius * 2}px`,
                      height: `${radius * 2}px`,
                      opacity,
                    }}
                  />
                );
              })}

              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 transition-all duration-300 flex items-center justify-center"
                style={{
                  width: `${60 + (speechRate / 300) * 60}px`,
                  height: `${60 + (speechRate / 300) * 60}px`,
                  boxShadow: '0 0 40px rgba(34, 211, 238, 0.4)',
                }}
              >
                <span className="text-white font-mono font-bold text-xl">{speechRate.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>缓慢</span>
            <span>适中</span>
            <span>快速</span>
          </div>
        </div>
      </div>
    </div>
  );
}
