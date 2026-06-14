import { useEffect, useRef } from 'react';

interface WaveformCanvasProps {
  isRecording: boolean;
  getWaveformData: () => Uint8Array | null;
}

export default function WaveformCanvas({ isRecording, getWaveformData }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const waveformHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio;

      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40 * dpr;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255, 107, 53, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const waveformData = getWaveformData();
      if (waveformData && isRecording) {
        const avgValue = Array.from(waveformData).reduce((a, b) => a + b, 0) / waveformData.length;
        const normalizedValue = ((avgValue - 128) / 128) * (height / 2);
        waveformHistoryRef.current.push(normalizedValue);

        const maxHistory = Math.floor(width / (2 * dpr));
        if (waveformHistoryRef.current.length > maxHistory) {
          waveformHistoryRef.current.shift();
        }
      }

      const history = waveformHistoryRef.current;

      if (history.length > 1) {
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 15 * dpr;
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2.5 * dpr;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        const xStep = width / (history.length - 1);
        for (let i = 0; i < history.length; i++) {
          const x = i * xStep;
          const y = height / 2 + history[i];
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.lineWidth = 6 * dpr;
        ctx.beginPath();
        for (let i = 0; i < history.length; i++) {
          const x = i * xStep;
          const y = height / 2 + history[i];
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 245, 212, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let i = 0; i < history.length; i++) {
          const x = i * xStep;
          const y = height / 2 + history[i];
          ctx.lineTo(x, y);
        }
        ctx.lineTo((history.length - 1) * xStep, height / 2);
        ctx.closePath();
        ctx.fill();
      }

      if (!isRecording && history.length > 0) {
        ctx.fillStyle = 'rgba(255, 107, 53, 0.8)';
        ctx.font = `${14 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('波形已冻结', width / 2, 30 * dpr);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, getWaveformData]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-xl"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
