export const MOTION_STORAGE_KEY = 'an-motion';
/** sessionStorage flag: once the full intro has played in this tab, later loads get the short cut. */
export const PRELOADER_SEEN_KEY = 'an-leader';
/**
 * Covers only "the app never hydrated": if the bundle has not taken over by then, the page is
 * released without an intro. Once the preloader component runs it clears this timer
 * (window.__anPreloaderTimer) and owns its own cap.
 */
export const PRELOADER_FAILSAFE_MS = 6000;
/**
 * Runs before first paint: sets html[data-motion]="on"|"paused" and html[data-save-data].
 * When motion is on it also sets html[data-preloader]="full"|"short" (mirrored on
 * window.__anPreloader), which shows the intro preloader and locks scrolling until it finishes.
 */
export const MOTION_BOOT_SCRIPT = `(function(){var d=document.documentElement,m='on',q='(prefers-reduced-motion: reduce)';try{var s=localStorage.getItem('${MOTION_STORAGE_KEY}');if(s==='on'||s==='paused'){m=s}else if(window.matchMedia(q).matches){m='paused'}}catch(e){try{if(window.matchMedia(q).matches){m='paused'}}catch(_){}}d.setAttribute('data-motion',m);try{var c=navigator.connection;if(c&&c.saveData){d.setAttribute('data-save-data','true')}}catch(e){}if(m==='on'){var v='full';try{if(sessionStorage.getItem('${PRELOADER_SEEN_KEY}')){v='short'}}catch(e){}d.setAttribute('data-preloader',v);window.__anPreloader=v;window.__anPreloaderTimer=setTimeout(function(){if(window.__anPreloader){window.__anPreloader=null;d.removeAttribute('data-preloader');window.dispatchEvent(new Event('preloader:done'))}},${PRELOADER_FAILSAFE_MS})}})();`;
