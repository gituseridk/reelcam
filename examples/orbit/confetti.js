// A small seeded confetti burst on a canvas: same seed, same burst, so recordings repeat.
(function () {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  const colors = ['#6248ff', '#20c3a6', '#ffb86b', '#ff6b8b', '#ffd84d'];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.burst = function (x, y, seed) {
    const r = rng(seed);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bits = Array.from({ length: 140 }, () => {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
      const v = 7 + r() * 9;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + r() * 6, h: 9 + r() * 8, spin: r() * 6, vs: (r() - 0.5) * 0.4, c: colors[Math.floor(r() * colors.length)] };
    });
    const start = performance.now();
    function frame(now) {
      const k = (now - start) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 1.3) / 0.7);
      for (const b of bits) {
        b.vy += 0.32; b.vx *= 0.985; b.vy *= 0.985; b.x += b.vx; b.y += b.vy; b.spin += b.vs;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin); ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2 * Math.abs(Math.cos(b.spin * 2)), b.w, b.h * Math.abs(Math.cos(b.spin * 2)));
        ctx.restore();
      }
      if (k < 2) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
    requestAnimationFrame(frame);
  };
})();
