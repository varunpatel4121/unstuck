import { paths } from './paths.js';
import { startOrbit } from './orbit.js';
import { transitionCell } from './cell-transition.js';

const main = document.querySelector('#main');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = matchMedia('(hover: none)');
let stopOrbit = () => {};
const state = { view: 'home', path: null, option: null, preview: null, busy: false, drafts: new Map() };
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const skin = '<span class="orb-aura"></span><span class="orb-skin"></span><span class="orb-line"></span><span class="orb-rim" aria-hidden="true"></span>';

function orb(item, kind) {
  const detail = kind === 'path' ? item.hover : item.hint;
  return `<div class="orb-drift"><button class="orb-button" data-${kind}="${item.id}" aria-label="${escapeHTML(item.label)}" aria-describedby="hint-${kind}-${item.id}">
    ${skin}<span class="orb-copy"><span class="orb-title">${escapeHTML(item.label)}</span><span class="orb-description" id="hint-${kind}-${item.id}"><span><span class="detail-line">${escapeHTML(detail)}</span></span></span></span>
  </button></div>`;
}

function home() {
  return `<section aria-label="Find a place to begin" class="home-scene"><div class="constellation">
    <div class="center-thought"><h1>I'm feeling<br><em>stuck</em></h1></div>
    ${paths.map(path => `<div class="orb-wrap">${orb(path, 'path')}</div>`).join('')}
  </div></section>`;
}

const pathTones = {
  conversation: '128,100,64', decision: '108,110,72', action: '126,96,67',
  feelings: '112,113,75', experience: '129,108,64',
};

function space(content, back, label, type) {
  const previous = back !== 'home' ? `<button class="back-button" data-view="${back}"><span aria-hidden="true">←</span>${label}</button>` : '';
  return `<section class="space-layout space-${type}" style="--tone:${pathTones[state.path.id]}">
    <nav class="space-nav" aria-label="Your reflection">
      <button class="back-button choose-start" data-view="home"><span aria-hidden="true">←</span>Choose another starting point</button>${previous}
    </nav>
    <div class="space-shell"><div class="space-surface" aria-hidden="true"></div><div class="space-content">${content}</div></div>
  </section>`;
}

function branch() {
  const path = state.path;
  return space(`<div class="journey-heading"><p class="path-echo">${escapeHTML(path.label)}</p><h1 tabindex="-1">${escapeHTML(path.question)}</h1></div>
    <div class="branch-options">${path.options.map(option => `<div class="branch-orb">${orb(option, 'option')}</div>`).join('')}</div>
    <div class="write-instead"><button class="text-button" data-custom>Something else. I'd rather write it out.<span aria-hidden="true">↗</span></button></div>`, 'home', '', 'branch');
}

function draftKey() { return `${state.path.id}:${state.option.id}`; }
function currentDraft() { return state.drafts.get(draftKey()) || ''; }

function reflect() {
  const option = state.option;
  return space(`<div class="reflection-heading"><p class="path-echo">${escapeHTML(state.path.label)}</p><h1 id="writing-question" tabindex="-1">${escapeHTML(option.prompt)}</h1></div>
    <div class="reflection-card"><textarea id="reflection-input" aria-labelledby="writing-question" placeholder="${escapeHTML(option.placeholder)}" maxlength="10000" spellcheck="true">${escapeHTML(currentDraft())}</textarea><div class="writing-footnote"><span>Your words stay in this tab.</span><span>No need to get the words right.</span></div></div>
    <div class="reflection-actions"><button class="text-button" data-view="result">I'd rather just think about it</button><button class="primary-button" data-view="result">A place to begin <span aria-hidden="true">↗</span></button></div>`, 'branch', 'Back to the question', 'writing');
}

function result() {
  const option = state.option;
  const written = currentDraft();
  return space(`<p class="eyebrow">SOMETHING YOU COULD TRY</p><h1 tabindex="-1">${escapeHTML(option.stepTitle)}</h1><p class="result-intro">${escapeHTML(option.stepText)}</p>
    <ol class="exercise-list">${option.exercise.map((item, index) => `<li><span class="step-number" aria-hidden="true">0${index + 1}</span><span>${escapeHTML(item)}</span></li>`).join('')}</ol>
    ${written.trim() ? `<details class="your-words"><summary>Your words</summary><blockquote>${escapeHTML(written)}</blockquote></details>` : ''}
    <div class="result-actions"><button class="primary-button" id="save-reflection">Keep this reflection <span aria-hidden="true">↓</span></button><button class="text-button" data-view="home">Try another way in <span aria-hidden="true">↗</span></button></div>`, 'reflect', 'Back to your words', 'result');
}

