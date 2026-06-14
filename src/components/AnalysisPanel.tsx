import { useAudioStore, type Gender, type AgeGroup } from '@/store/useAudioStore';

const genderLabels: Record<Gender, { label: string; color: string }> = {
  male: { label: '男', color: 'from-blue-500 to-cyan-400' },
  female: { label: '女', color: 'from-pink-500 to-rose-400' },
};

const ageGroupLabels: Record<AgeGroup, { label: string; color: string }> = {
  youth: { label: '少年', color: 'from-emerald-400 to-teal-500' },
  young_adult: { label: '青年', color: 'from-amber-400 to-orange-500' },
  middle_aged: { label: '中年', color: 'from-orange-500 to-red-500' },
  elderly: { label: '老年', color: 'from-purple-500 to-violet-600' },
};

export default function AnalysisPanel() {
  const currentResult = useAudioStore((state) => state.currentResult);
  const isRecording = useAudioStore((state) => state.isRecording);

  if (!isRecording && !currentResult) {
    return (
      <div className="bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00f5d4]/20 to-[#ff6b35]/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#00f5d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">点击开始收音按钮开始分析</p>
        </div>
      </div>
    );
  }

  const gender = currentResult?.gender || 'male';
  const ageGroup = currentResult?.ageGroup || 'young_adult';
  const genderConfidence = currentResult?.genderConfidence || 0;
  const ageConfidence = currentResult?.ageConfidence || 0;

  return (
    <div className="bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full">
      <h3 className="text-white/80 text-sm font-medium mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse" />
        实时分析结果
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">性别</span>
            <span className="text-[#00f5d4] font-mono text-sm">{genderConfidence}%</span>
          </div>
          <div
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r ${genderLabels[gender].color} shadow-lg transition-all duration-500`}
            style={{ boxShadow: '0 0 30px rgba(0, 245, 212, 0.3)' }}
          >
            <span className="text-white text-2xl font-bold">{genderLabels[gender].label}</span>
            <span className="text-white/70 text-sm">性</span>
          </div>
          <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${genderLabels[gender].color} transition-all duration-500`}
              style={{ width: `${genderConfidence}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">年龄段</span>
            <span className="text-[#ff6b35] font-mono text-sm">{ageConfidence}%</span>
          </div>
          <div
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r ${ageGroupLabels[ageGroup].color} shadow-lg transition-all duration-500`}
          >
            <span className="text-white text-2xl font-bold">{ageGroupLabels[ageGroup].label}</span>
          </div>
          <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${ageGroupLabels[ageGroup].color} transition-all duration-500`}
              style={{ width: `${ageConfidence}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-[#00f5d4] text-3xl font-mono font-bold">{genderConfidence}</div>
            <div className="text-gray-500 text-xs mt-1">性别置信度</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-[#ff6b35] text-3xl font-mono font-bold">{ageConfidence}</div>
            <div className="text-gray-500 text-xs mt-1">年龄置信度</div>
          </div>
        </div>
      </div>
    </div>
  );
}
