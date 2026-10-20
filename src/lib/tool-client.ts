// Browser-side helpers shared by the /tools/ pages.

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel)!;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(sel),
];

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Copy text and flash the button as confirmation. */
export async function copy(text: string, btn?: HTMLElement | null) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (!btn) return;
  const label = btn.dataset.label ?? btn.textContent ?? '';
  btn.dataset.label = label;
  btn.textContent = '已复制';
  btn.setAttribute('data-done', '');
  clearTimeout(Number(btn.dataset.t));
  btn.dataset.t = String(
    setTimeout(() => {
      btn.textContent = label;
      btn.removeAttribute('data-done');
    }, 1200),
  );
}

/** Uniform random integer in [0, n) from the CSPRNG, without modulo bias. */
export function randInt(n: number) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

/** "3 天" / "2 小时" style durations for seconds. */
export function humanDuration(sec: number) {
  const s = Math.abs(sec);
  const units: [number, string][] = [
    [31557600e9, '十亿年'],
    [31557600e6, '百万年'],
    [31557600, '年'],
    [86400, '天'],
    [3600, '小时'],
    [60, '分钟'],
    [1, '秒'],
  ];
  if (s < 1) return '瞬间';
  for (const [n, u] of units) {
    if (s >= n) {
      const v = s / n;
      if (u === '十亿年' && v >= 1000) return '远超宇宙寿命';
      return `${v >= 100 ? Math.round(v).toLocaleString() : +v.toFixed(1)} ${u}`;
    }
  }
  return '瞬间';
}
