const MODES = [
  { name: 'Listen', lift: 0, reply: "That sounds lonely. What does 'no idea' feel like right now?" },
  { name: 'Ask', lift: .33, reply: 'When did you last feel pulled toward a problem, even a little?' },
  { name: 'Suggest', lift: .67, reply: 'Write down three things that frustrated you this week. Start there.' },
  { name: 'Push', lift: 1, reply: "You've been researching for months. Pick one idea and talk to five people by Friday." },
];

let instance = 0;

/** Mount the four authored examples. No visitor text is sent anywhere. */
export function mountDawnDemo(container, { reducedMotion } = {}) {
  const prefix = `dawn-demo-${++instance}`;
  const providedMotionQuery = reducedMotion && typeof reducedMotion === 'object' && 'matches' in reducedMotion;
  const motionQuery = providedMotionQuery ? reducedMotion : window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let selected = 0;
  let userEngaged = false;
  let inView = false;
  let timer = 0;
  let destroyed = false;

  container.classList.add('dawn-demo');
  container.setAttribute('aria-labelledby', `${prefix}-heading`);
  container.style.setProperty('--demo-lift', '0');
  container.innerHTML = `
    <div class="dawn-demo-light" aria-hidden="true"></div>
    <div class="dawn-demo-inner">
      <h2 id="${prefix}-heading" class="dawn-demo-heading">Sometimes you need a question.<br> Sometimes, <em>a push.</em></h2>
      <p class="dawn-demo-caption">An example of four ways to respond</p>
      <div class="dawn-demo-example">
        <p class="dawn-demo-thought">I have no idea what to build, and everyone around me seems to know.</p>
        <div class="dawn-demo-tabs" role="tablist" aria-label="Explore four ways Unstuck could respond">
          ${MODES.map((mode, index) => `<button type="button" class="dawn-demo-tab" role="tab" id="${prefix}-tab-${index}" aria-controls="${prefix}-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-demo-mode="${index}">${mode.name}</button>`).join('')}
        </div>
        <div class="dawn-demo-replies" aria-live="off">
          ${MODES.map((mode, index) => `<div class="dawn-demo-reply${index === 0 ? ' is-active' : ''}" role="tabpanel" id="${prefix}-panel-${index}" aria-labelledby="${prefix}-tab-${index}" aria-hidden="${index !== 0}" tabindex="${index === 0 ? 0 : -1}"><p>${mode.reply}</p></div>`).join('')}
        </div>
      </div>
      <p class="dawn-demo-closing">Unstuck would learn which one you need,<br> in the voice of someone you already trust.</p>
    </div>`;

  const tabs = [...container.querySelectorAll('.dawn-demo-tab')];
  const panels = [...container.querySelectorAll('.dawn-demo-reply')];
  const replies = container.querySelector('.dawn-demo-replies');

  const prefersStillness = () => reducedMotion === true || motionQuery.matches;
  const canCycle = () => !destroyed && !userEngaged && !prefersStillness() && inView && !document.hidden;

  function stopTimer() {
    window.clearTimeout(timer);
    timer = 0;
  }

  function schedule() {
    stopTimer();
    if (!canCycle()) return;
    timer = window.setTimeout(() => {
      if (!canCycle()) return;
      select((selected + 1) % MODES.length);
      schedule();
    }, 4000);
  }

  function select(index) {
    selected = index;
    container.style.setProperty('--demo-lift', String(MODES[index].lift));
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].classList.toggle('is-active', i === index);
      panels[i].setAttribute('aria-hidden', String(i !== index));
      panels[i].tabIndex = i === index ? 0 : -1;
    });
  }

  function engage() {
    userEngaged = true;
    replies.setAttribute('aria-live', 'polite');
    stopTimer();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      engage();
      select(index);
    }, { signal: events.signal });

    tab.addEventListener('keydown', event => {
      engage();
      let target;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % MODES.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index + MODES.length - 1) % MODES.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = MODES.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      select(target);
      tabs[target].focus();
    }, { signal: events.signal });
  });

  // Section-heading focus from the scroll cue should not cancel the demonstration.
  container.addEventListener('focusin', event => {
    if (event.target.closest('.dawn-demo-tab, .dawn-demo-reply')) engage();
  }, { signal: events.signal });
  document.addEventListener('visibilitychange', schedule, { signal: events.signal });
  motionQuery.addEventListener('change', schedule);

  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    inView = entry.isIntersecting && entry.intersectionRatio >= .25;
    schedule();
  }, { threshold: [0, .25] });
  observer.observe(container);

  return () => {
    destroyed = true;
    stopTimer();
    observer.disconnect();
    events.abort();
    motionQuery.removeEventListener('change', schedule);
  };
}
