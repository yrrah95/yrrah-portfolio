// 共用音準偵測：autocorrelation 抓基頻 + 跟目標音比對音分差
window.PitchDetect = (function () {
  function autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // 太小聲，當作沒偵測到

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }
    const trimmed = buf.slice(r1, r2);
    const n = trimmed.length;
    if (n < 2) return -1;

    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        c[i] += trimmed[j] * trimmed[j + i];
      }
    }
    let d = 0;
    while (d < n - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < n; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;
    if (T0 > 0 && T0 < n - 1) {
      const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a) T0 = T0 - b / (2 * a);
    }
    if (T0 <= 0) return -1;
    return sampleRate / T0;
  }

  // 忽略八度差異：把偵測到的頻率折回目標音最近的八度，回傳音分差（正=偏高，負=偏低）
  function centsOffTarget(freq, targetFreq) {
    if (freq <= 0 || targetFreq <= 0) return null;
    const semitones = 12 * Math.log2(freq / targetFreq);
    const nearestOctaveSemitones = Math.round(semitones / 12) * 12;
    return (semitones - nearestOctaveSemitones) * 100;
  }

  return { autoCorrelate: autoCorrelate, centsOffTarget: centsOffTarget };
})();
