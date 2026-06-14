import { create } from 'zustand';

export type Gender = 'male' | 'female';
export type AgeGroup = 'youth' | 'young_adult' | 'middle_aged' | 'elderly';

export interface AnalysisResult {
  type: 'analysis';
  gender: Gender;
  genderConfidence: number;
  ageGroup: AgeGroup;
  ageConfidence: number;
  volume: number;
  speechRate: number;
  timestamp: number;
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;
  duration: number;
  gender: Gender;
  genderConfidence: number;
  ageGroup: AgeGroup;
  ageConfidence: number;
  avgVolume: number;
  avgSpeechRate: number;
}

interface AppState {
  isRecording: boolean;
  currentResult: AnalysisResult | null;
  records: AnalysisRecord[];
  recordingStartTime: number | null;
  volumeHistory: number[];
  speechRateHistory: number[];
  setRecording: (val: boolean) => void;
  setCurrentResult: (result: AnalysisResult | null) => void;
  addRecord: (record: AnalysisRecord) => void;
  clearRecords: () => void;
  setRecordingStartTime: (time: number | null) => void;
}

export const useAudioStore = create<AppState>((set) => ({
  isRecording: false,
  currentResult: null,
  records: [],
  recordingStartTime: null,
  volumeHistory: [],
  speechRateHistory: [],

  setRecording: (val) => set({ isRecording: val }),

  setCurrentResult: (result) =>
    set((state) => {
      if (!result) {
        return { currentResult: null, volumeHistory: [], speechRateHistory: [] };
      }
      const newVolumeHistory = [...state.volumeHistory, result.volume].slice(-30);
      const newSpeechRateHistory = [...state.speechRateHistory, result.speechRate].slice(-30);
      return {
        currentResult: result,
        volumeHistory: newVolumeHistory,
        speechRateHistory: newSpeechRateHistory,
      };
    }),

  addRecord: (record) =>
    set((state) => ({
      records: [record, ...state.records].slice(0, 50),
    })),

  clearRecords: () => set({ records: [] }),

  setRecordingStartTime: (time) => set({ recordingStartTime: time }),
}));
