import { useState, useEffect, useCallback } from 'react';

interface PadEffect {
  id: string;
  name: string;
  key: string;
  color: string;
  icon: string;
  play: (ctx: AudioContext, volume: number) => void;
}

interface Props {
  ensureAudio?: () => Promise<void>;
}

export default function SoundFXPad({ ensureAudio }: Props) {
  const [fxVolume, setFxVolume] = useState(0.8);
  const [activePad, setActivePad] = useState<string | null>(null);

  // Synthesize audio FX on-the-fly using Web Audio API
  const playAirhorn = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    [280, 370, 470, 560].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.3);

      gain.gain.setValueAtTime(vol * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.03);
      osc.stop(now + 0.5);
    });
  };

  const playKickDrop = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  };

  const playClap = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.2);
  };

  const playLaser = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);

    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  };

  const playChime = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(vol * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  };

  const playScratch = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.08);
    osc.frequency.linearRampToValueAtTime(200, now + 0.16);

    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  };

  const pads: PadEffect[] = [
    { id: 'airhorn', name: 'Airhorn', key: '1', color: '#ff4757', icon: '📣', play: playAirhorn },
    { id: 'kick', name: 'Kick Drop', key: '2', color: '#2ed573', icon: '💥', play: playKickDrop },
    { id: 'clap', name: 'Clap', key: '3', color: '#ffa502', icon: '👏', play: playClap },
    { id: 'laser', name: 'Laser FX', key: '4', color: '#1e90ff', icon: '⚡', play: playLaser },
    { id: 'chime', name: 'Chime Chord', key: '5', color: '#9b59b6', icon: '🔔', play: playChime },
    { id: 'scratch', name: 'Scratch', key: '6', color: '#00d2d3', icon: '💿', play: playScratch },
  ];

  const triggerPad = useCallback(async (pad: PadEffect) => {
    if (ensureAudio) {
      await ensureAudio();
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    pad.play(ctx, fxVolume);
    setActivePad(pad.id);
    setTimeout(() => setActivePad(null), 200);
  }, [ensureAudio, fxVolume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const targetPad = pads.find((p) => p.key === e.key);
      if (targetPad) {
        triggerPad(targetPad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerPad, pads]);

  return (
    <section className="soundfx-sampler">
      <div className="fx-header">
        <div className="fx-title">
          <span className="fx-icon">🎛️</span>
          <h3>SOUND FX SAMPLER</h3>
        </div>
        <div className="fx-volume-control">
          <label htmlFor="fx-vol">FX VOL:</label>
          <input
            id="fx-vol"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={fxVolume}
            onChange={(e) => setFxVolume(parseFloat(e.target.value))}
          />
          <span>{Math.round(fxVolume * 100)}%</span>
        </div>
      </div>

      <div className="fx-pads-grid">
        {pads.map((pad) => (
          <button
            key={pad.id}
            className={`fx-pad ${activePad === pad.id ? 'active' : ''}`}
            style={{
              borderColor: pad.color,
              boxShadow: activePad === pad.id ? `0 0 15px ${pad.color}` : 'none',
            }}
            onClick={() => triggerPad(pad)}
          >
            <span className="fx-key-badge">{pad.key}</span>
            <span className="fx-pad-icon">{pad.icon}</span>
            <span className="fx-pad-name">{pad.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
