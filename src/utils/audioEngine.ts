import type { MusicTrack } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicVolume = 0.45;
  private isPlaying = false;
  private activeTrack: MusicTrack | null = null;

  // For custom audio URL playback
  private htmlAudio: HTMLAudioElement | null = null;

  // For built-in dark ambient synth presets
  private masterGain: GainNode | null = null;
  private loopTimer: number | null = null;
  private droneOscs: OscillatorNode[] = [];
  private stepIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public getSfxEnabled() {
    return this.sfxEnabled;
  }

  public setVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.musicVolume * 0.35, this.ctx.currentTime, 0.08);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.musicVolume;
    }
  }

  public getVolume() {
    return this.musicVolume;
  }

  // Interactive SFX
  public playHover() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.045);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playEnter() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [220, 261.63, 329.63, 440];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.06 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.95);
    });
  }

  public playHeart(liked: boolean) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    if (liked) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.12);
    }
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playNavigate() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.11);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Music Player
  public stopMusic() {
    this.isPlaying = false;
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.droneOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.droneOscs = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.currentTime = 0;
    }
  }

  public playTrack(track: MusicTrack, onError?: (msg: string) => void) {
    this.stopMusic();
    this.activeTrack = track;
    this.isPlaying = true;

    if (track.sourceType === 'url') {
      if (!this.htmlAudio) {
        this.htmlAudio = new Audio();
        this.htmlAudio.loop = true;
        this.htmlAudio.crossOrigin = 'anonymous';
      }
      this.htmlAudio.src = track.source;
      this.htmlAudio.volume = this.musicVolume;
      this.htmlAudio.play().catch((err) => {
        if (onError) {
          onError('Không thể phát đường dẫn âm thanh này, chuyển sang chế độ nhạc nền mặc định.');
        }
        console.warn('Audio URL play failed:', err);
      });
      return;
    }

    // Built-in generative atmospheric preset
    const ctx = this.ensureContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.musicVolume * 0.35, ctx.currentTime + 1.2);
    master.connect(ctx.destination);
    this.masterGain = master;

    // Low-pass filter for warm smoky dark ambience
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(680, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);
    filter.connect(master);

    const presetScales: Record<string, { bass: number[]; melody: number[]; tempoMs: number }> = {
      'crimson-butterflies': {
        bass: [110, 98, 87.31, 82.41], // A2, G2, F2, E2
        melody: [220, 261.63, 329.63, 311.13, 293.66, 261.63, 246.94, 220],
        tempoMs: 1450,
      },
      'obsidian-drift': {
        bass: [73.42, 65.41, 82.41, 73.42], // D2, C2, E2, D2
        melody: [146.83, 174.61, 220, 261.63, 220, 196, 174.61, 146.83],
        tempoMs: 1700,
      },
      'velvet-ash': {
        bass: [98, 87.31, 73.42, 65.41],
        melody: [196, 233.08, 293.66, 349.23, 311.13, 293.66, 233.08, 196],
        tempoMs: 1300,
      },
    };

    const config = presetScales[track.source] || presetScales['crimson-butterflies'];

    // Soft sustained drone pad
    const drone1 = ctx.createOscillator();
    const drone2 = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone1.type = 'sine';
    drone2.type = 'triangle';
    drone1.frequency.setValueAtTime(config.bass[0], ctx.currentTime);
    drone2.frequency.setValueAtTime(config.bass[0] * 1.5, ctx.currentTime);
    droneGain.gain.setValueAtTime(0.22, ctx.currentTime);
    drone1.connect(droneGain);
    drone2.connect(droneGain);
    droneGain.connect(filter);
    drone1.start();
    drone2.start();
    this.droneOscs = [drone1, drone2];

    this.stepIndex = 0;
    const playStep = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const melFreq = config.melody[this.stepIndex % config.melody.length];
      const bassFreq = config.bass[Math.floor(this.stepIndex / 2) % config.bass.length];

      // Subtle bass shift
      drone1.frequency.setTargetAtTime(bassFreq, now, 0.45);
      drone2.frequency.setTargetAtTime(bassFreq * 1.5, now, 0.45);

      // Gentle bell/piano pluck
      const noteOsc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(melFreq, now);
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.24, now + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      noteOsc.connect(noteGain);
      noteGain.connect(filter);
      noteOsc.start(now);
      noteOsc.stop(now + 2.3);

      this.stepIndex += 1;
    };

    playStep();
    this.loopTimer = window.setInterval(playStep, config.tempoMs);
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public getActiveTrack() {
    return this.activeTrack;
  }
}

export const audioEngine = new AudioEngine();
