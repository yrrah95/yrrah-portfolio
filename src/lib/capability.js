// 能力偵測：決定要不要啟動 three.js 場景。
// 鐵律 3 —— 無 WebGL 或使用者要求減少動態時，只留 prerender 的語意 HTML，不跑 render loop。

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// 場景只在「有 WebGL 且未要求減少動態」時啟動
export function shouldRenderScene() {
  return hasWebGL() && !prefersReducedMotion();
}
