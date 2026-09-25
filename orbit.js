// Shared phase keeps all five cells evenly spaced; only their positions rotate.
export function startOrbit(scene, reducedMotion, { speed = 1, bottomSpace = 0 } = {}) {
  const cells = [...scene.querySelectorAll('.orb-wrap')];
  const compact = matchMedia('(max-width: 760px)');
  let frame = 0;
  let phase = 0;
  let previous = 0;
  let radiusX = 0;
  let radiusY = 0;
  let engaged = false;

  function paint() {
    cells.forEach((cell, index) => {
      const angle = phase + (-126 + index * 72) * Math.PI / 180;
      if (compact.matches) {
        cell.style.transform = reducedMotion.matches ? 'none' :
          `translate3d(${Math.cos(angle) * 10}px, ${Math.sin(angle) * 10}px, 0)`;
      } else {
        cell.style.transform = `translate(-50%, -50%) translate3d(${Math.cos(angle) * radiusX}px, ${Math.sin(angle) * radiusY}px, 0)`;
      }
    });
  }

  function measure() {
    const largestWidth = Math.max(...cells.map(cell => cell.offsetWidth));
    const largestHeight = Math.max(...cells.map(cell => cell.offsetHeight));
    radiusX = Math.max(0, (scene.clientWidth - largestWidth) / 2 - 32);
    radiusY = Math.max(0, (scene.clientHeight - largestHeight) / 2 - 28 - bottomSpace);
    paint();
  }

  function tick(now) {
    const elapsed = previous ? Math.min(now - previous, 64) : 0;
    previous = now;
    if (!engaged && !scene.hasAttribute('data-transitioning') && !reducedMotion.matches && !document.hidden) {
      phase += elapsed * speed * Math.PI * 2 / (compact.matches ? 24000 : 144000);
      paint();
    }
    frame = requestAnimationFrame(tick);
  }

  function updateEngagement() {
    engaged = !!scene.querySelector('.orb-button:hover, .orb-button:focus-visible, .is-preview');
    scene.classList.toggle('orbit-engaged', engaged);
  }

  const observer = new ResizeObserver(measure);
  observer.observe(scene);
  cells.forEach(cell => observer.observe(cell));
  const events = ['pointerover', 'pointerout', 'focusin', 'focusout', 'click'];
  events.forEach(event => scene.addEventListener(event, updateEngagement));
  reducedMotion.addEventListener('change', measure);
  compact.addEventListener('change', measure);
  measure();
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    events.forEach(event => scene.removeEventListener(event, updateEngagement));
    reducedMotion.removeEventListener('change', measure);
    compact.removeEventListener('change', measure);
  };
}
