import { useAudioStore, type Gender, type AgeGroup } from '@/store/useAudioStore';
import { Trash2 } from 'lucide-react';

const genderLabels: Record<Gender, { label: string; color: string }> = {
  male: { label: '男', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  female: { label: '女', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
};

const ageGroupLabels: Record<AgeGroup, { label: string; color: string }> = {
  youth: { label: '少年', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  young_adult: { label: '青年', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  middle_aged: { label: '中年', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  elderly: { label: '老年', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export default function RecordsList() {
  const records = useAudioStore((state) => state.records);
  const clearRecords = useAudioStore((state) => state.clearRecords);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  if (records.length === 0) {
    return (
      <div className="bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white/80 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            历史记录
          </h3>
          <span className="text-gray-500 text-sm">0 条记录</span>
        </div>
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">暂无记录</p>
          <p className="text-gray-600 text-xs mt-1">完成收音后记录将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white/80 text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff6b35]" />
          历史记录
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{records.length} 条记录</span>
          <button
            onClick={clearRecords}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm border border-red-500/20 hover:border-red-500/40"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {records.map((record, index) => (
          <div
            key={record.id}
            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f5d4]/20 to-[#ff6b35]/20 flex items-center justify-center">
                  <span className="text-[#00f5d4] font-mono text-sm font-bold">#{records.length - index}</span>
                </div>
                <div>
                  <div className="text-white font-medium">{formatDate(record.timestamp)}</div>
                  <div className="text-gray-500 text-xs">{formatTime(record.timestamp)} · {formatDuration(record.duration)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${genderLabels[record.gender].color}`}
                >
                  {genderLabels[record.gender].label}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${ageGroupLabels[record.ageGroup].color}`}
                >
                  {ageGroupLabels[record.ageGroup].label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-[#00f5d4] font-mono font-bold">{record.genderConfidence}%</div>
                <div className="text-gray-500 text-xs mt-0.5">性别置信</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-[#ff6b35] font-mono font-bold">{record.ageConfidence}%</div>
                <div className="text-gray-500 text-xs mt-0.5">年龄置信</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-green-400 font-mono font-bold">{record.avgVolume}<span className="text-xs">dB</span></div>
                <div className="text-gray-500 text-xs mt-0.5">平均音量</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-cyan-400 font-mono font-bold">{record.avgSpeechRate}</div>
                <div className="text-gray-500 text-xs mt-0.5">语速(字/分)</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
