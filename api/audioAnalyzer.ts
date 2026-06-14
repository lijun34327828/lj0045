export interface AnalysisResult {
  type: 'analysis';
  gender: 'male' | 'female';
  genderConfidence: number;
  ageGroup: 'youth' | 'young_adult' | 'middle_aged' | 'elderly';
  ageConfidence: number;
  volume: number;
  speechRate: number;
  timestamp: number;
}

export class AudioAnalyzer {
  private sampleRate: number = 44100;
  private f0History: number[] = [];
  private energyHistory: number[] = [];
  private zeroCrossingHistory: number[] = [];
  private speechRateHistory: number[] = [];
  private lastSyllableTime: number = 0;
  private syllableCount: number = 0;

  setSampleRate(rate: number) {
    this.sampleRate = rate;
  }

  analyze(audioData: Float32Array): AnalysisResult {
    const volume = this.calculateVolume(audioData);
    const f0 = this.detectF0(audioData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(audioData);
    const speechRate = this.estimateSpeechRate(zeroCrossingRate, volume);

    if (f0 > 0) {
      this.f0History.push(f0);
      if (this.f0History.length > 50) this.f0History.shift();
    }
    this.energyHistory.push(volume);
    if (this.energyHistory.length > 30) this.energyHistory.shift();
    this.zeroCrossingHistory.push(zeroCrossingRate);
    if (this.zeroCrossingHistory.length > 20) this.zeroCrossingHistory.shift();

    const { gender, genderConfidence } = this.classifyGender();
    const { ageGroup, ageConfidence } = this.classifyAge();

    return {
      type: 'analysis',
      gender,
      genderConfidence,
      ageGroup,
      ageConfidence,
      volume,
      speechRate,
      timestamp: Date.now(),
    };
  }

  private calculateVolume(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const db = 20 * Math.log10(rms + 1e-10);
    return Math.max(0, Math.min(100, db + 60));
  }

  private detectF0(audioData: Float32Array): number {
    const minF0 = 80;
    const maxF0 = 300;
    const minPeriod = Math.floor(this.sampleRate / maxF0);
    const maxPeriod = Math.floor(this.sampleRate / minF0);

    const n = audioData.length;
    const rms = new Float32Array(maxPeriod + 1);

    for (let tau = 0; tau <= maxPeriod; tau++) {
      let sum = 0;
      for (let i = 0; i < n - tau; i++) {
        sum += audioData[i] * audioData[i + tau];
      }
      rms[tau] = sum / (n - tau);
    }

    let maxRms = -Infinity;
    let bestTau = -1;

    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
      if (rms[tau] > maxRms && rms[tau] > 0.3 * rms[0]) {
        maxRms = rms[tau];
        bestTau = tau;
      }
    }

    if (bestTau > 0) {
      return this.sampleRate / bestTau;
    }

    return 0;
  }

  private calculateZeroCrossingRate(audioData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i - 1] >= 0 && audioData[i] < 0) ||
         (audioData[i - 1] < 0 && audioData[i] >= 0)) {
        crossings++;
      }
    }
    return crossings / audioData.length;
  }

  private estimateSpeechRate(zcr: number, volume: number): number {
    const now = Date.now();
    const volumeThreshold = 15;

    if (volume > volumeThreshold && zcr > 0.01 && zcr < 0.15) {
      if (now - this.lastSyllableTime > 100) {
        this.syllableCount++;
        this.lastSyllableTime = now;
      }
    }

    const elapsedSeconds = Math.max(1, (now - (now - 5000)) / 1000);
    const currentRate = this.syllableCount * 60 / elapsedSeconds;
    this.speechRateHistory.push(currentRate);
    if (this.speechRateHistory.length > 20) this.speechRateHistory.shift();

    const avgRate = this.speechRateHistory.reduce((a, b) => a + b, 0) / this.speechRateHistory.length;
    const smoothed = avgRate * 0.3;
    return Math.max(40, Math.min(300, smoothed));
  }

  private classifyGender(): { gender: 'male' | 'female'; genderConfidence: number } {
    if (this.f0History.length < 5) {
      return { gender: 'male', genderConfidence: 50 };
    }

    const avgF0 = this.f0History.reduce((a, b) => a + b, 0) / this.f0History.length;
    const variance = this.f0History.reduce((a, b) => a + Math.pow(b - avgF0, 2), 0) / this.f0History.length;
    const stdDev = Math.sqrt(variance);

    let gender: 'male' | 'female';
    let confidence: number;

    if (avgF0 >= 85 && avgF0 <= 165) {
      gender = 'male';
      const distance = Math.abs(avgF0 - 130);
      confidence = Math.max(60, 95 - distance);
    } else if (avgF0 > 165 && avgF0 <= 255) {
      gender = 'female';
      const distance = Math.abs(avgF0 - 210);
      confidence = Math.max(60, 95 - distance / 2);
    } else if (avgF0 < 85) {
      gender = 'male';
      confidence = 70;
    } else {
      gender = 'female';
      confidence = 70;
    }

    if (stdDev < 15) {
      confidence = Math.min(99, confidence + 5);
    } else if (stdDev > 50) {
      confidence = Math.max(50, confidence - 10);
    }

    return { gender, genderConfidence: Math.round(confidence) };
  }

  private classifyAge(): { ageGroup: 'youth' | 'young_adult' | 'middle_aged' | 'elderly'; ageConfidence: number } {
    if (this.f0History.length < 10 || this.energyHistory.length < 5) {
      return { ageGroup: 'young_adult', ageConfidence: 50 };
    }

    const avgF0 = this.f0History.reduce((a, b) => a + b, 0) / this.f0History.length;
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const f0Variance = this.f0History.reduce((a, b) => a + Math.pow(b - avgF0, 2), 0) / this.f0History.length;

    const avgZCR = this.zeroCrossingHistory.reduce((a, b) => a + b, 0) / this.zeroCrossingHistory.length;

    let ageGroup: 'youth' | 'young_adult' | 'middle_aged' | 'elderly';
    let confidence: number;

    const pitchVariation = Math.sqrt(f0Variance);
    const harmonicity = avgEnergy / (pitchVariation + 1);

    if (avgF0 > 220 && pitchVariation > 40 && avgZCR > 0.08) {
      ageGroup = 'youth';
      confidence = 75;
    } else if (avgF0 >= 160 && pitchVariation > 25 && harmonicity > 0.8) {
      ageGroup = 'young_adult';
      confidence = 80;
    } else if (avgF0 >= 120 && pitchVariation < 35 && avgZCR > 0.04) {
      ageGroup = 'middle_aged';
      confidence = 70;
    } else {
      ageGroup = 'elderly';
      confidence = 65;
    }

    if (avgEnergy > 50 && pitchVariation > 30) {
      confidence = Math.min(95, confidence + 10);
    }

    return { ageGroup, ageConfidence: Math.round(confidence) };
  }

  reset() {
    this.f0History = [];
    this.energyHistory = [];
    this.zeroCrossingHistory = [];
    this.speechRateHistory = [];
    this.syllableCount = 0;
    this.lastSyllableTime = 0;
  }
}
