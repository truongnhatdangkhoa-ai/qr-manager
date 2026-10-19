/* settings.js — Màn Cài đặt: giao diện (Theo hệ thống / Sáng / Tối) và ngôn ngữ (Tiếng Việt / English). */
(function(){
'use strict';
var st=document.getElementById('st');if(!st)return;
var $=function(s){return document.querySelector(s);};
var TK='qr-manager-theme',metas=[].slice.call(document.querySelectorAll('meta[name="theme-color"]'));
metas.forEach(function(m){m.setAttribute('data-c',m.getAttribute('content'));m.setAttribute('data-m',m.getAttribute('media')||'');});
function curTheme(){try{var t=localStorage.getItem(TK);return t==='light'||t==='dark'?t:'auto';}catch(e){return'auto';}}
function applyTheme(v){
  var h=document.documentElement;
  if(v==='light'||v==='dark')h.setAttribute('data-theme',v);else h.removeAttribute('data-theme');
  metas.forEach(function(m){
    if(v==='auto'){m.setAttribute('content',m.getAttribute('data-c'));if(m.getAttribute('data-m'))m.setAttribute('media',m.getAttribute('data-m'));}
    else{m.setAttribute('content',v==='dark'?'#0E131B':'#F3F5F9');m.removeAttribute('media');}
  });
}
function setTheme(v){try{if(v==='auto')localStorage.removeItem(TK);else localStorage.setItem(TK,v);}catch(e){}applyTheme(v);mark();}
function mark(){
  var t=curTheme(),l=window.QM_LANG?QM_LANG():'vi';
  [].forEach.call($('#stTheme').children,function(b){var on=b.dataset.v===t;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  [].forEach.call($('#stLang').children,function(b){var on=b.dataset.v===l;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
}
function hide(){st.classList.remove('open');setTimeout(function(){if(!st.classList.contains('open'))st.hidden=true;},300);}
function open(){
  if(window.QMLayers&&QMLayers.has('settings'))return;
  mark();st.hidden=false;
  requestAnimationFrame(function(){requestAnimationFrame(function(){st.classList.add('open');});});
  if(window.QMLayers)QMLayers.push('settings',hide);
}
$('#stOpen').addEventListener('click',open);
st.addEventListener('click',function(e){if(e.target===st&&window.QMLayers)QMLayers.closeTop();});
$('#stTheme').addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(b)setTheme(b.dataset.v);});
$('#stLang').addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(b&&window.QM_I18N){QM_I18N.set(b.dataset.v);mark();}});
function links(){var l=window.QM_LANG?QM_LANG():'vi';[].forEach.call(document.querySelectorAll('a[href^="privacy.html"]'),function(a){a.setAttribute('href','privacy.html?lang='+l);});}
window.addEventListener('qm-lang',function(){mark();links();});links();
var av=$('#appVer');if(av)av.textContent=self.APP_VERSION||'?';
applyTheme(curTheme());mark();
})();
