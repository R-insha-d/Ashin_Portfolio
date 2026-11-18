let timer: number | undefined;
export function announce(message: string): void {
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { el.textContent = message; }, 60);
}
