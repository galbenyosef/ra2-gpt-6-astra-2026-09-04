/** Plays the locally converted original menu loop, with deterministic teardown. */
import './menu-video.css';
export function mountMenuVideo(root:HTMLElement,src?:string) {
  const monitor=root.querySelector<HTMLElement>('.menu-monitor');
  if(!monitor||!src)return ()=>{};
  const video=document.createElement('video');video.className='menu-video';
  video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';
  video.setAttribute('aria-hidden','true');video.setAttribute('disablepictureinpicture','');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let disposed=false;
  const play=()=>{if(disposed)return;if(document.hidden||motion.matches)video.pause();else void video.play().catch(()=>{/* Static decoded frame remains visible if autoplay is blocked. */});};
  video.addEventListener('loadeddata',()=>{if(!disposed){monitor.classList.add('has-video');play();}},{once:true});
  video.addEventListener('error',()=>monitor.classList.remove('has-video'));
  document.addEventListener('visibilitychange',play);motion.addEventListener('change',play);
  monitor.prepend(video);video.src=src;play();
  return ()=>{disposed=true;video.pause();video.removeAttribute('src');video.load();video.remove();monitor.classList.remove('has-video');document.removeEventListener('visibilitychange',play);motion.removeEventListener('change',play);};
}
