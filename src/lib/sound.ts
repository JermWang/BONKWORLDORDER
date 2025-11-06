import { isMuted, onMuteChange } from "@/lib/mute";

type PlayOptions = {
  volume?: number; // 0..1
  rate?: number;
  loop?: boolean;
  when?: number; // seconds from now
  offset?: number; // seconds into buffer
};

type PlayHandle = {
  stop: () => void;
  setVolume: (v: number) => void;
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private urls: Record<string, string> = {
    click: "/sounds/click-tap-computer-mouse.mp3",
    "1": "/sounds/1.wav",
    "2": "/sounds/2.wav",
    "3": "/sounds/3.wav",
    explosion: "/sounds/C4 Explosion FX.wav",
    stinger: "/sounds/BWO.wav",
    theme: "/sounds/bwo_theme.mp3",
  };
  private lastPlayed = new Map<string, number>();
  private cooldownMs = 60;
  private unsubMute: (() => void) | null = null;

  private ensureContext() {
    if (this.ctx) return;
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.updateMute();
    this.unsubMute = onMuteChange(() => this.updateMute());
  }

  private updateMute() {
    if (!this.master) return;
    this.master.gain.value = isMuted() ? 0 : 1;
  }

  setUrl(key: string, url: string) {
    this.urls[key] = url;
  }

  async preload(keys?: string[]) {
    const ks = keys ?? Object.keys(this.urls);
    await Promise.all(ks.map((k) => this.fetchDecode(k).catch(() => undefined)));
  }

  private async fetchDecode(key: string): Promise<AudioBuffer> {
    if (this.buffers.has(key)) return this.buffers.get(key)!;
    this.ensureContext();
    if (!this.ctx) throw new Error("AudioContext unavailable");
    const url = this.urls[key];
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(arr);
    this.buffers.set(key, buf);
    return buf;
  }

  async play(key: string, opts: PlayOptions = {}): Promise<PlayHandle | null> {
    const now = performance.now();
    const last = this.lastPlayed.get(key) || 0;
    if (now - last < this.cooldownMs) return null; // de-dupe rapid replays
    this.lastPlayed.set(key, now);

    try {
      this.ensureContext();
      if (!this.ctx || !this.master) throw new Error("no ctx");
      const buf = await this.fetchDecode(key);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      src.loop = !!opts.loop;
      const gain = this.ctx.createGain();
      gain.gain.value = (opts.volume ?? 1) * (isMuted() ? 0 : 1);
      src.connect(gain);
      gain.connect(this.master);
      src.start(this.ctx.currentTime + (opts.when ?? 0), opts.offset ?? 0);
      const stop = () => {
        try { src.stop(); } catch {}
      };
      return { stop, setVolume: (v: number) => { gain.gain.value = v; } };
    } catch (e) {
      // Fallback
      try {
        const a = new Audio(this.urls[key]);
        a.volume = opts.volume ?? 1;
        a.muted = isMuted();
        await a.play();
        return { stop: () => { try { a.pause(); } catch {} }, setVolume: (v: number) => { a.volume = v; } };
      } catch {
        return null;
      }
    }
  }

  playClick() { return this.play("click", { volume: 0.9 }); }
  playTick(n: number) { return this.play(String(n), { volume: 0.9 }); }
  playExplosion() { return this.play("explosion", { volume: 0.5 }); }
  playStinger() { return this.play("stinger", { volume: 0.9 }); }

  async startTheme() {
    this.ensureContext();
    return this.play("theme", { volume: 0.35, loop: true });
  }
}

const Sound = new SoundManager();
export default Sound;




