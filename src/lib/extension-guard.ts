/**
 * Development only. Browser extensions edit the server-rendered DOM before React hydrates, so
 * `next dev` reports hydration mismatches that have nothing to do with the app:
 *
 * - Attributes stamped onto elements (Bitdefender: `bis_skin_checked`, `bis_register`,
 *   `__processed_<uuid>__`) are removed as they appear.
 * - <script>/<link> elements loaded from an extension URL (`chrome-extension://…`) and injected into
 *   <head> or <body> get claimed in place of the app's own scripts. They are moved to be direct
 *   children of <html>, which React never walks while hydrating; they stay in the document, and a
 *   moved script is not re-run.
 *
 * React never diffs attributes in production, so this is only rendered in development. It runs in
 * <head> before <body> is parsed; the observer callback runs before React's next hydration task.
 * It disconnects a while after `load`, and a work budget stops it if an extension keeps undoing it.
 */
export const EXTENSION_GUARD_SCRIPT = `(function(){
var left=20000,o=null,d=document.documentElement,X=/^(chrome|moz|safari-web|ms-browser)-extension:/;
function bad(n){return n.indexOf('bis_')===0||n.indexOf('__processed_')===0}
function stop(){if(o){o.disconnect();o=null}}
function spend(){if(left--<=0){stop();return false}return true}
function clean(el){var a=el.attributes;for(var i=a.length-1;i>=0;i--){var n=a[i].name;if(bad(n)){if(!spend())return;el.removeAttribute(n)}}}
function park(el){var t=el.nodeName;if((t!=='SCRIPT'&&t!=='LINK')||el.parentNode===d)return;var u=el.getAttribute('src')||el.getAttribute('href');if(u&&X.test(u)&&spend())d.appendChild(el)}
o=new MutationObserver(function(rs){for(var i=0;i<rs.length&&o;i++){var r=rs[i];if(r.type==='attributes'){var n=r.attributeName;if(n&&bad(n)&&r.target.hasAttribute(n)&&spend())r.target.removeAttribute(n)}else{for(var j=0;j<r.addedNodes.length&&o;j++){if(r.addedNodes[j].nodeType===1)park(r.addedNodes[j])}}}});
o.observe(d,{attributes:true,childList:true,subtree:true});
var all=document.getElementsByTagName('*'),i;for(i=0;i<all.length&&o;i++)clean(all[i]);
var ext=d.querySelectorAll('script,link');for(i=0;i<ext.length&&o;i++)park(ext[i]);
window.addEventListener('load',function(){setTimeout(stop,10000)});
})();`;
