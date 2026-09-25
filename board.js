const SHEET_URL = '';

const STORAGE_KEY = 'unstuck-dawn-board-v1';
const PROMPTS = [
  'A time I felt stuck',
  'What actually helped',
  'Advice that landed wrong',
  "A voice I'd actually listen to",
];
const POLL_OPTIONS = ['New parents', 'Founders', 'Career changers', 'Students facing a big test', 'After a breakup'];
const SEEDS = [
  'Studying for the GMAT after years away from standardized tests.',
  'Going through a breakup.',
  'A difficult conversation I kept putting off.',
  'Becoming a parent.',
  'Trying to support my wife through postpartum.',
  'Getting back to work after all of it.',
].map((text, index) => ({ id: `varun-seed-${index}`, type: 'card', prompt: PROMPTS[0], text, name: 'Varun', timestamp: '', seed: true }));

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const makeId = () => globalThis.crypto?.randomUUID?.() || `moment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const characters = value => Array.from(value);
const trimTo = (value, length) => characters(String(value || '').trim()).slice(0, length).join('');
const seedNumber = value => [...value].reduce((sum, letter) => ((sum * 31) + letter.charCodeAt(0)) >>> 0, 7);

function validRow(row) {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^[\w-]{1,100}$/.test(row.id)) return null;
  if (row.type === 'card') {
    if (!PROMPTS.includes(row.prompt) || typeof row.text !== 'string' || !row.text.trim() || characters(row.text).length > 280) return null;
    if (typeof row.name !== 'string' || characters(row.name).length > 60) return null;
  } else if (row.type === 'vote') {
    if (!POLL_OPTIONS.includes(row.prompt)) return null;
  } else return null;
  return {
    id: row.id, type: row.type, prompt: row.prompt,
    text: row.type === 'card' ? row.text.trim() : '',
    name: row.type === 'card' ? row.name.trim() : '',
    timestamp: typeof row.timestamp === 'string' ? row.timestamp : '',
  };
}

/** Mount one board. The caller owns the container and invokes the returned cleanup on unmount. */
export function mountBoard(container, { reducedMotion = false } = {}) {
  const events = new AbortController();
  const requests = new Set();
  const timers = new Set();
  let disposed = false;
  let remoteState = SHEET_URL ? 'loading' : 'local';
  let storageWorks = true;
  let localCards = [];
  let localVote = null;
  let remoteRows = [];
  let selectedPrompt = PROMPTS[0];
  let submitting = false;
  let voting = false;

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored && stored.version === 1) {
      localCards = Array.isArray(stored.cards) ? stored.cards.map(validRow).filter(row => row?.type === 'card') : [];
      localVote = validRow(stored.vote);
      if (localVote?.type !== 'vote') localVote = null;
    }
    const probe = `${STORAGE_KEY}-check`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch { storageWorks = false; }

  const on = (element, event, handler) => element.addEventListener(event, handler, { signal: events.signal });
  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, cards: localCards, vote: localVote }));
      storageWorks = true;
      return true;
    } catch { storageWorks = false; return false; }
  };
  const reduced = () => typeof reducedMotion === 'function' ? reducedMotion()
    : reducedMotion && typeof reducedMotion === 'object' ? Boolean(reducedMotion.matches) : Boolean(reducedMotion);
  const later = (fn, delay) => {
    const id = window.setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, delay);
    timers.add(id);
  };

  container.classList.add('moment-board');
  container.setAttribute('aria-labelledby', 'board-title');
  if (!container.id) container.id = 'board';
  const inner = node('div', 'board-inner');
  const heading = node('header', 'board-heading');
  heading.append(node('p', 'board-eyebrow', 'A FEW PLACES WE BEGIN'));
  const title = node('h2', '', 'Pin a moment.');
  title.id = 'board-title';
  title.tabIndex = -1;
  heading.append(title, node('p', 'board-subtitle', "I'm learning how people get unstuck. Leave one."));

  const form = node('form', 'board-composer');
  const chipGroup = node('fieldset', 'board-prompts');
  chipGroup.append(node('legend', 'board-label', 'Pick a prompt. See the moments below.'));
  const chipRow = node('div', 'board-chip-row');
  const chips = PROMPTS.map(prompt => {
    const button = node('button', 'board-chip', prompt);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(prompt === selectedPrompt));
    on(button, 'click', () => {
      selectedPrompt = prompt;
      chips.forEach((chip, index) => chip.setAttribute('aria-pressed', String(PROMPTS[index] === prompt)));
      textLabel.textContent = prompt;
      renderCards();
    });
    chipRow.append(button);
    return button;
  });
  chipGroup.append(chipRow);
  const inputShell = node('div', 'board-input-shell');
  const textLabel = node('label', 'board-label', selectedPrompt);
  textLabel.htmlFor = 'moment-text';
  const input = node('textarea', 'board-text');
  input.id = 'moment-text';
  input.name = 'moment';
  input.rows = 3;
  input.required = true;
  input.placeholder = 'A few honest words are enough.';
  input.setAttribute('aria-describedby', 'moment-count board-public-note');
  const count = node('span', 'board-count', '0 / 280');
  count.id = 'moment-count';
  const controls = node('div', 'board-compose-controls');
  const nameWrap = node('div', 'board-name-wrap');
  const nameLabel = node('label', 'board-label', 'First name (optional)');
  nameLabel.htmlFor = 'moment-name';
  const name = node('input', 'board-name');
  name.id = 'moment-name';
  name.name = 'name';
  name.type = 'text';
  name.autocomplete = 'given-name';
  name.maxLength = 60;
  nameWrap.append(nameLabel, name);
  const submit = node('button', 'board-pin-button', 'Pin it');
  submit.type = 'submit';
  submit.disabled = true;
  controls.append(nameWrap, submit);
  const publicNote = node('p', 'board-public-note');
  publicNote.id = 'board-public-note';
  const status = node('p', 'board-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  inputShell.append(textLabel, input, count, controls);
  form.append(chipGroup, inputShell, publicNote, status);

  const cardsHeading = node('div', 'board-cards-heading');
  cardsHeading.append(node('h3', '', 'A few things we carry.'));
  const cardsCount = node('span', 'board-cards-count');
  cardsCount.setAttribute('aria-live', 'polite');
  cardsHeading.append(cardsCount);
  const cards = node('div', 'board-cards');

  const poll = node('section', 'board-poll');
  poll.setAttribute('aria-labelledby', 'poll-title');
  const pollHeading = node('div', 'board-poll-heading');
  const pollTitle = node('h3', '', 'Where should Unstuck start?');
  pollTitle.id = 'poll-title';
  const pollHint = node('p', 'board-poll-hint');
  pollHeading.append(pollTitle, pollHint);
  const pollOptions = node('div', 'board-poll-options');
  const pollButtons = POLL_OPTIONS.map(option => {
    const button = node('button', 'board-vote');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    const bar = node('span', 'board-vote-fill');
    bar.setAttribute('aria-hidden', 'true');
    const optionName = node('span', 'board-vote-name', option);
    const value = node('span', 'board-vote-value', '0');
    button.append(bar, optionName, value);
    on(button, 'click', () => castVote(option));
    pollOptions.append(button);
    return { button, bar, value, option };
  });
  const pollStatus = node('p', 'board-status');
  pollStatus.setAttribute('role', 'status');
  poll.append(pollHeading, pollOptions, pollStatus);

  const footer = node('footer', 'board-footer');
  const contact = node('a', 'board-contact', "Want to talk it through? I'm doing 20-minute conversations.");
  contact.href = 'mailto:varunpatel4121@gmail.com?subject=An%20Unstuck%20conversation';
  footer.append(contact, node('p', '', 'A project by Varun Patel · Generative AI Studio, Wharton'));
  inner.append(heading, form, cardsHeading, cards, poll, footer);
  container.replaceChildren(inner);

  function updateStorageNote() {
    submit.disabled = submitting || remoteState === 'loading' || !input.value.trim();
    if (remoteState === 'shared') {
      publicNote.textContent = "Cards are public. Please leave out other people's names.";
    } else if (remoteState === 'loading') {
      publicNote.textContent = "Connecting to the shared board. Please leave out other people's names.";
    } else if (!storageWorks) {
      publicNote.textContent = "Preview only. Browser storage is unavailable, so cards and votes last only while this page is open.";
    } else if (SHEET_URL) {
      publicNote.textContent = "The shared board is unavailable. Cards and votes are saved in this browser. Please leave out other people's names.";
    } else {
      publicNote.textContent = "Preview only. Cards and votes are saved in this browser. Please leave out other people's names.";
    }
  }

  function allRows() {
    const unique = new Map();
    [...localCards, ...(localVote ? [localVote] : []), ...remoteRows].forEach(row => unique.set(row.id, row));
    return [...unique.values()];
  }

  function renderCards(newId) {
    const matching = [...allRows().filter(row => row.type === 'card').reverse(), ...SEEDS]
      .filter(row => row.prompt === selectedPrompt);
    cards.replaceChildren();
    cardsCount.textContent = `${matching.length} ${matching.length === 1 ? 'moment' : 'moments'}`;
    if (!matching.length) {
      cards.append(node('p', 'board-empty', 'No moments here yet. You can leave the first one.'));
      return;
    }
    matching.forEach(row => {
      const card = node('article', 'moment-card');
      const random = seedNumber(row.id);
      card.style.setProperty('--card-turn', `${((random % 401) / 100) - 2}deg`);
      card.style.setProperty('--card-tint', ['#eee4d3', '#e5e5d5', '#ede0d0', '#e4e3cf', '#ebe3cc'][random % 5]);
      card.dataset.momentId = row.id;
      card.append(node('p', 'moment-prompt', row.prompt), node('p', 'moment-text', row.text), node('p', 'moment-name', row.name || 'Someone here'));
      if (!row.seed && !remoteRows.some(remote => remote.id === row.id)) {
        card.append(node('p', 'moment-local', storageWorks ? 'Saved in this browser' : 'Here until this page closes'));
      }
      if (row.id === newId && !reduced()) {
        card.classList.add('moment-arriving');
        later(() => card.classList.remove('moment-arriving'), 1000);
      }
      cards.append(card);
    });
  }

  function renderPoll() {
    const votes = allRows().filter(row => row.type === 'vote');
    pollButtons.forEach(({ button, bar, value, option }) => {
      const tally = votes.filter(vote => vote.prompt === option).length;
      const percent = votes.length ? Math.round(tally / votes.length * 100) : 0;
      bar.style.width = `${percent}%`;
      value.textContent = `${tally}${votes.length ? ` · ${percent}%` : ''}`;
      button.setAttribute('aria-label', `${option}, ${tally} ${tally === 1 ? 'vote' : 'votes'}${localVote?.prompt === option ? ', your choice' : ''}`);
      button.setAttribute('aria-pressed', String(localVote?.prompt === option));
      button.disabled = Boolean(localVote) || voting || remoteState === 'loading';
    });
    const scope = remoteState === 'shared' ? '' : ' in this browser';
    pollHint.textContent = localVote
      ? `${votes.length} ${votes.length === 1 ? 'vote' : 'votes'}${scope}. Your choice: ${localVote.prompt}.`
      : `One vote per browser. ${votes.length ? `${votes.length} votes${scope}.` : 'No votes yet.'}`;
  }

  async function request(method, row) {
    const controller = new AbortController();
    requests.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(SHEET_URL, {
        method, signal: controller.signal, redirect: 'follow', credentials: 'omit',
        ...(method === 'POST' ? { headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(row) } : {}),
      });
      if (!response.ok || response.type === 'opaque') throw new Error('The shared board did not confirm the request.');
      const data = await response.json();
      if (!data || data.ok !== true) throw new Error('The shared board could not complete the request.');
      if (method === 'POST' && data.id !== row.id) throw new Error('The shared board did not confirm this moment.');
      if (method === 'GET' && !Array.isArray(data.rows)) throw new Error('The shared board returned an unreadable response.');
      return data;
    } finally {
      window.clearTimeout(timeout);
      requests.delete(controller);
    }
  }

  async function saveRow(row) {
    let shared = false;
    if (SHEET_URL && remoteState === 'shared') {
      try {
        await request('POST', row);
        if (disposed) return null;
        shared = true;
        remoteRows.push(row);
      } catch {
        if (disposed) return null;
        remoteState = 'local';
      }
    }
    if (row.type === 'card') localCards.push(row);
    else localVote = row;
    const saved = persist();
    updateStorageNote();
    return shared ? 'shared' : saved ? 'local' : 'memory';
  }

  on(input, 'input', () => {
    const letters = characters(input.value);
    if (letters.length > 280) input.value = letters.slice(0, 280).join('');
    count.textContent = `${characters(input.value).length} / 280`;
    submit.disabled = submitting || remoteState === 'loading' || !input.value.trim();
  });
  on(form, 'submit', async event => {
    event.preventDefault();
    if (submitting || remoteState === 'loading') return;
    const text = trimTo(input.value, 280);
    if (!text) { input.focus(); return; }
    submitting = true;
    submit.disabled = true;
    input.readOnly = true;
    name.readOnly = true;
    chips.forEach(chip => { chip.disabled = true; });
    submit.textContent = 'Pinning…';
    status.textContent = '';
    const row = { id: makeId(), type: 'card', prompt: selectedPrompt, text, name: trimTo(name.value, 60), timestamp: new Date().toISOString() };
    const result = await saveRow(row);
    if (disposed) return;
    input.value = '';
    count.textContent = '0 / 280';
    submitting = false;
    submit.textContent = 'Pin it';
    input.readOnly = false;
    name.readOnly = false;
    chips.forEach(chip => { chip.disabled = false; });
    status.textContent = result === 'shared' ? 'Your moment is on the shared board.'
      : result === 'local' ? (SHEET_URL ? 'Saved in this browser. Sharing could not be confirmed.' : 'Saved in this browser.')
        : 'Your moment is here for now. Browser storage is unavailable, so it will disappear when this page closes.';
    renderCards(row.id);
    input.focus({ preventScroll: true });
  });

  async function castVote(option) {
    if (localVote || voting || remoteState === 'loading') return;
    voting = true;
    renderPoll();
    pollStatus.textContent = 'Saving your vote…';
    const result = await saveRow({ id: makeId(), type: 'vote', prompt: option, text: '', name: '', timestamp: new Date().toISOString() });
    if (disposed) return;
    voting = false;
    renderPoll();
    pollStatus.textContent = result === 'shared' ? 'Your vote has been added to the shared board.'
      : result === 'local' ? (SHEET_URL ? 'Your vote is saved in this browser. Sharing could not be confirmed.' : 'Your vote is saved in this browser.')
        : 'Your vote lasts only while this page is open. Browser storage is unavailable.';
  }

  updateStorageNote();
  renderCards();
  renderPoll();
  if (SHEET_URL) request('GET').then(data => {
    if (disposed) return;
    const merged = new Map(remoteRows.map(row => [row.id, row]));
    data.rows.map(validRow).filter(Boolean).forEach(row => merged.set(row.id, row));
    remoteRows = [...merged.values()];
    remoteState = 'shared';
    updateStorageNote(); renderCards(); renderPoll();
  }).catch(() => {
    if (disposed) return;
    remoteState = 'local';
    updateStorageNote(); renderPoll();
  });

  return () => {
    disposed = true;
    events.abort();
    requests.forEach(controller => controller.abort());
    timers.forEach(id => window.clearTimeout(id));
  };
}
