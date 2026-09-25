const fonts = {
  instrument: { family:'Instrument Serif', weight:400 },
  fraunces: { family:'Fraunces', weight:400 },
  newsreader: { family:'Newsreader', weight:400 },
  cormorant: { family:'Cormorant Garamond', weight:500 },
  dm: { family:'DM Sans', weight:400 },
  source: { family:'Source Sans 3', weight:400 },
  manrope: { family:'Manrope', weight:400 },
};
const presets = {
  intimate:{ label:'Intimate', feeling:'instrument', stuck:'instrument', bubble:'dm' },
  grounded:{ label:'Grounded', feeling:'newsreader', stuck:'newsreader', bubble:'source' },
  expressive:{ label:'Expressive', feeling:'cormorant', stuck:'cormorant', bubble:'manrope' },
};
const iframe = document.querySelector('#font-preview');
const status = document.querySelector('#preview-status');
const inputs = Object.fromEntries(['feeling','stuck','bubble'].map(key=>[key,document.querySelector(`#${key}-font`)]));
let revision = 0;
let ready = false;
function selectedPreset() {
  return Object.entries(presets).find(([,preset])=>Object.keys(inputs).every(key=>preset[key]===inputs[key].value));
}
async function applyFonts() {
  const current = ++revision;
  const selected = selectedPreset();
  document.querySelectorAll('[data-pairing]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pairing===selected?.[0])));
  if (!ready) return;
  const choices = Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,fonts[input.value]]));
  const doc = iframe.contentDocument;
  status.textContent = 'Loading your font pairing…';
  try {
    await Promise.all([
      doc.fonts.load(`${choices.feeling.weight} 72px "${choices.feeling.family}"`),
      doc.fonts.load(`italic ${choices.stuck.weight} 72px "${choices.stuck.family}"`),
      doc.fonts.load(`400 20px "${choices.bubble.family}"`),
    ]);
    if (revision!==current) return;
    const style=doc.body.style;
    style.setProperty('--feeling-font',`"${choices.feeling.family}", serif`);
    style.setProperty('--feeling-weight',choices.feeling.weight);
    style.setProperty('--stuck-font',`"${choices.stuck.family}", serif`);
    style.setProperty('--stuck-weight',choices.stuck.weight);
    style.setProperty('--bubble-font',`"${choices.bubble.family}", sans-serif`);
    status.textContent = `${selected ? selected[1].label : 'Your mix'}: ${choices.feeling.family} · ${choices.stuck.family} Italic · ${choices.bubble.family}`;
  } catch {
    if (revision===current) status.textContent='One font could not load. Restart the preview to try again.';
  }
}
async function prepareFrame() {
  ready=false;
  const doc=iframe.contentDocument;
  const link=doc.createElement('link');
  link.rel='stylesheet';
  link.href='./assets/font-options.css';
  link.addEventListener('load',()=>{ready=true;applyFonts();},{once:true});
  link.addEventListener('error',()=>{status.textContent='The font samples could not load. Restart the preview to try again.';},{once:true});
  doc.head.append(link);
}
iframe.addEventListener('load',prepareFrame);
if (iframe.contentDocument?.readyState==='complete' && iframe.contentDocument.querySelector('#main')) prepareFrame();
Object.values(inputs).forEach(input=>input.addEventListener('change',applyFonts));
document.querySelectorAll('[data-pairing]').forEach(button=>button.addEventListener('click',()=>{
  const preset=presets[button.dataset.pairing];
  Object.entries(inputs).forEach(([key,input])=>{input.value=preset[key];});
  applyFonts();
}));
document.querySelector('#restart-preview').addEventListener('click',()=>{ready=false;iframe.src=iframe.getAttribute('src');});
const observer=new ResizeObserver(([entry])=>{
  const narrow=matchMedia('(max-width:650px)').matches;
  const width=narrow?390:1280;
  const height=narrow?844:760;
  const scale=entry.contentRect.width/width;
  iframe.style.width=`${width}px`;
  iframe.style.height=`${height}px`;
  iframe.style.transform=`scale(${scale})`;
  entry.target.style.height=`${height*scale}px`;
});
observer.observe(document.querySelector('.preview'));
