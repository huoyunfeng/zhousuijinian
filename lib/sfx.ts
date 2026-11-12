/**
 * 抓周音效（DEV_SPEC 6.4.4）：WebAudio 现场合成。
 * 只在背景音乐已开启（<html data-audio="on">）时发声，任何异常都静默吞掉，
 * 不能影响交互。
 */

let context: AudioContext | null = null;

function audioEnabled(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.audio === "on";
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  try {
    if (!context) context = new window.AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

interface Tone {
  type: OscillatorType;
  frequency: number;
  gain: number;
  duration: number;
  delay?: number;
}

function playTone(audio: AudioContext, tone: Tone): void {
  const start = audio.currentTime + (tone.delay ?? 0);
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.frequency, start);
  envelope.gain.setValueAtTime(tone.gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
  oscillator.connect(envelope);
  envelope.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + tone.duration + 0.02);
}

/** 抓起：三角波 180Hz，60ms 收干 */
export function playPick(): void {
  try {
    if (!audioEnabled()) return;
    const audio = getContext();
    if (!audio) return;
    playTone(audio, { type: "triangle", frequency: 180, gain: 0.12, duration: 0.06 });
  } catch {
    /* 音效失败不影响交互 */
  }
}

/** 展开：正弦 880Hz + 1320Hz，400ms 衰减 */
export function playReveal(): void {
  try {
    if (!audioEnabled()) return;
    const audio = getContext();
    if (!audio) return;
    playTone(audio, { type: "sine", frequency: 880, gain: 0.08, duration: 0.4 });
    playTone(audio, { type: "sine", frequency: 1320, gain: 0.08, duration: 0.4, delay: 0.02 });
  } catch {
    /* 音效失败不影响交互 */
  }
}
