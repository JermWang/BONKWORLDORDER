export function isMuted(): boolean {
  return (window as any).__BWO_MUTED === true;
}

export function setMuted(muted: boolean) {
  (window as any).__BWO_MUTED = muted;
  window.dispatchEvent(new CustomEvent('bwo:mute-change', { detail: { muted } }));
}

export function toggleMuted() {
  setMuted(!isMuted());
}

export function onMuteChange(callback: (muted: boolean) => void) {
  const handler = (e: any) => callback(!!e?.detail?.muted);
  window.addEventListener('bwo:mute-change', handler as EventListener);
  return () => window.removeEventListener('bwo:mute-change', handler as EventListener);
}


