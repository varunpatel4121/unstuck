import { mountDawnDemo } from './dawn-demo.js?v=dawn-1';
import { mountBoard } from './board.js?v=dawn-1';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const demo = document.querySelector('#sometimes');
const board = document.querySelector('#board');
mountDawnDemo(demo, { reducedMotion });
mountBoard(board, { reducedMotion });
const clamp = value => Math.max(0, Math.min(1, value));
const ramp = [[27,32,25],[42,49,36],[110,83,56],[195,141,82],[250,244,234]];
const mix = (a,b,t) => a.map((value,index) => Math.round(value + (b[index]-value)*t));
function rampColor(progress) {
  const position = clamp(progress) * (ramp.length - 1);
  const index = Math.min(ramp.length - 2, Math.floor(position));
  return mix(ramp[index],ramp[index+1],position-index);
}
let frame = 0;
function paintLight() {
  frame = 0;
  const boardTop = board.getBoundingClientRect().top + scrollY;
  const main = document.querySelector('#main');
  const mainBottom = main.getBoundingClientRect().bottom + scrollY;
  const lightStart = Math.max(0, mainBottom - innerHeight*.85);
  const dawn = clamp((scrollY - lightStart) / Math.max(1, boardTop - innerHeight*.25 - lightStart));
  const lift = Number(document.body.style.getPropertyValue('--lift')) || 0;
  const journeyColor = mix(ramp[0],[86,62,38],lift);
  const color = mix(journeyColor,rampColor(dawn),clamp(dawn*3));
  const home = document.querySelector('.home-scene');
  const homeProgress = home && innerWidth > 760 ? clamp(scrollY / Math.max(1,home.offsetHeight*.9)) : 0;
  document.body.style.setProperty('--dawn',dawn.toFixed(4));
  document.body.style.setProperty('--home-progress',(reducedMotion.matches ? 0 : homeProgress).toFixed(4));
  document.body.style.setProperty('--sky-color',`rgb(${color.join(',')})`);
  document.body.style.setProperty('--grain-opacity',(0.065*(1-Math.max(dawn,lift))).toFixed(4));
  document.body.style.setProperty('--heading-scale',(1 + lift*.08).toFixed(4));
}
function requestLight() { if (!frame) frame = requestAnimationFrame(paintLight); }
addEventListener('scroll',requestLight,{passive:true});
addEventListener('resize',requestLight);
reducedMotion.addEventListener('change',requestLight);
document.addEventListener('unstuck:viewchange',requestLight);
const observer = new ResizeObserver(requestLight);
observer.observe(document.querySelector('#main'));
observer.observe(demo);
observer.observe(board);

document.addEventListener('click',event => {
  const trigger = event.target.closest('[data-scroll-board],[data-scroll-sometimes]');
  if (!trigger) return;
  const target = trigger.hasAttribute('data-scroll-board') ? board : demo;
  target.scrollIntoView({behavior:reducedMotion.matches ? 'instant' : 'smooth',block:'start'});
  const heading = target.querySelector('h2');
  if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
});
paintLight();
