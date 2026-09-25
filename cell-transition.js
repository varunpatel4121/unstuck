// Move only the surface. Text stays at its natural size in both scenes.
export async function transitionCell({ main, source, render, destination, reducedMotion, opening }) {
  if (!source || reducedMotion.matches) {
    render();
    return;
  }

  const visual = source.querySelector('.orb-skin') || source;
  const bounds = source.getBoundingClientRect();
  const appearance = getComputedStyle(visual);
  const portal = document.createElement('div');
  portal.className = 'cell-portal';
  portal.setAttribute('aria-hidden', 'true');
  Object.assign(portal.style, {
    left: `${bounds.left}px`, top: `${bounds.top}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`,
    backgroundImage: appearance.backgroundImage,
    backgroundColor: appearance.backgroundColor,
    borderRadius: appearance.borderRadius,
    boxShadow: appearance.boxShadow,
    transform: appearance.transform,
  });
  document.body.append(portal);

  const animations = [];
  let targetVisual;
  let arrivalOpacity;
  let rendered = false;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    animations.forEach(animation => animation.cancel());
  };
  const motionChanged = () => { if (reducedMotion.matches) interrupt(); };
  window.addEventListener('resize', interrupt);
  reducedMotion.addEventListener('change', motionChanged);
  const finish = animation => animation.finished.catch(() => {});
  try {
    const departure = main.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 230, easing: 'ease-out', fill: 'forwards',
    });
    animations.push(departure);
    await finish(departure);

    render();
    rendered = true;
    if (interrupted) return;
    const target = main.querySelector(destination);
    if (!target) return;
    targetVisual = target.querySelector('.orb-skin') || target;
    const targetBounds = target.getBoundingClientRect();
    const targetStyle = getComputedStyle(targetVisual);
    const duration = opening ? 1050 : 720;
    targetVisual.style.opacity = '0';
    arrivalOpacity = main.style.opacity;
    main.style.opacity = '0';
    departure.cancel();

    const morph = portal.animate([
      { left: portal.style.left, top: portal.style.top, width: portal.style.width,
        height: portal.style.height, borderRadius: portal.style.borderRadius,
        transform: portal.style.transform },
      { left: `${targetBounds.left}px`, top: `${targetBounds.top}px`,
        width: `${targetBounds.width}px`, height: `${targetBounds.height}px`,
        borderRadius: targetStyle.borderRadius, transform: targetStyle.transform },
    ], { duration, easing: 'cubic-bezier(.22,.72,.2,1)', fill: 'forwards' });
    const arrival = main.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: duration * .46, duration: duration * .54, fill: 'forwards', easing: 'ease-out',
    });
    const surfaceIn = targetVisual.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: duration * .7, duration: duration * .3, fill: 'forwards',
    });
    const surfaceOut = portal.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: duration * .7, duration: duration * .3, fill: 'forwards',
    });
    animations.push(morph, arrival, surfaceIn, surfaceOut);
    await Promise.all([morph, arrival, surfaceIn, surfaceOut].map(finish));
  } finally {
    window.removeEventListener('resize', interrupt);
    reducedMotion.removeEventListener('change', motionChanged);
    if (!rendered) render();
    main.style.opacity = arrivalOpacity || '';
    if (targetVisual) targetVisual.style.opacity = '';
    animations.forEach(animation => animation.cancel());
    portal.remove();
  }
}