async function show(view, first = false, selectedCell = null) {
  if (state.busy) return;
  state.busy = true;
  main.inert = true;
  main.setAttribute('aria-busy', 'true');
  const opening = state.view === 'home' && view === 'branch';
  const source = selectedCell || main.querySelector('.space-surface');
  stopOrbit();
  const render = () => {
    state.preview = null;
    state.view = view;
    document.body.classList.toggle('is-home', view === 'home');
    main.classList.remove('view-leave', 'view-enter');
    main.innerHTML = ({home, branch, reflect, result}[view])();
    if (view === 'home') {
      const scene = main.querySelector('.constellation');
      scene.setAttribute('data-transitioning', '');
      stopOrbit = startOrbit(scene, reducedMotion);
    }
    if (!first) window.scrollTo({top: 0, behavior: 'instant'});
  };
  try {
    await transitionCell({main, source, render, reducedMotion, opening,
      destination: view === 'home' ? `.orb-button[data-path="${state.path?.id}"]` : '.space-surface'});
  } finally {
    main.querySelector('.constellation')?.removeAttribute('data-transitioning');
    main.inert = false;
    main.removeAttribute('aria-busy');
    if (!first) {
      const heading = main.querySelector('h1');
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
    }
    state.busy = false;
  }
}

function previewOnTouch(button, event) {
  const touch = event.pointerType === 'touch' || (!event.pointerType && coarsePointer.matches && event.detail > 0);
  if (!touch) return false;
  const key = button.dataset.path || button.dataset.option;
  if (state.preview === key) return false;
  main.querySelectorAll('.is-preview').forEach(item => {
    item.classList.remove('is-preview');
    item.querySelector('button').setAttribute('aria-expanded', 'false');
  });
  button.closest('.orb-wrap,.branch-orb').classList.add('is-preview');
  button.setAttribute('aria-expanded', 'true');
  state.preview = key;
  return true;
}

main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || state.busy) return;
  if (button.dataset.path) {
    if (previewOnTouch(button, event)) return;
    state.path = paths.find(path => path.id === button.dataset.path);
    show('branch', false, button);
  } else if (button.dataset.option) {
    if (previewOnTouch(button, event)) return;
    state.option = state.path.options.find(option => option.id === button.dataset.option);
    show('reflect');
  } else if (button.hasAttribute('data-custom')) {
    state.option = {
      id:'your-own-words', label:'In my own words', prompt:'What would you like a little room to think about?',
      placeholder:'What has been on my mind is…', stepTitle:'Stay with what you noticed.',
      stepText:'You can come back to your words, share them with someone you trust, or leave them here for now. If you want to keep exploring, try one of these questions.',
      exercise:['What feels clearer after putting it into words?','What would I like to understand a little better?','What kind of support would I welcome right now?']
    };
    show('reflect');
  } else if (button.dataset.view) show(button.dataset.view);
  else if (button.id === 'save-reflection') saveReflection();
});

main.addEventListener('input', event => {
  if (event.target.id === 'reflection-input') state.drafts.set(draftKey(), event.target.value);
});

window.addEventListener('beforeunload', event => {
  if ([...state.drafts.values()].some(value => value.trim())) {
    event.preventDefault();
    event.returnValue = '';
  }
});

document.querySelector('.wordmark').addEventListener('click', event => {
  event.preventDefault();
  if (state.view !== 'home') show('home');
  else window.scrollTo({top:0,behavior:reducedMotion.matches ? 'instant' : 'smooth'});
});

const dialog = document.querySelector('#about-dialog');
document.querySelector('#about-open').addEventListener('click', () => dialog.showModal());
document.querySelector('#about-close').addEventListener('click', () => dialog.close());
document.querySelector('#about-return').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }});

function saveReflection() {
  const text = ['UNSTUCK', '', state.path.label, state.option.label, '', state.option.prompt, currentDraft().trim() || '(Reflected without writing.)', '', state.option.stepTitle, state.option.stepText, '', ...state.option.exercise.map((item, index) => `${index + 1}. ${item}`)].join('\n');
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `unstuck-${state.path.id}-reflection.txt`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const toast = document.querySelector('#toast');
  toast.textContent = 'Your reflection is ready to keep.';
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
}

show('home', true);
