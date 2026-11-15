/* Yoga Sutras Chapter 1 — lesson engine.
   Lessons are data (lessons.js). This file draws everything: home, avatar (asked once),
   interactive intro cards with petals, step types, results, pop-ups. */
window.YS=(()=>{
const $=id=>document.getElementById(id);
const app=()=>$('app');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const store={get(k,d){try{const v=localStorage.getItem('ys1-'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('ys1-'+k,JSON.stringify(v))}catch(e){}}};
let cleanups=[];const onLeave=f=>cleanups.push(f);const leave=()=>{cleanups.forEach(f=>{try{f()}catch(e){}});cleanups=[]};
const U=(id,x,y,w,h,extra)=>'<use href="#'+id+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"'+(extra||'')+'/>';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

/* ---------- pop-ups: text only (guideline 19) ---------- */
const GTIPS={Gurudev:'Gurudev Sri Sri Ravi Shankar. These lessons follow his commentary on Patanjali’s Yoga Sutras.',Prana:'Prana points are what you earn in this app.'};
let L=null; // current lesson
function tx(s){if(s==null)return '';return String(s).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(m,k,lab)=>{const t=(L&&L.tips&&L.tips[k])||GTIPS[k];return t?'<span class="tip" tabindex="0" data-tip="'+esc(t)+'">'+(lab||k)+'</span>':(lab||k)})}
const lis=a=>(a||[]).map(x=>'<li>'+tx(x)+'</li>').join('');

/* ---------- Prana ---------- */
let pts=store.get('prana',0);
const showPts=()=>$('pts').textContent=pts;
const addPts=n=>{pts+=n;store.set('prana',pts);showPts()};

/* ---------- avatar (guideline 16: chosen once, for every lesson) ---------- */
/* ---------- the Seeker: built from parts (hair, beard, glasses), a skin tone (chosen once) and a robe ---------- */
const HAIRS=[['short','Short'],['long','Long'],['bun','Bun'],['curly','Curly'],['topknot','Top knot'],['shaved','Shaved']];
const BEARDS=[['none','None'],['stubble','Stubble'],['short','Short'],['full','Full']];
const GLASSES=[['none','None'],['round','Round'],['square','Square']];
/* the five skin tones WhatsApp uses (light, medium-light, medium, medium-dark, dark) */
const SKINS=['#f0d3b8','#d6ac87','#bb8764','#9b6239','#654837'];
const ROBES={saffron:{n:'Saffron',body:'#f2a33a',sash:'#a85d12',line:'none'},white:{n:'White',body:'#f8f5ee',sash:'#f2a33a',line:'#d8cfc0'}};
const DEF_AV={skin:'#bb8764',robe:'saffron',hair:'short',beard:'none',glasses:'none'};
/* older saved Seekers used one of six ready-made characters; they move to the matching parts */
const OLD_CHARS=[{hair:'long'},{hair:'short'},{hair:'bun'},{hair:'curly'},{hair:'short',beard:'short'},{hair:'long',glasses:'round'}];
let av=store.get('avatar',null);
if(av){let ch=false;
 if(av.c!=null&&!av.hair){Object.assign(av,{beard:'none',glasses:'none'},OLD_CHARS[av.c]||{});delete av.c;ch=true}
 for(const k of ['hair','beard','glasses','robe'])if(!av[k]){av[k]=DEF_AV[k];ch=true}
 /* a Seeker saved with an older skin tone moves to the nearest of the five */
 if(!SKINS.includes(av.skin)){const lum=h=>{const n=parseInt(String(h).slice(1),16);return .299*(n>>16)+.587*(n>>8&255)+.114*(n&255)};const l=lum(av.skin||'#bb8764');av.skin=SKINS.reduce((b,c)=>Math.abs(lum(c)-l)<Math.abs(lum(b)-l)?c:b,SKINS[2]);ch=true}
 if(ch)store.set('avatar',av)}
const H='#2b1a10';
/* head parts are drawn for a head centred at (32,24), radius 15, then moved with o,y */
function hair(h,o,y){const T=d=>'<g transform="translate('+o+' '+y+')">'+d+'</g>';
 if(h==='long')return T('<path d="M16 24 C14 6 50 6 48 24 L50 44 Q46 46 44 40 L44 22 C40 15 24 15 20 22 L20 40 Q18 46 14 44Z" fill="'+H+'"/>');
 if(h==='bun')return T('<circle cx="32" cy="7" r="7" fill="'+H+'"/><path d="M17 22 C18 9 46 9 47 22 C42 15 24 15 17 22Z" fill="'+H+'"/>');
 if(h==='curly')return T('<g fill="'+H+'"><circle cx="20" cy="16" r="6"/><circle cx="27" cy="10" r="6.5"/><circle cx="35" cy="9" r="6.5"/><circle cx="43" cy="13" r="6"/><circle cx="47" cy="20" r="5"/><circle cx="17" cy="23" r="4.5"/></g>');
 if(h==='topknot')return T('<path d="M17 22 C18 9 46 9 47 22 C42 15 24 15 17 22Z" fill="'+H+'"/><ellipse cx="32" cy="5.5" rx="4.6" ry="4" fill="'+H+'"/><rect x="29.5" y="8" width="5" height="3" rx="1.2" fill="#a85d12"/>');
 if(h==='shaved')return T('<path d="M18.5 19 C21 11 43 11 45.5 19 C40 14.5 24 14.5 18.5 19Z" fill="'+H+'" opacity=".22"/>');
 return T('<path d="M17 22 C18 9 46 9 47 22 C42 15 24 15 17 22Z" fill="'+H+'"/>')}
function beard(b,o,y){if(!b||b==='none')return '';let d='';
 if(b==='stubble')d='<path d="M18 27 C19 37 26 40 32 40 C38 40 45 37 46 27 C43 33 39 35 32 35 C25 35 21 33 18 27Z" fill="'+H+'" opacity=".28"/>';
 if(b==='short')d='<path d="M18 27 C19 37 26 40 32 40 C38 40 45 37 46 27 C43 33 39 35 32 35 C25 35 21 33 18 27Z" fill="'+H+'"/><path d="M26.5 30.6 Q32 28.4 37.5 30.6 Q32 32.2 26.5 30.6Z" fill="'+H+'"/>';
 if(b==='full')d='<path d="M17.5 25 C18 41 25 47 32 47 C39 47 46 41 46.5 25 C43 32 39 34.5 32 34.5 C25 34.5 21 32 17.5 25Z" fill="'+H+'"/><path d="M26 30.4 Q32 27.8 38 30.4 Q32 32.4 26 30.4Z" fill="'+H+'"/>';
 return '<g transform="translate('+o+' '+y+')">'+d+'</g>'}
function specs(g,o,y,cy){if(!g||g==='none')return '';cy=cy||25;
 const d=g==='square'?'<rect x="22.2" y="'+(cy-3.8)+'" width="9" height="7.6" rx="1.6"/><rect x="32.8" y="'+(cy-3.8)+'" width="9" height="7.6" rx="1.6"/><path d="M31.2 '+cy+' H32.8"/>'
  :'<circle cx="27" cy="'+cy+'" r="4.4"/><circle cx="37" cy="'+cy+'" r="4.4"/><path d="M31.4 '+cy+' H32.6"/>';
 return '<g transform="translate('+o+' '+y+')" fill="rgba(255,255,255,.18)" stroke="#3a2a1e" stroke-width="1.7">'+d+'</g>'}
const hasBeard=ch=>ch.beard==='short'||ch.beard==='full';
function symStand(id,ch,skin,rb){const r=ROBES[rb];return '<symbol id="'+id+'" viewBox="0 0 64 100"><rect x="14" y="40" width="36" height="56" rx="16" fill="'+r.body+'" stroke="'+r.line+'" stroke-width="1.5"/><path d="M18 52 L46 82" stroke="'+r.sash+'" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="24" r="15" fill="'+skin+'"/>'+hair(ch.hair,0,0)+'<circle cx="27" cy="25" r="1.8" fill="'+H+'"/><circle cx="37" cy="25" r="1.8" fill="'+H+'"/>'+beard(ch.beard,0,0)+specs(ch.glasses,0,0)+(hasBeard(ch)?'<path d="M29 33 Q32 34.6 35 33" stroke="#e9c3a3" stroke-width="1.5" fill="none" stroke-linecap="round"/>':'<path d="M27 31 Q32 35 37 31" stroke="'+H+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>')+'</symbol>'}
/* seated cross-legged, hands resting on the knees, eyes closed */
function symSit(id,ch,skin,rb){const r=ROBES[rb],dk=rb==='white'?'#d8cfc0':'#c97d1e';return '<symbol id="'+id+'" viewBox="0 0 80 84">'+
 '<ellipse cx="40" cy="80" rx="34" ry="3.5" fill="#000" opacity=".08"/>'+
 '<path d="M5 74 C5 63 17 58 30 60 L40 64 L50 60 C63 58 75 63 75 74 C75 80 64 81 52 79 L40 76 L28 79 C16 81 5 80 5 74Z" fill="'+r.body+'" stroke="'+r.line+'" stroke-width="1.5"/>'+
 '<path d="M10 73 C20 66 34 67 46 74 M70 73 C60 66 46 67 34 74" stroke="'+dk+'" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".75"/>'+
 '<ellipse cx="50.5" cy="74.5" rx="5.2" ry="2.6" fill="'+skin+'" transform="rotate(-14 50.5 74.5)"/><ellipse cx="29.5" cy="74.5" rx="5.2" ry="2.6" fill="'+skin+'" transform="rotate(14 29.5 74.5)"/>'+
 '<path d="M27 64 C25 50 29 36 40 36 C51 36 55 50 53 64Z" fill="'+r.body+'" stroke="'+r.line+'" stroke-width="1.5"/>'+
 '<path d="M31 42 L49 60" stroke="'+r.sash+'" stroke-width="5.5" stroke-linecap="round"/>'+
 '<path d="M30 42 C22 50 17 58 14 66 M50 42 C58 50 63 58 66 66" stroke="'+r.body+'" stroke-width="7.5" fill="none" stroke-linecap="round"/>'+
 (r.line!=='none'?'<path d="M30 42 C22 50 17 58 14 66 M50 42 C58 50 63 58 66 66" stroke="'+r.line+'" stroke-width="1" fill="none" opacity=".7"/>':'')+
 '<circle cx="13.5" cy="67" r="3.8" fill="'+skin+'"/><circle cx="66.5" cy="67" r="3.8" fill="'+skin+'"/>'+
 '<circle cx="40" cy="22" r="14" fill="'+skin+'"/>'+hair(ch.hair,8,-2)+
 '<path d="M33 23 Q35 25 37 23 M43 23 Q45 25 47 23" stroke="'+H+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>'+
 beard(ch.beard,8,-2)+specs(ch.glasses,8,-2)+(hasBeard(ch)?'':'<path d="M36 29 Q40 31.5 44 29" stroke="'+H+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>')+'</symbol>'}
function symKid(id,ch,skin,rb){const r=ROBES[rb];return '<symbol id="'+id+'" viewBox="0 0 64 100"><rect x="18" y="56" width="28" height="40" rx="12" fill="'+r.body+'" stroke="'+r.line+'" stroke-width="1.5"/><path d="M21 64 L42 86" stroke="'+r.sash+'" stroke-width="5" stroke-linecap="round"/><g transform="translate(4.6 22) scale(.86)"><circle cx="32" cy="24" r="15" fill="'+skin+'"/>'+hair(ch.hair,0,0)+'<circle cx="27" cy="25" r="1.8" fill="'+H+'"/><circle cx="37" cy="25" r="1.8" fill="'+H+'"/>'+specs(ch.glasses,0,0)+'<path d="M27 31 Q32 35 37 31" stroke="'+H+'" stroke-width="1.8" fill="none" stroke-linecap="round"/></g></symbol>'}
/* other characters get varied skin tones per lesson (guideline 15) */
const OTHER=SKINS;
function otherSkins(){const seed=L?[...L.id].reduce((a,c)=>a+c.charCodeAt(0),0):0;const me=av?av.skin:'';const pool=OTHER.filter(c=>c!==me);return [pool[seed%pool.length],pool[(seed+1)%pool.length],pool[(seed+2)%pool.length]]}
function castDefs(){
 const a=av||DEF_AV,ch=a,[f,m,k]=otherSkins();
 $('castDefs').innerHTML=symStand('seeker',ch,a.skin,a.robe)+symSit('seekerSit',ch,a.skin,a.robe)+symKid('kid',ch,a.skin,a.robe)+
 '<symbol id="friend" viewBox="0 0 64 100"><rect x="14" y="40" width="36" height="56" rx="16" fill="#0f5c5e"/><path d="M20 46 Q32 56 44 46" stroke="#5fa9a3" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="32" cy="24" r="15" fill="'+f+'"/><path d="M16 26 C14 8 50 8 48 26 C46 16 40 13 32 13 C24 13 18 16 16 26Z" fill="#1d120a"/><circle cx="27" cy="25" r="1.8" fill="#1d120a"/><circle cx="37" cy="25" r="1.8" fill="#1d120a"/><path d="M27 31 Q32 35 37 31" stroke="#1d120a" stroke-width="1.8" fill="none" stroke-linecap="round"/></symbol>'+
 '<symbol id="mother" viewBox="0 0 64 100"><path d="M14 96 C14 60 20 42 32 42 C44 42 50 60 50 96Z" fill="#c4577a"/><path d="M22 46 C30 60 40 64 48 70" stroke="#d9a21b" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="32" cy="26" r="14" fill="'+m+'"/><circle cx="32" cy="9" r="7" fill="#2b1a10"/><path d="M18 26 C18 12 46 12 46 26 C42 18 22 18 18 26Z" fill="#2b1a10"/><circle cx="27" cy="27" r="1.8" fill="#2b1a10"/><circle cx="37" cy="27" r="1.8" fill="#2b1a10"/><circle cx="32" cy="20" r="1.6" fill="#c9483f"/><path d="M27 32 Q32 36 37 32" stroke="#2b1a10" stroke-width="1.8" fill="none" stroke-linecap="round"/></symbol>'+
 '<symbol id="king" viewBox="0 0 64 100"><rect x="12" y="42" width="40" height="54" rx="14" fill="#7d2e49"/><rect x="29" y="42" width="6" height="54" fill="#d9a21b"/><circle cx="32" cy="28" r="14" fill="'+k+'"/><path d="M18 18 L20 4 L26 12 L32 2 L38 12 L44 4 L46 18Z" fill="#d9a21b" stroke="#9a6f0c" stroke-width="1.5" stroke-linejoin="round"/><path d="M22 34 Q32 46 42 34 L42 38 Q32 50 22 38Z" fill="#5a3a26"/><circle cx="27" cy="27" r="1.8" fill="#2b1a10"/><circle cx="37" cy="27" r="1.8" fill="#2b1a10"/></symbol>';
 document.querySelectorAll('use').forEach(u=>{const h=u.getAttribute('href')||'';if(/^#(seeker|seekerSit|kid|friend|mother|king)$/.test(h)){u.setAttribute('href','');u.setAttribute('href',h)}});
}
function avatarScreen(then){
 leave();L=null;const first=!av;header(first?'Create your Seeker':'Change Seeker',first?'Your Seeker sits with you in every lesson':'Hair, beard, glasses and robe');
 const tmp={...DEF_AV,...(av||{})};
 const rows=[['hair','Hair',HAIRS],['beard','Beard',BEARDS],['glasses','Glasses',GLASSES]];
 const draw=()=>{
  let defs=symSit('pcm',tmp,tmp.skin,tmp.robe);
  rows.forEach(([k,,opts])=>opts.forEach(([v])=>{defs+=symSit('pv_'+k+'_'+v,{...tmp,[k]:v},tmp.skin,tmp.robe)}));
  const face=(id,lbl,pressed,data)=>'<button class="opt-face" aria-label="'+lbl+'" aria-pressed="'+pressed+'" '+data+'><svg viewBox="22 2 36 36" aria-hidden="true"><use href="#'+id+'" width="80" height="84"/></svg><span>'+lbl.split(': ')[1]+'</span></button>';
  app().innerHTML='<section class="card screen avs"><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+defs+'</defs></svg><div class="body">'+
  '<div class="av-top"><div class="prev"><svg viewBox="0 0 80 84" aria-label="Your Seeker, sitting cross-legged"><use href="#pcm"/></svg></div>'+
  '<div class="av-side">'+(first?'<p class="lbl">Skin tone <small>chosen once</small></p><div class="sw">'+SKINS.map((c,i)=>'<button style="background:'+c+'" aria-label="Skin tone '+(i+1)+' of '+SKINS.length+'" aria-pressed="'+(c===tmp.skin)+'" data-c="'+c+'"></button>').join('')+'</div>':'')+
  '<p class="lbl">Robe</p><div class="sw hs">'+Object.entries(ROBES).map(([k,r])=>'<button aria-pressed="'+(k===tmp.robe)+'" data-r="'+k+'"><span class="dotc" style="background:'+r.body+'"></span>'+r.n+'</button>').join('')+'</div></div></div>'+
  rows.map(([k,lab,opts])=>'<p class="lbl">'+lab+'</p><div class="faces">'+opts.map(([v,n])=>face('pv_'+k+'_'+v,lab+': '+n,v===tmp[k],'data-k="'+k+'" data-v="'+v+'"')).join('')+'</div>').join('')+
  '<div class="row"><span class="hint">'+(first?'Skin tone can’t be changed later.':'Skin tone stays as you chose it.')+'</span><button id="meB">This is me</button></div></div></section>';
  app().querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{tmp[b.dataset.k]=b.dataset.v;draw();app().querySelector('[data-k="'+b.dataset.k+'"][data-v="'+b.dataset.v+'"]').focus()});
  app().querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{tmp.skin=b.dataset.c;draw();app().querySelector('[data-c="'+b.dataset.c+'"]').focus()});
  app().querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{tmp.robe=b.dataset.r;draw();app().querySelector('[data-r="'+b.dataset.r+'"]').focus()});
  $('meB').onclick=()=>{if(av)tmp.skin=av.skin;av={skin:tmp.skin,robe:tmp.robe,hair:tmp.hair,beard:tmp.beard,glasses:tmp.glasses};store.set('avatar',av);castDefs();then()};
 };draw();
}

/* ---------- shared drawings ---------- */
const DRAW={
 bell:'<g><path d="M60 22 C36 22 30 44 30 64 L24 82 H96 L90 64 C90 44 84 22 60 22Z" fill="#d9a21b" stroke="#9a6f0c" stroke-width="2.5"/><path d="M40 40 C42 32 48 28 54 27" stroke="#fbe3a0" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="54" y="12" width="12" height="12" rx="4" fill="#9a6f0c"/><circle cx="60" cy="88" r="7" fill="#9a6f0c"/><g fill="none" stroke="#e889a5" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M102 48 Q110 60 102 72"/><path d="M110 40 Q122 60 110 80"/><path d="M18 48 Q10 60 18 72"/><path d="M10 40 Q-2 60 10 80"/></g></g>',
 grape:'<g><path d="M60 18 Q62 8 72 6" stroke="#5a3a26" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M64 14 C76 6 88 12 86 20 C76 22 68 20 64 14Z" fill="#3f9b6b"/><g stroke="#4d2a4d" stroke-width="1.5"><circle cx="48" cy="34" r="14" fill="#8e4a8e"/><circle cx="74" cy="34" r="14" fill="#8e4a8e"/><circle cx="36" cy="58" r="14" fill="#7b3d7b"/><circle cx="62" cy="58" r="14" fill="#8e4a8e"/><circle cx="88" cy="58" r="13" fill="#7b3d7b"/><circle cx="50" cy="82" r="14" fill="#8e4a8e"/><circle cx="76" cy="82" r="13" fill="#7b3d7b"/><circle cx="62" cy="104" r="12" fill="#8e4a8e"/></g><g fill="#fff" opacity=".45"><circle cx="43" cy="29" r="4"/><circle cx="69" cy="29" r="4"/><circle cx="57" cy="53" r="4"/><circle cx="45" cy="77" r="4"/></g></g>',
 lotusArt:'<use href="#lotus" x="0" y="14" width="120" height="88"/>'
};
const ICON={ /* small circular icons used in choices, flips, chips (no emoji) */
 crown:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#f6e7ec"/><use href="#crown" x="6" y="6" width="28" height="28"/></svg>',
 lotus:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fdeef2"/><use href="#lotus" x="5" y="9" width="30" height="22"/></svg>',
 sun:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff"/><use href="#sun" x="4" y="4" width="32" height="32"/></svg>',
 moon:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#123a40"/><path d="M16 10 A11 11 0 1 0 30 26 A8 8 0 1 1 16 10Z" fill="#fbe3a0"/></svg>',
 eye:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff"/><path d="M5 20 Q20 7 35 20 Q20 33 5 20Z" fill="#fff6e6" stroke="#a85d12" stroke-width="2"/><circle cx="20" cy="20" r="6" fill="#0f5c5e"/><circle cx="20" cy="20" r="2.6" fill="#1d2b2b"/></svg>',
 bell:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff"/><g transform="translate(6 4) scale(.24)">'+DRAW.bell+'</g></svg>',
 grape:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff"/><g transform="translate(7 5) scale(.24)">'+DRAW.grape+'</g></svg>',
 music:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff1dc"/><path d="M16 28 V12 L29 9 V25" stroke="#a85d12" stroke-width="2.6" fill="none" stroke-linejoin="round"/><ellipse cx="13" cy="28" rx="4" ry="3" fill="#a85d12"/><ellipse cx="26" cy="25" rx="4" ry="3" fill="#a85d12"/></svg>',
 nature:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#e3f1ef"/><path d="M5 30 L15 17 L21 24 L27 15 L36 30Z" fill="#3f9b6b"/><circle cx="29" cy="11" r="4" fill="#f6c46a"/></svg>',
 drop:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff"/><path d="M20 6 C14 16 11 21 11 26 A9 9 0 0 0 29 26 C29 21 26 16 20 6Z" fill="#5fa9a3"/></svg>',
 heart:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff"/><path d="M20 31 C9 23 9 13 15 12 C18 11 20 15 20 15 C20 15 22 11 25 12 C31 13 31 23 20 31Z" fill="#e889a5"/></svg>',
 q:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#eee8de"/><text x="20" y="26" text-anchor="middle" font-family="Mukta" font-weight="700" font-size="18" fill="#5b6f6f">?</text></svg>',
 fear:'<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f6e7ec"/><path d="M16 6 C10 10 10 16 16 26 C22 16 22 10 16 6Z" fill="#7d2e49"/><path d="M9 9 L6 6 M23 9 L26 6 M7 18 H4 M25 18 H28" stroke="#7d2e49" stroke-width="2" stroke-linecap="round"/></svg>',
 crave:'<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f6e7ec"/><path d="M7 20 C7 14 11 12 14 14 L14 8 C14 6 17 6 17 8 L17 14 L19 9 C20 7 23 8 22 10 L20 16 C23 14 26 16 24 19 C22 23 18 26 13 26 C9 26 7 23 7 20Z" fill="#7d2e49"/></svg>',
 dislike:'<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f6e7ec"/><circle cx="16" cy="16" r="9" fill="none" stroke="#7d2e49" stroke-width="3"/><path d="M10 10 L22 22" stroke="#7d2e49" stroke-width="3" stroke-linecap="round"/></svg>',
 special:'<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f6e7ec"/><path d="M16 5 L19 12.5 L27 13 L21 18 L23 26 L16 21.5 L9 26 L11 18 L5 13 L13 12.5Z" fill="#7d2e49"/></svg>',
 tag:'<svg viewBox="0 0 28 28"><rect x="3" y="7" width="22" height="14" rx="3" fill="#f6e7ec" stroke="#7d2e49" stroke-width="2"/><circle cx="9" cy="14" r="2.5" fill="#7d2e49"/><path d="M14 12 H21 M14 16 H19" stroke="#7d2e49" stroke-width="2"/></svg>',
 brief:'<svg viewBox="0 0 28 28"><rect x="4" y="9" width="20" height="14" rx="3" fill="#7d2e49"/><path d="M10 9 V6 H18 V9" stroke="#7d2e49" stroke-width="2" fill="none"/></svg>',
 like:'<svg viewBox="0 0 28 28"><path d="M14 23 C4 16 4 8 9 7 C12 6 14 9 14 9 C14 9 16 6 19 7 C24 8 24 16 14 23Z" fill="#7d2e49"/></svg>',
 no:'<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="none" stroke="#7d2e49" stroke-width="3"/><path d="M8 8 L20 20" stroke="#7d2e49" stroke-width="3"/></svg>',
 worry:'<svg viewBox="0 0 28 28"><path d="M7 20 A5 5 0 0 1 8 10 A7 7 0 0 1 21 11 A4.5 4.5 0 0 1 21 20Z" fill="#7d2e49"/></svg>',
 people:'<svg viewBox="0 0 28 28"><circle cx="10" cy="10" r="4" fill="#7d2e49"/><circle cx="19" cy="10" r="4" fill="#c4577a"/><path d="M3 23 C3 16 17 16 17 23Z" fill="#7d2e49"/><path d="M12 23 C12 16 26 16 26 23Z" fill="#c4577a"/></svg>'
};
const gem=(c,s)=>'<svg viewBox="0 0 40 40" aria-hidden="true"'+(s?' width="'+s+'" height="'+s+'"':'')+'><path d="M20 3 L35 15 L20 37 L5 15Z" fill="'+c+'" stroke="#5a3a26" stroke-width="1.4"/><path d="M5 15 H35 M20 3 L14 15 L20 37 L26 15 Z" stroke="#5a3a26" stroke-width="1" fill="none" opacity=".5"/><path d="M12 9 L16 7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>';
const icon=k=>ICON[k]||(k&&k.startsWith('gem:')?gem(k.slice(4)):'');

/* ---------- scenes (sun with rays, bigger Seeker, detailed lotus: guidelines 10–12) ---------- */
const stars='<g fill="#fff6e6">'+[[30,20],[70,44],[110,16],[150,36],[196,14],[230,48],[262,24],[300,40],[52,70],[284,80],[130,62],[176,74]].map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="'+(i%3?1.2:2)+'" opacity="'+(i%2?.6:.9)+'"/>').join('')+'</g>';
const moon='<path d="M262 26 A20 20 0 1 0 288 52 A16 16 0 1 1 262 26Z" fill="#fbe3a0"/>';
function scene(name,o){o=o||{};const h=o.h||220;
 const sky='<rect width="320" height="'+h+'" fill="#ffe3bd"/>'+U('sun',248,6,64,64);
 const lake=y=>'<rect x="0" y="'+y+'" width="320" height="'+(h-y)+'" fill="#0f5c5e"/><rect x="0" y="'+y+'" width="320" height="3" fill="#5fa9a3"/>';
 const ground=y=>'<rect x="0" y="'+y+'" width="320" height="'+(h-y)+'" fill="#8cc2b2"/><rect x="0" y="'+y+'" width="320" height="3" fill="#a8d8c9"/>';
 switch(name){
  case 'lake':return sky+lake(h-60)+'<g fill="none" stroke="#fff" stroke-width="1.4" opacity=".5"><ellipse cx="160" cy="'+(h-14)+'" rx="90" ry="8"/><ellipse cx="160" cy="'+(h-14)+'" rx="140" ry="12"/></g>'+U('lotus',100,h-54,120,52)+U('seekerSit',108,h-142,104,98);
  case 'lakeSide':return sky+lake(h-60)+U('lotus',20,h-46,90,42)+U('seekerSit',10,h-120,84,80);
  case 'meadow':return sky+ground(h-30)+U('lotus',236,h-42,72,36)+U('seeker',30,h-150,78,122);
  case 'night':return '<rect width="320" height="'+h+'" fill="'+(o.bg||'#123a40')+'"/>'+stars+moon+'<rect x="0" y="'+(h-50)+'" width="320" height="50" fill="#0b2f33"/><rect x="70" y="'+(h-44)+'" width="180" height="16" rx="8" fill="#7d2e49" opacity=".85"/><rect x="78" y="'+(h-50)+'" width="40" height="12" rx="6" fill="#f6e7ec"/>'+U('seekerSit',116,h-124,88,86)+'<g font-family="Yatra One" fill="#fbe3a0" opacity=".85"><text x="210" y="'+(h-110)+'" font-size="14">z</text><text x="222" y="'+(h-124)+'" font-size="18">z</text><text x="238" y="'+(h-142)+'" font-size="22">z</text></g>';
  case 'mist':return sky+lake(h-100)+U('guardian',140,h-128,164,116)+'<rect x="0" y="'+(h-40)+'" width="110" height="40" fill="#8cc2b2"/><rect x="0" y="'+(h-40)+'" width="110" height="3" fill="#a8d8c9"/>'+U('seeker',26,h-132,60,94)+(o.clear?'':'<g fill="#fff"><ellipse cx="210" cy="'+(h-96)+'" rx="130" ry="14" opacity=".6"/><ellipse cx="140" cy="'+(h-66)+'" rx="140" ry="11" opacity=".5"/><ellipse cx="250" cy="'+(h-40)+'" rx="90" ry="9" opacity=".5"/></g>');
  case 'throne':{const n=o.n||0,C=o.colors||[];let p='';for(let i=0;i<5;i++){const x=66+i*44,on=i<n;p+='<rect x="'+(x-7)+'" y="'+(on?h-124:h-70)+'" width="14" height="'+(on?60:6)+'" rx="3" fill="'+(on?'#fff6e6':'#d8cfc0')+'" stroke="#a85d12" stroke-width="'+(on?1.5:0)+'"/>'+(on?'<g transform="translate('+(x-9)+' '+(h-146)+')">'+gem(C[i],18).replace('<svg','<svg x="0" y="0"')+'</g>':'')}
   return sky+ground(h-44)+p+'<rect x="50" y="'+(h-64)+'" width="220" height="10" rx="4" fill="#a85d12"/>'+(n>=5?'<rect x="54" y="'+(h-134)+'" width="212" height="10" rx="4" fill="#f2a33a"/>'+U('lotus',112,h-180,96,50)+U('seekerSit',122,h-214,76,54):'')}
  case 'plain':return sky+ground(h-30);
 }
 return o.svg||'';
}

/* ---------- header and home ---------- */
function header(t,s){$('hTitle').textContent=t;$('hSub').textContent=s;$('homeB').hidden=!L;document.title=t}
/* ---------- levels: Prana grows the Seeker's lotus, from beginner (Seed) to expert (Full Lotus) ---------- */
const LEVELS=[['Seed',0],['Sprout',50],['Roots',150],['Stem',300],['Floating Leaf',500],['Bud',800],['Opening Bud',1200],['Blossom',1800],['Full Lotus',2600]];
function levelOf(p){let i=0;while(i<LEVELS.length-1&&p>=LEVELS[i+1][1])i++;const lo=LEVELS[i][1],hi=i<LEVELS.length-1?LEVELS[i+1][1]:null;
 return {n:i+1,name:LEVELS[i][0],lo,hi,next:hi==null?null:LEVELS[i+1][0],frac:hi==null?1:(p-lo)/(hi-lo)}}
const LV_TIP='Levels grow with your Prana: '+LEVELS.map((l,i)=>(i+1)+' '+l[0]).join(', ')+'. Seed is where every Seeker begins; Full Lotus is the top level.';

/* ---------- rewards: Prana, badges, support gems, lotus petals ---------- */
function rewards(){
 const done=store.get('done',{}),pet=store.get('petals',{}),gm=store.get('gems',{}),built=builtLessons();
 const badges=built.map(l=>({l,won:!!(done[l.id]&&done[l.id].badge)}));
 const gemSets=built.filter(l=>l.mode&&l.mode.collect).map(l=>({l,gems:l.mode.collect.gems,got:Math.max(gm[l.id]||0,done[l.id]?l.mode.collect.gems.length:0)}));
 const petals=built.reduce((a,l)=>a+Math.max(pet[l.id]||0,done[l.id]?3:0),0);
 return {badges,nb:badges.filter(b=>b.won).length,gemSets,ng:gemSets.reduce((a,g)=>a+g.got,0),tg:gemSets.reduce((a,g)=>a+g.gems.length,0),petals,tp:built.length*3,nd:built.filter(l=>done[l.id]).length,nl:built.length}
}
function builtLessons(){const out=[];(window.CATALOG||[]).forEach(m=>m.lessons.forEach(x=>{const l=x.id&&LESSONS.find(y=>y.id===x.id);if(l)out.push(l)}));return out}
function levelCard(){const lv=levelOf(pts),pct=Math.round(lv.frac*100);
 return '<section class="card lvl"><button class="lvl-av" id="chg" aria-label="Change Seeker"><svg viewBox="0 0 80 84" aria-hidden="true"><use href="#seekerSit"/></svg><span>Change</span></button>'+
 '<div class="lvl-main"><div class="lvl-top"><b>Level '+lv.n+' · '+lv.name+'</b><span class="tip tipq" tabindex="0" role="button" aria-label="About levels" data-tip="'+esc(LV_TIP)+'">?</span></div>'+
 '<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="Progress to the next level"><i style="width:'+pct+'%"></i></div>'+
 '<div class="lvl-sub">'+(lv.hi==null?pts+' Prana · top level reached':pts+' / '+lv.hi+' Prana to '+lv.next)+'</div>'+
 '<div class="ladder" aria-hidden="true">'+LEVELS.map((l,i)=>'<span class="'+(i+1<lv.n?'past':i+1===lv.n?'cur':'')+'"></span>').join('')+'</div>'+
 '<div class="scale"><span>Beginner</span><span>Expert</span></div></div></section>'}
function statTiles(){const R=rewards();
 const t=(k,ic,v,lab)=>'<button class="stat" data-go="'+k+'"><span class="ic">'+ic+'</span><b>'+v+'</b><span>'+lab+'</span></button>';
 return '<div class="stats">'+t('prana','<span class="pr">✦</span>',pts,'Prana')+t('badges',ICON.lotus.replace('<svg','<svg width="22" height="22"'),R.nb+'/'+R.nl,'Badges')+
  t('gems',gem('#f2a33a',20),R.ng+'/'+R.tg,'Gems')+t('petals','<svg viewBox="0 0 60 44" width="22" height="18"><use href="#lotus"/></svg>',R.petals+'/'+R.tp,'Petals')+'</div>'}

function home(){
 leave();L=null;header('Yoga Sutras','Chapter 1 · Samadhi Pada');castDefs();
 app().innerHTML='<div class="screen home">'+levelCard()+statTiles()+
  '<section class="card pathc"><div class="path-head" id="phd"></div><p class="sn-note" id="snN" aria-live="polite"></p><div class="snake" id="snk"></div></section></div>';
 $('chg').onclick=()=>avatarScreen(home);
 app().querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>rewardsScreen(b.dataset.go));
 drawSnake();
 const ro=new ResizeObserver(()=>drawSnake());ro.observe($('snk'));onLeave(()=>ro.disconnect());
}
function rewardsScreen(focus){
 leave();L=null;header('Your rewards','Prana, badges, gems and petals');castDefs();const R=rewards(),lv=levelOf(pts);
 app().innerHTML='<div class="screen rew">'+levelCard()+
  '<section class="card rw"><div class="body">'+
  '<h3 id="rw-badges">Badges <small>'+R.nb+' of '+R.nl+'</small></h3><ul class="shelf">'+R.badges.map(b=>'<li class="'+(b.won?'':'no')+'" title="'+esc(b.l.title)+'">'+ICON.lotus.replace('<svg','<svg width="20" height="20"')+'<span>'+esc(b.l.badge.name)+'</span></li>').join('')+'</ul>'+
  '<h3 id="rw-gems">Support gems <small>'+R.ng+' of '+R.tg+'</small></h3>'+R.gemSets.map(g=>'<div class="gemrow">'+g.gems.map((x,i)=>'<span class="'+(i<g.got?'on':'')+'">'+gem(i<g.got?x.c:'#e6ddd0',22)+esc(x.n)+'</span>').join('')+'</div>').join('')+
  '<h3 id="rw-petals">Lotus petals <small>'+R.petals+' of '+R.tp+'</small></h3><p class="hint">Three petals from the opening cards of each lesson. '+R.nd+' of '+R.nl+' lessons complete.</p>'+
  '<div class="row"><span></span><button id="rwBack">Back to the path</button></div></div></section></div>';
 $('chg').onclick=()=>avatarScreen(()=>rewardsScreen(focus));$('rwBack').onclick=()=>home();
 const t=$('rw-'+focus);if(t){t.tabIndex=-1;t.focus({preventScroll:true})}
}

/* ---------- the path: chapters → Chapter 1's modules → a module's lessons (bottom to top) ----------
   Each module opens when the one before it is complete; finished modules and lessons can always be reopened.
   Lessons not built yet are "Coming soon" and do not block the path. */
const CHAPTERS=11;let snView={lvl:'chapters',mod:null};
function progress(){
 const done=store.get('done',{}),cat=window.CATALOG||[];let prev=true,cur=null;
 const mods=cat.map((m,mi)=>{const startPrev=prev;
  const ls=m.lessons.map(x=>{const l=x.id&&LESSONS.find(y=>y.id===x.id);if(!l)return {t:x.t,built:false};
   const d=!!done[l.id],o={id:l.id,t:l.title,num:l.num,built:true,done:d,open:d||prev};if(!d){if(prev&&!cur)cur={mi,id:l.id};prev=false}return o});
  const b=ls.filter(x=>x.built);return {mi,name:m.name,ls,nb:b.length,nd:b.filter(x=>x.done).length,done:b.length>0&&b.every(x=>x.done),soon:!b.length,open:startPrev||b.some(x=>x.done)}});
 const all=mods.flatMap(m=>m.ls).filter(x=>x.built);
 return {mods,cur,ch1done:all.length>0&&all.every(x=>x.done)};
}
function isOpenLesson(id){const p=progress();for(const m of p.mods)for(const x of m.ls)if(x.id===id)return x.open;return true}
function drawSnake(){
 const box=$('snk');if(!box)return;const W=box.clientWidth||340,Hc=box.clientHeight||420;
 const P=progress(),note=t=>{$('snN').textContent=t};
 if(snView.lvl==='lessons'&&!P.mods[snView.mod])snView={lvl:'modules',mod:null};
 const lock='<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
 let N=[],head='';
 if(snView.lvl==='chapters'){
  head='<b>Chapters</b><span>Tap Chapter 1 to see its modules</span>';
  N.push({k:'ch',n:1,label:'Chapter 1 · Samadhi Pada',sub:P.mods.filter(m=>m.done).length+' of '+P.mods.filter(m=>!m.soon).length+' modules complete',st:P.ch1done?'done':'open',now:true});
  for(let c=2;c<=CHAPTERS;c++)N.push({k:'ch',n:c,label:'Chapter '+c,sub:'Coming soon',st:c===2&&P.ch1done?'later':'locked'});
 }else if(snView.lvl==='modules'){
  head='<button class="back" id="pBack" aria-label="Back to chapters">‹</button><b>Chapter 1 · Samadhi Pada</b><span>'+P.mods.filter(m=>m.done).length+' of '+P.mods.filter(m=>!m.soon).length+' modules</span>';
  P.mods.forEach(m=>N.push({k:'md',mi:m.mi,n:m.mi+1,label:m.name.replace(/^Module \d+ · /,''),sub:m.soon?'Coming soon':m.nd+' of '+m.nb+(m.nb===1?' lesson':' lessons'),st:m.soon?'later':m.done?'done':m.open?'open':'locked',now:P.cur&&P.cur.mi===m.mi}));
 }else{
  const m=P.mods[snView.mod];
  head='<button class="back" id="pBack" aria-label="Back to Chapter 1 modules">‹</button><b>'+esc(m.name)+'</b><span>'+m.nd+' of '+m.nb+' done</span>';
  m.ls.forEach(x=>N.push(x.built?{k:'ls',id:x.id,label:x.t,st:x.done?'done':x.open?'open':'locked',now:P.cur&&P.cur.id===x.id}:{k:'ls',label:x.t.replace(/^[\d–]+\s/,''),sub:'Coming soon',st:'later'}));
 }
 $('phd').innerHTML=head;
 if($('pBack'))$('pBack').onclick=()=>{snView=snView.lvl==='lessons'?{lvl:'modules',mod:null}:{lvl:'chapters',mod:null};note('');drawSnake()};
 /* fit the whole path into the box: no scrolling */
 const n=N.length,d=snView.lvl==='lessons'?30:36,pad=Math.max(d/2+6,22),gap=n>1?(Hc-2*pad)/(n-1):0,A=Math.min(W*.24,110);
 N.forEach((o,i)=>{o.r=d/2;o.x=W/2+A*Math.sin(i*0.95);o.y=Hc-pad-i*gap});
 const path=pts=>{if(!pts.length)return '';let s='M'+pts[0].x.toFixed(1)+' '+pts[0].y.toFixed(1);for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;s+=' C'+(p1.x+(p2.x-p0.x)/6).toFixed(1)+' '+(p1.y+(p2.y-p0.y)/6).toFixed(1)+' '+(p2.x-(p3.x-p1.x)/6).toFixed(1)+' '+(p2.y-(p3.y-p1.y)/6).toFixed(1)+' '+p2.x.toFixed(1)+' '+p2.y.toFixed(1)}return s};
 let reach=-1;N.forEach((o,i)=>{if(o.st==='done'||o.now)reach=i});
 const small=gap<44;
 box.innerHTML='<svg viewBox="0 0 '+W+' '+Hc+'" aria-hidden="true"><path d="'+path(N)+'" class="sn-line"/>'+(reach>=0?'<path d="'+path(N.slice(0,reach+1))+'" class="sn-done"/>':'')+'</svg>'+
  N.map((o,i)=>{const right=o.x<W/2,room=(right?W-o.x:o.x)-o.r-12,h=Math.max(40,o.r*2);
   const inner=o.st==='done'?'✓':o.st==='locked'?lock:o.k==='ls'?'':o.n;
   const pos=right?'left:'+(o.x-o.r).toFixed(1)+'px':'right:'+(W-o.x-o.r).toFixed(1)+'px';
   const aria=o.label+'. '+({done:'Complete',open:'Open',locked:'Locked',later:'Coming soon'})[o.st];
   return '<button class="sn '+o.k+' '+o.st+(o.now&&o.st!=='done'?' now':'')+(right?'':' l')+(small?' tight':'')+'" data-i="'+i+'" style="'+pos+';top:'+(o.y-h/2).toFixed(1)+'px;height:'+h+'px;max-width:'+(room+o.r*2+10).toFixed(0)+'px" aria-label="'+esc(aria)+'"><span class="dot" style="width:'+o.r*2+'px;height:'+o.r*2+'px">'+inner+'</span><span class="lab">'+esc(o.label)+(o.sub&&!small?'<small>'+esc(o.sub)+'</small>':'')+'</span></button>'}).join('');
 box.querySelectorAll('.sn').forEach(b=>b.onclick=()=>{const o=N[+b.dataset.i];
  if(o.k==='ch'){if(o.n===1){snView={lvl:'modules',mod:null};note('');drawSnake()}else note(o.st==='locked'?'Chapter '+o.n+' opens when Chapter '+(o.n-1)+' is complete.':'Chapter '+o.n+' is coming soon.');return}
  if(o.k==='md'){if(o.st==='locked'){note('This module opens when Module '+o.mi+' is complete.');return}if(o.st==='later'){note('The lessons in this module are coming soon.');return}snView={lvl:'lessons',mod:o.mi};note('');drawSnake();return}
  if(o.st==='later'){note('This lesson is coming soon.');return}
  if(o.st==='locked'){note('This lesson opens when the one before it is complete.');return}
  location.hash='lesson-'+o.id});
}

/* ---------- lesson: intro cards with petals ---------- */
let petals,doneC,ci;
function petalUI(){return '<div class="petals" aria-label="Lotus petals collected"><svg viewBox="0 0 60 44" aria-hidden="true"><ellipse cx="30" cy="39" rx="26" ry="4.5" fill="#3f9b6b"/><path id="p0" d="M30 37 C18 33 12 22 14 12 C22 17 28 26 30 37Z"/><path id="p2" d="M30 37 C42 33 48 22 46 12 C38 17 32 26 30 37Z"/><path id="p1" d="M30 36 C25 27 25 13 30 3 C35 13 35 27 30 36Z"/><ellipse id="pc" cx="30" cy="34" rx="5" ry="2.2" fill="#e6ddd0"/></svg><span id="pcount">0 of 3 petals</span></div>'}
function paintPetals(){petals.forEach((p,i)=>{if(p)$('p'+i).classList.add('got')});const n=petals.filter(Boolean).length;if(L&&n){const pt=store.get('petals',{});if(n>(pt[L.id]||0)){pt[L.id]=n;store.set('petals',pt)}}$('pcount').textContent=n===3?'Lotus open!':n+' of 3 petals';if(n===3){$('pc').setAttribute('fill','#f2a33a');document.querySelector('.petals').classList.add('full')}}
function startLesson(id){
 leave();L=LESSONS.find(l=>l.id===id);if(!L||!isOpenLesson(id)){L=null;location.hash='';home();return}
 if(!av){avatarScreen(()=>startLesson(id));return}
 castDefs();header(L.title,(/^[A-Z]/.test(String(L.num))?L.topic:'Lesson '+L.num+' · '+L.topic)+' · '+sutTag(L));
 petals=[false,false,false];doneC=[false,false,false];ci=0;renderCard();window.scrollTo(0,0);
}
function sutTag(l){return l.tag||('Sutra '+l.sutra)}
function yogi(tagText,right){return '<div class="yogiRow"><span class="yogi"><svg viewBox="0 0 80 84"><use href="#seekerSit"/></svg></span><span class="tag t-sutra">'+tx(tagText)+'</span><span class="round">'+(right||'')+'</span></div>'}
function renderCard(){
 const c=L.cards[ci];
 app().innerHTML='<section class="card"><div class="sceneBox"><svg class="scene" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Lesson picture">'+scene(c.scene||'lake',{h:180,svg:c.svg})+'</svg>'+petalUI()+'</div><div class="body" aria-live="polite">'+yogi('[[sutra|'+sutTag(L)+']]','Card '+(ci+1)+' of '+L.cards.length)+'<h2>'+tx(c.title)+'</h2><div id="cb"></div><div class="row"><button class="ghost" id="bk">'+(ci?'Back':'All lessons')+'</button><button class="next" id="nx" disabled>Next</button></div></div></section>';
 paintPetals();
 $('bk').onclick=()=>{if(ci){ci--;renderCard()}else location.hash=''};
 $('nx').textContent=ci===L.cards.length-1?(L.beginLabel||'Begin'):'Next';$('nx').disabled=!doneC[ci];
 $('nx').onclick=()=>{if(ci<L.cards.length-1){ci++;renderCard();window.scrollTo({top:0,behavior:'smooth'})}else startSteps()};
 CARDS[c.type](c,$('cb'),()=>cardDone(c));
}
function cardDone(c){
 const sec=app().querySelector('section.card');if(sec)sec.classList.add('answered');
 if(doneC[ci]){const g=document.createElement('div');g.className='got';g.innerHTML=ICON.lotus.replace('<svg','<svg width="28" height="22"')+'<span>Petal collected</span>';$('cb').appendChild(g);$('nx').disabled=false;return}
 doneC[ci]=true;petals[ci]=true;addPts(5);paintPetals();document.querySelector('.petals').animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:500});
 const g=document.createElement('div');g.className='got reveal';g.innerHTML='<svg viewBox="0 0 60 44" width="28" height="22"><use href="#lotus"/></svg><span>'+['First petal!','Second petal!','Third petal! The lotus is open.'][ci]+' +5 Prana</span>';$('cb').appendChild(g);
 $('nx').disabled=false;$('nx').focus({preventScroll:true});
}
function burst(el){const r=el.getBoundingClientRect(),b=document.createElement('div');b.className='burst';b.style.left=(r.left+r.width/2)+'px';b.style.top=(r.top+r.height/2)+'px';document.body.appendChild(b);b.animate([{transform:'scale(1)',opacity:1},{transform:'scale(14)',opacity:0}],{duration:800,easing:'ease-out'}).onfinish=()=>b.remove()}
const quoteBlock=(q,src)=>'<p class="quote">“'+tx(q)+'”'+(src===false?'':'<small>[[Gurudev]]'.replace('[[Gurudev]]',tx('[[Gurudev]]'))+(src?' '+tx(src):'')+'</small>')+'</p>';
const CARDS={
 /* tap an answer, then Gurudev's line (+ optional 5-second gaze) */
 choice(c,el,fin){
  el.innerHTML='<p class="lead">'+tx(c.lead||'Tap the one closest to you.')+'</p><div class="choices">'+c.options.map((o,i)=>'<button class="choice" data-i="'+i+'">'+icon(o.icon)+tx(o.t)+'</button>').join('')+'</div><div id="cr"></div>';
  const rv=(b,again)=>{el.querySelectorAll('.choice').forEach(x=>x.disabled=true);if(b)b.classList.add('picked');const i=b?+b.dataset.i:0,o=c.options[i];
   $('cr').innerHTML='<div class="reveal" style="margin-top:16px">'+quoteBlock(c.quote,c.source)+(o.after||c.after?'<p class="after">'+tx(o.after||c.after)+'</p>':'')+(c.gaze&&!again?'<button id="gz">'+tx(c.gaze.button)+'</button>':'')+'</div>';
   if(c.gaze&&!again){$('gz').onclick=()=>{$('gz').disabled=true;$('gz').textContent='Gazing… just look';const sc=document.querySelector('.scene');sc.innerHTML=scene('lakeSide',{h:180})+'<circle cx="160" cy="76" r="52" fill="#fff" opacity=".85"/><circle id="gr" cx="160" cy="76" r="58" fill="none" stroke="#e889a5" stroke-width="6" stroke-linecap="round" stroke-dasharray="364.4" stroke-dashoffset="364.4" transform="rotate(-90 160 76)"/>'+U('lotus',118,46,84,62);window.scrollTo({top:0,behavior:'smooth'});
     document.getElementById('gr').animate([{strokeDashoffset:364.4},{strokeDashoffset:0}],{duration:(c.gaze.seconds||5)*1000,fill:'forwards'}).onfinish=()=>{$('gz').remove();const a=document.createElement('p');a.className='after reveal';a.innerHTML=tx(c.gaze.done);$('cr').firstChild.appendChild(a);fin()}}}
   else fin()};
  if(doneC[ci]){rv(null,true);return}
  el.querySelectorAll('.choice').forEach(b=>b.onclick=()=>rv(b));
 },
 /* flip every tile, then a payoff line */
 flips(c,el,fin){
  el.innerHTML='<p class="lead">'+tx(c.lead||'Tap each one to open it.')+'</p><div class="flips" style="--n:'+Math.min(3,c.tiles.length)+'">'+c.tiles.map((t,i)=>'<div class="flip'+(doneC[ci]?' open':'')+'" role="button" tabindex="0" data-i="'+i+'" aria-label="'+esc(t.f)+'"><div class="in"><div class="f">'+icon(t.icon)+tx(t.f)+'<small>'+tx(t.sub||'Tap to open')+'</small></div><div class="b">'+(t.h?'<b>'+tx(t.h)+'</b>':'')+tx(t.b)+'</div></div></div>').join('')+'</div><div id="cr"></div>';
  const pay=()=>{$('cr').innerHTML='<div class="payoff reveal"><p class="quote" style="font-size:22px;margin:0">'+(c.payoff.plain?tx(c.payoff.q):'“'+tx(c.payoff.q)+'”')+'</p>'+(c.payoff.note?'<p class="small" style="margin-top:6px">'+tx(c.payoff.note)+'</p>':'')+'</div>'};
  if(doneC[ci]){pay();fin();return}
  const open=new Set();
  el.querySelectorAll('.flip').forEach(f=>{const go=e=>{if(e.target.closest('.tip'))return;f.classList.add('open');open.add(f.dataset.i);if(open.size===c.tiles.length&&!doneC[ci]){pay();fin()}};f.addEventListener('click',go);f.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(e)}})});
 },
 /* pick Gurudev's answer */
 pick(c,el,fin){
  const O=c.keep?c.options:shuffle(c.options);
  el.innerHTML='<p class="lead">'+tx(c.lead||'Pick one.')+'</p><div class="choices">'+O.map(o=>'<button class="choice" data-ok="'+(o[1]?1:0)+'">'+tx(o[0])+'</button>').join('')+'</div><div id="cr"></div>';
  const rv=()=>{el.querySelectorAll('.choice').forEach(x=>{x.disabled=true;if(x.dataset.ok==='1')x.classList.add('picked')});$('cr').innerHTML='<div class="reveal" style="margin-top:12px">'+quoteBlock(c.quote,c.source)+(c.note?'<p class="small">'+tx(c.note)+'</p>':'')+'</div>';fin()};
  if(doneC[ci]){rv();return}
  el.querySelectorAll('.choice').forEach(b=>b.onclick=rv);
 },
 /* read a statement, press the button */
 tap(c,el,fin){
  el.innerHTML='<p class="lead">'+tx(c.lead)+'</p><div class="payoff" style="background:var(--tealt)"><p style="margin:0;font-size:19px;font-weight:600">'+tx(c.statement)+'</p></div><div style="margin-top:12px"><button id="tb" class="wake">'+tx(c.button)+'</button></div><div id="cr"></div>';
  const rv=f=>{$('tb').disabled=true;$('cr').innerHTML='<div class="reveal" style="margin-top:12px">'+(c.quote?quoteBlock(c.quote,c.source):'')+(c.after?'<p class="after">'+tx(c.after)+'</p>':'')+(c.note?'<p class="small">'+tx(c.note)+'</p>':'')+'</div>';if(f)burst($('tb'));fin()};
  if(doneC[ci]){rv(false);return}
  $('tb').onclick=()=>rv(true);
 },
 /* a short practice hold with one fake distraction */
 holdtry(c,el,fin){
  el.innerHTML='<p class="lead">'+tx(c.lead||'Press and hold the lotus. Don’t tap anything else.')+'</p><div class="mini" id="mini"><button class="obj" id="po" aria-label="Press and hold"><svg class="ring" viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="none" stroke="rgba(15,92,94,.15)" stroke-width="10"/><circle id="pr" cx="120" cy="120" r="112" fill="none" stroke="#e889a5" stroke-width="10" stroke-linecap="round" stroke-dasharray="703.7" stroke-dashoffset="703.7"/></svg><svg class="art" viewBox="0 0 120 120">'+DRAW.lotusArt+'</svg></button><div class="coach" id="mc">Press and hold the lotus to start.</div></div>'+(c.note?'<p class="small">'+tx(c.note)+'</p>':'');
  const NEED=(c.seconds||6)*1000;let h=false,ms=doneC[ci]?NEED:0,lt=0,raf=0,shown=false,end=false;
  const ring=()=>$('pr').style.strokeDashoffset=703.7*(1-Math.min(1,ms/NEED));ring();
  const co=(t,k)=>{const m=$('mc');m.className='coach'+(k?' '+k:'');m.textContent=t};
  if(doneC[ci]){co('You’ve got it.','good');fin();return}
  const tick=t=>{if(end)return;const dt=t-lt;lt=t;if(h)ms+=dt;ring();
   if(!shown&&ms>2000){shown=true;const d=document.createElement('button');d.className='dis';d.type='button';d.textContent=c.distraction||'New message!';d.style.left='12px';d.style.top='12px';$('mini').appendChild(d);co('A distraction! Don’t tap it. Keep holding.','warn');
    d.onclick=()=>{ms=Math.max(0,ms-1500);d.remove();co('Oops, that pulled you away. Hold the lotus again.','warn')};setTimeout(()=>{if(d.isConnected){d.remove();co('Well done. You let it go.','good')}},2600)}
   if(ms>=NEED){end=true;h=false;$('po').disabled=true;co('You’ve got it. Ready for the real thing?','good');fin();return}
   raf=requestAnimationFrame(tick)};
  onLeave(()=>{end=true;cancelAnimationFrame(raf)});
  holdable($('po'),()=>{h=true;if(!raf){lt=performance.now();raf=requestAnimationFrame(tick)}if(!shown)co('Keep holding…')},()=>{h=false});
 }
};
function holdable(o,down,up){
 o.addEventListener('pointerdown',e=>{e.preventDefault();o.setPointerCapture&&o.setPointerCapture(e.pointerId);o.classList.add('held');down(e)});
 const u=()=>{o.classList.remove('held');up()};o.addEventListener('pointerup',u);o.addEventListener('pointercancel',u);o.addEventListener('lostpointercapture',u);o.addEventListener('contextmenu',e=>e.preventDefault());
 o.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();o.classList.add('held');down(e)}});o.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')u()});
}

/* ---------- lesson: steps ---------- */
let si,results,mode;
function startSteps(){si=0;results=[];mode={lives:L.mode&&L.mode.boss?L.mode.boss.lives:0,cleared:0,lost:false};runStep();window.scrollTo({top:0,behavior:'smooth'})}
function runStep(){
 leave();const s=L.steps[si];
 let hud='';
 if(L.mode&&L.mode.boss){const m=Math.round((1-mode.cleared/L.steps.length)*100);hud='<div class="hud"><div class="meter"><span>'+L.mode.boss.label+' <b>'+m+'%</b></span><div class="track"><i style="width:'+m+'%;background:linear-gradient(90deg,#9fc8c2,#0f5c5e)"></i></div></div><div class="lives">'+[0,1,2].map(i=>'<svg viewBox="0 0 60 44" class="'+(i<mode.lives?'':'gone')+'"><use href="#lotus"/></svg>').join('')+'</div></div>'}
 if(L.mode&&L.mode.collect){const g=L.mode.collect.gems;hud='<div class="gemrow">'+g.map((x,i)=>'<span class="'+(i<si?'on':'')+'">'+gem(i<si?x.c:'#e6ddd0',26)+x.n+'</span>').join('')+'</div>'}
 app().innerHTML='<section class="card stephead"><div class="body">'+yogi(s.tag||'[[sutra|'+sutTag(L)+']]',s.label||((L.stepWord||'Step')+' '+(si+1)+' of '+L.steps.length))+'<h2 style="margin-bottom:4px">'+tx(s.title)+'</h2>'+(s.lead?'<p class="lead" style="margin:0">'+tx(s.lead)+'</p>':'')+'</div></section>'+hud+'<div id="st"></div><div id="ui"></div>';
 const api={st:$('st'),ui:$('ui'),done:stepDone,addPts};
 STEPS[s.type](s,api);
}
function room(api,svg,cls){api.st.innerHTML='<div class="room '+(cls||'')+'"><svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+svg+'</svg><div class="layer"></div><div class="coach"></div></div>';const r=api.st.firstChild;return {el:r,layer:r.querySelector('.layer'),bg:r.querySelector('svg'),coach:(t,k)=>{const c=r.querySelector('.coach');c.className='coach'+(k?' '+k:'');c.innerHTML=tx(t||'')}}}
function feedback(ok,title,lines,btn,cb){return '<div class="fbk'+(ok?'':' no')+'" aria-live="polite"><div class="v">'+tx(title)+'</div><ul class="lines">'+lis(lines)+'</ul></div>'}
/* every step ends here: r = {score 0..1, lines[], title} */
/* one bottom sheet for all feedback, so the screen never grows */
function openSheet(html,label){closeSheet();const bg=document.createElement('div');bg.className='sheetbg';const sh=document.createElement('div');sh.className='card sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-label',label||'Feedback');sh.innerHTML='<div class="body">'+html+'</div>';app().append(bg,sh);return sh}
function closeSheet(){app().querySelectorAll('.sheet,.sheetbg').forEach(e=>e.remove())}
function stepDone(r){
 const s=L.steps[si];results[si]={score:r.score,s};
 if(L.mode&&L.mode.collect){const g=store.get('gems',{});if(si+1>(g[L.id]||0)){g[L.id]=si+1;store.set('gems',g)}}
 const perfect=r.score>=0.999;
 if(L.mode&&L.mode.boss){mode.cleared++;if(!perfect)mode.lives--;}
 const pts=Math.round((s.points==null?20:s.points)*r.score);if(pts)addPts(pts);
 const last=si===L.steps.length-1||(L.mode&&L.mode.boss&&mode.lives<=0);
 if(L.mode&&L.mode.boss&&mode.lives<=0)mode.lost=true;
 const ok=r.score>=0.5;
 openSheet((r.pre||'')+feedback(ok,(r.title||(ok?'Well done!':'Not quite'))+(pts?' +'+pts+' Prana':''),(r.lines||[]).concat(s.why||[]))+'<div class="row"><span></span><button id="sn">'+(last?'See my result':(s.nextLabel||'Next'))+'</button></div>','Step result');
 if(L.mode&&L.mode.collect){const g=document.querySelector('.gemrow span:nth-child('+(si+1)+')');if(g){g.classList.add('on');g.firstChild.outerHTML=gem(L.mode.collect.gems[si].c,26)}}
 $('sn').focus({preventScroll:true});
 $('sn').onclick=()=>{if(last)result();else{si++;runStep();window.scrollTo({top:0,behavior:'smooth'})}};
}

const STEPS={
 /* ----- choose: one scenario at a time, pick the right option ----- */
 choose(s,api){
  const items=s.shuffle===false?s.items:shuffle(s.items);let k=0,first=0,tries=0;const N=s.count?Math.min(s.count,items.length):items.length;
  api.st.innerHTML='<div class="prog" style="--n:'+N+'">'+Array.from({length:N},(_,i)=>'<i'+(i?'':' class="cur"')+'></i>').join('')+'</div><div id="vis"></div><div class="card"><div class="body" id="cq"></div></div>';
  const isOk=(it,key)=>Array.isArray(it.a)?it.a.includes(key):it.a===key;
  const prog=(cls)=>{const i=api.st.querySelectorAll('.prog i');i[k].className=cls;if(i[k+1])i[k+1].className='cur'};
  const show=()=>{
   const it=items[k];tries=0;
   if(s.visual==='glass')$('vis').innerHTML='<div class="window"><svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+scene('lake',{h:200})+'</svg><div class="pane" id="pane"><div class="msg"><small>'+tx(it.who||'')+'</small>'+tx(it.text)+'</div></div></div>';
   else if(s.visual==='cloud')$('vis').innerHTML='<div class="skybox"><svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+scene('lake',{h:200})+'</svg><div class="cloud'+(it.fear?' fear':'')+'" id="cl"><small>'+tx(it.who||'')+'</small>'+tx(it.text).split(' ').map(w=>'<span class="w">'+w+' </span>').join('')+'</div></div>';
   else if(s.visual==='scene')$('vis').innerHTML='<div class="card" style="overflow:hidden"><svg class="scene" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="160" fill="#ffe3bd"/>'+U('sun',262,6,50,50)+'<rect x="0" y="140" width="320" height="20" fill="#8cc2b2"/>'+(it.svg||'')+'</svg><div class="hap"><small>'+tx(s.hapLabel||'What happened')+'</small><p>'+tx(it.text)+'</p></div></div>';
   else $('vis').innerHTML='';
   const opts=it.options||s.options, O=s.keepOrder?opts:shuffle(opts);
   const grid=O.every(o=>o.icon)||(O.length>=4&&O.every(o=>String(o.t).replace(/\[\[[^|\]]*\|?|\]\]/g,'').length<=26));
   $('cq').innerHTML=(s.visual==='card'&&it.text?'<p class="q">'+tx(it.text)+'</p>':'')+(it.clue?'<p class="clue">Clue</p><p class="q" style="font-size:18px">'+tx(it.clue)+'</p>':'')+(it.q||s.q?'<p class="q" style="font-size:18px;font-weight:700">'+tx(it.q||s.q)+'</p>':'')+
    '<div class="'+(grid?'optgrid':'')+'">'+O.map(o=>'<button class="opt" data-k="'+esc(o.k)+'"'+(isOk(it,o.k)?' data-r="1"':'')+'>'+(o.icon?icon(o.icon):'')+'<span>'+tx(o.t)+'</span></button>').join('')+'</div><div id="cf"></div>';
   $('cq').querySelectorAll('.opt').forEach(b=>b.onclick=()=>pick(b));
  };
  const label=(o)=>o&&o.lab?'<span class="lab">'+tx(o.lab)+'</span>':'';
  const pick=b=>{
   const it=items[k],key=b.dataset.k,ok=isOk(it,key),opts=it.options||s.options;tries++;
   if(!ok&&s.retry){b.disabled=true;b.classList.add('wrong');const o=opts.find(x=>x.k===key);if(o&&o.lab)b.innerHTML+=label(o);$('cf').innerHTML='<div class="fbk no"><div class="v">'+tx(s.tryAgain||'Not this one')+'</div><ul class="lines">'+lis([s.hint||'Read it again and try another.'])+'</ul></div>';return}
   const firstTry=tries===1&&ok;if(firstTry)first++;
   $('cq').querySelectorAll('.opt').forEach(x=>{x.disabled=true;const o=opts.find(y=>y.k===x.dataset.k);if(isOk(it,x.dataset.k))x.classList.add('right');if(s.showLabels&&o&&o.lab&&!x.querySelector('.lab'))x.innerHTML+=label(o)});
   if(!ok)b.classList.add('wrong');
   if(ok){const p=$('pane');if(p)p.classList.add('clear');const cl=$('cl');if(cl){cl.classList.add('gone');cl.querySelectorAll('.w,small').forEach(w=>{const dx=(Math.random()-.5)*260,dy=-40-Math.random()*90;w.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) rotate('+((Math.random()-.5)*60)+'deg)',opacity:0}],{duration:1300,easing:'ease-out',fill:'forwards'})})}}
   prog(firstTry?'ok':ok?'half':'no');
   const lastItem=k===N-1;
   const fb='<div class="fbk'+(firstTry?'':' no')+'"><div class="v">'+tx(firstTry?(s.rightTitle||'Right!'):ok?(s.okTitle||'Got it'):(s.wrongTitle||'Not quite'))+'</div><ul class="lines">'+lis(it.why)+'</ul></div>';
   if(lastItem){setTimeout(()=>api.done({score:first/N,title:s.doneTitle,lines:[first+' of '+N+' on the first try.'],pre:fb}),450)}
   else{setTimeout(()=>{openSheet(fb+'<div class="row"><span></span><button id="cn">'+tx(s.nextItem||'Next')+'</button></div>');$('cn').focus({preventScroll:true});$('cn').onclick=()=>{closeSheet();k++;show()}},450)}
  };
  show();
 },
 /* ----- sort: swipe cards into two bins ----- */
 sort(s,api){
  const L0=shuffle(s.cards.filter(c=>c.bin===0)),R0=shuffle(s.cards.filter(c=>c.bin===1)),N=s.count||5,nL=Math.random()<.5?2:3;
  const cards=shuffle(L0.slice(0,Math.min(nL,L0.length)).concat(R0.slice(0,N-Math.min(nL,L0.length))));let k=0,right=0,busy=false;
  const B=s.bins;
  api.st.innerHTML='<div class="prog" style="--n:'+cards.length+'">'+cards.map((_,i)=>'<i'+(i?'':' class="cur"')+'></i>').join('')+'</div><div class="bins"><div class="bin l" id="b0">'+icon(B[0].icon)+'<div><b>'+tx(B[0].t)+'</b><small>'+tx(B[0].sub)+'</small></div></div><div class="bin r" id="b1">'+icon(B[1].icon)+'<div><b>'+tx(B[1].t)+'</b><small>'+tx(B[1].sub)+'</small></div></div></div>'+
   '<div class="card stage"><div class="swc" id="sw" tabindex="0"><span class="stamp l">'+tx(B[0].t)+'</span><span class="stamp r">'+tx(B[1].t)+'</span><div class="who" id="who"></div><div class="wl" id="wl"></div><q id="sq"></q><p class="small">Drag left or right, or use the buttons</p></div><div class="ovl" id="ov"></div></div>'+
   '<div class="two"><button class="sl" id="bl">← '+tx(B[0].t)+'</button><span class="mid" id="cnt"></span><button class="sr" id="br">'+tx(B[1].t)+' →</button></div>';
  const sw=$('sw'),sL=sw.querySelector('.stamp.l'),sR=sw.querySelector('.stamp.r');
  const reset=()=>{sw.style.transform='';sL.style.opacity=0;sR.style.opacity=0;$('b0').classList.remove('hot');$('b1').classList.remove('hot')};
  const show=()=>{const c=cards[k];busy=false;sw.dataset.bin=c.bin;$('who').innerHTML='<svg viewBox="0 0 64 100"><use href="#'+c.who+'"/></svg>';$('wl').textContent=c.label||'';$('sq').innerHTML=tx(c.t);$('cnt').textContent=(k+1)+' / '+cards.length;$('ov').classList.remove('show');sw.style.transition='none';sw.style.opacity=1;reset()};
  const decide=side=>{if(busy)return;busy=true;const c=cards[k],ok=side===c.bin;if(ok)right++;
   const pi=api.st.querySelectorAll('.prog i');pi[k].className=ok?'ok':'no';if(pi[k+1])pi[k+1].className='cur';
   sw.style.transition='transform .35s ease, opacity .35s';sw.style.transform='translateX('+(side?420:-420)+'px) rotate('+(side?18:-18)+'deg)';sw.style.opacity=0;
   setTimeout(()=>{const fb='<div class="fbk'+(ok?'':' no')+'" style="margin:0"><div class="v">'+(ok?'Right!':'Not quite')+' · '+tx(B[c.bin].t)+'</div><ul class="lines">'+lis(c.why)+'</ul></div>';
    if(k<cards.length-1){openSheet(fb+'<div class="row"><span></span><button id="sn2">Next card</button></div>');$('sn2').focus({preventScroll:true});$('sn2').onclick=()=>{closeSheet();k++;show()}}else{$('bl').disabled=$('br').disabled=true;api.done({score:right/cards.length,lines:[right+' of '+cards.length+' sorted correctly.'],pre:fb})}},300)};
  $('bl').onclick=()=>decide(0);$('br').onclick=()=>decide(1);
  let x0=null,dx=0;
  sw.addEventListener('pointerdown',e=>{if(busy)return;x0=e.clientX;dx=0;sw.setPointerCapture(e.pointerId);sw.style.transition='none'});
  sw.addEventListener('pointermove',e=>{if(x0===null)return;dx=e.clientX-x0;sw.style.transform='translateX('+dx+'px) rotate('+(dx/18)+'deg)';const q=Math.min(Math.abs(dx)/110,1);sL.style.opacity=dx<0?q:0;sR.style.opacity=dx>0?q:0;$('b0').classList.toggle('hot',dx<-60);$('b1').classList.toggle('hot',dx>60)});
  const up=()=>{if(x0===null)return;x0=null;if(dx<-110)decide(0);else if(dx>110)decide(1);else{sw.style.transition='transform .25s';reset()}};
  sw.addEventListener('pointerup',up);sw.addEventListener('pointercancel',up);
  const kd=e=>{if(e.key==='ArrowLeft'){e.preventDefault();decide(0)}else if(e.key==='ArrowRight'){e.preventDefault();decide(1)}};document.addEventListener('keydown',kd);onLeave(()=>document.removeEventListener('keydown',kd));
  show();
 },
 /* ----- catch: thoughts rise; tap only the target kind ----- */
 catch(s,api){
  const R=room(api,scene('lake')+'<g id="rip" fill="none" stroke="#fff" stroke-width="2"><ellipse cx="160" cy="206" rx="70" ry="8"/><ellipse cx="160" cy="206" rx="110" ry="12"/><ellipse cx="160" cy="206" rx="150" ry="16"/></g>');
  const pool=s.pools,q=shuffle([].concat(...Object.entries(s.take).map(([k,n])=>shuffle(pool[k]).slice(0,n).map(t=>({t,k})))));
  const total=q.length,nT=q.filter(x=>x.k===s.target).length;let still=50,sp=0,done=0,lane=0,caught=0,wrong=0,missed=0,timer=0;const live=[];
  api.ui.innerHTML='<div class="hud"><div class="meter"><span>'+tx(s.meter||'Stillness')+' <b id="sv">50%</b></span><div class="track"><i id="sb"></i></div></div><span class="round" id="left"></span></div>';
  const set=v=>{still=Math.max(0,Math.min(100,v));$('sv').textContent=Math.round(still)+'%';$('sb').style.width=still+'%';R.bg.querySelector('#rip').setAttribute('opacity',(1-still/100)*.9+.05)};set(50);
  R.layer.innerHTML='<div class="cover" id="cv"><div><p>'+tx(s.intro)+'</p><button id="go">Begin</button></div></div>';
  const fin=()=>{if(--done<=-total)return};
  const finishOne=()=>{done++;if(done>=total)setTimeout(()=>api.done({score:still/100,title:still>=80?'The lake is still!':'Good effort',lines:['Caught '+caught+' of '+nT+'. Pulled away '+wrong+' times. Missed '+missed+'.','Final stillness: '+Math.round(still)+'%.']}),500)};
  const spawn=()=>{if(sp>=total){clearInterval(timer);return}
   const th=q[sp++],W=R.el.clientWidth,Hh=R.el.clientHeight;const b=document.createElement('button');b.type='button';b.className='bub';b.textContent=th.t;b.style.left=Math.round([0.04,0.5,0.27][lane++%3]*W)+'px';R.layer.appendChild(b);
   const rec={...th,el:b,state:'open'};live.push(rec);
   const an=b.animate([{transform:'translateY(0)'},{transform:'translateY('+(-(Hh+110))+'px)'}],{duration:s.rise||8200,easing:'linear'});rec.an=an;
   b.onclick=()=>{if(rec.state!=='open')return;const r=b.getBoundingClientRect(),Lr=R.el.getBoundingClientRect();const f=document.createElement('div');f.className='flash';f.style.left=(r.left-Lr.left+r.width/2-30)+'px';f.style.top=(r.top-Lr.top-10)+'px';
    if(th.k===s.target){rec.state='caught';caught++;api.addPts(2);set(still+9);b.classList.add('hit');b.innerHTML=th.t+'<span class="kind">'+tx(s.labels[th.k])+' ✓</span>';f.textContent='+2'}else{rec.state='pulled';wrong++;set(still-12);b.classList.add('bad');b.innerHTML=th.t+'<span class="kind">'+tx(s.labels[th.k])+' ✗</span>';f.textContent='ripple!'}
    R.layer.appendChild(f);f.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-40px)',opacity:0}],{duration:900}).onfinish=()=>f.remove();
    b.disabled=true;an.pause();setTimeout(()=>{b.animate([{opacity:1},{opacity:0}],{duration:350}).onfinish=()=>{b.remove();finishOne()}},500)};
   an.onfinish=()=>{if(rec.state==='open'&&th.k===s.target){missed++;set(still-4)}b.remove();finishOne()};
   $('left').textContent=(total-sp)+' thoughts left';
  };
  $('go').onclick=()=>{$('cv').remove();spawn();timer=setInterval(spawn,s.every||2300)};
  onLeave(()=>{clearInterval(timer);live.forEach(r=>r.an&&r.an.cancel())});
 },
 /* ----- order: tap tiles in the right order ----- */
 order(s,api){
  api.st.innerHTML='<div class="card"><div class="body"><p class="q">'+tx(s.q)+'</p><div class="slots">'+s.words.map((_,i)=>'<div class="slot" id="o'+i+'">'+(i+1)+'</div>').join('')+'</div><div class="tiles">'+shuffle(s.words.map((w,i)=>({...w,i}))).map(w=>'<button class="tile" data-i="'+w.i+'"><span class="d" lang="sa">'+w.d+'</span><span class="r">'+w.r+'</span></button>').join('')+'</div></div></div>';
  let k=0,err=false;api.st.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{if(+b.dataset.i===k){const w=s.words[k];$('o'+k).className='slot filled';$('o'+k).innerHTML='<span><span class="d" lang="sa">'+w.d+'</span><br><span class="r">'+w.r+'</span></span>';b.style.visibility='hidden';k++;if(k===s.words.length)api.done({score:err?0:1})}else{err=true;b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}});
 },
 /* ----- match: tap a word, then its meaning ----- */
 match(s,api){
  api.st.innerHTML='<div class="card"><div class="body"><p class="q">'+tx(s.q||'Tap a word, then tap its meaning.')+'</p><div class="match"><div>'+s.pairs.map((p,i)=>'<button class="mw" data-i="'+i+'">'+tx(p[0])+'</button>').join('')+'</div><div>'+shuffle(s.pairs.map((p,i)=>({m:p[1],i}))).map(p=>'<button class="mm" data-i="'+p.i+'">'+tx(p.m)+'</button>').join('')+'</div></div></div></div>';
  let sel=null,n=0,err=false;
  api.st.querySelectorAll('.mw').forEach(b=>b.onclick=()=>{if(b.classList.contains('done'))return;api.st.querySelectorAll('.mw').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');sel=b});
  api.st.querySelectorAll('.mm').forEach(b=>b.onclick=e=>{if(e.target.closest('.tip'))return;if(!sel||b.classList.contains('done'))return;if(b.dataset.i===sel.dataset.i){b.classList.add('done');sel.classList.add('done');sel.classList.remove('sel');b.disabled=sel.disabled=true;sel=null;n++;if(n===s.pairs.length)api.done({score:err?0:1})}else{err=true;b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}});
 },
 /* ----- hold: press and hold one sense object while distractions pop up ----- */
 hold(s,api){
  const R=room(api,scene('plain')+'<rect x="0" y="150" width="320" height="70" fill="#0f5c5e"/>'+U('seekerSit',4,40,74,70));
  const DUR=(s.seconds||24)*1000,C=703.7;let held=false,ms=0,el=0,lt=0,raf=0,run=false,dt0=0,ended=false,actx=null,muted=false,bt=0;
  R.layer.innerHTML='<button class="obj" id="ob" aria-label="Press and hold to focus"><svg class="ring" viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="none" stroke="rgba(15,92,94,.15)" stroke-width="10"/><circle id="rf" cx="120" cy="120" r="112" fill="none" stroke="#e889a5" stroke-width="10" stroke-linecap="round" stroke-dasharray="703.7" stroke-dashoffset="703.7"/></svg><svg class="art" viewBox="0 0 120 120">'+(DRAW[s.art]||DRAW.lotusArt)+'</svg></button>'+(s.sound?'<button class="mute" id="mu">Sound: on</button>':'')+'<div class="prompt" id="pp">'+tx(s.prompts[0])+'</div><div class="settle" id="se" hidden><div><p>'+tx(s.settleText||'Now close your eyes and sit quietly.')+'</p><div class="cd" id="cd"></div><p style="font-size:16px;opacity:.85">Open them when the screen changes.</p></div></div>';
  R.coach(s.hint||'Press and hold to begin');
  api.ui.innerHTML='<div class="timer"><span>Focus <b id="fo">0%</b></span><span>Time left <b id="tl">'+(DUR/1000)+'s</b></span></div>';
  const tone=()=>{if(muted||!s.sound)return;try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();const t=actx.currentTime;[[220,.18],[330,.08],[440,.05]].forEach(([f,g])=>{const o=actx.createOscillator(),v=actx.createGain();o.type='sine';o.frequency.value=f;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+.02);v.gain.exponentialRampToValueAtTime(.0001,t+4.5);o.connect(v).connect(actx.destination);o.start(t);o.stop(t+4.6)})}catch(e){}};
  if(s.sound)$('mu').onclick=()=>{muted=!muted;$('mu').textContent='Sound: '+(muted?'off':'on')};
  const spawn=()=>{const d=document.createElement('button');d.className='dis';d.type='button';d.textContent=s.distractions[Math.floor(Math.random()*s.distractions.length)];const sp=[[.04,.2],[.6,.2],[.62,.5],[.04,.48]][Math.floor(Math.random()*4)];d.style.left=(sp[0]*100)+'%';d.style.top=(sp[1]*100)+'%';d.onclick=()=>{ms=Math.max(0,ms-2000);d.textContent='Pulled away!';d.disabled=true;setTimeout(()=>d.remove(),600)};R.layer.appendChild(d);setTimeout(()=>d.remove(),3200)};
  const tick=t=>{if(ended)return;const dt=t-lt;lt=t;el+=dt;if(held)ms+=dt;const f=Math.min(1,ms/DUR);$('rf').style.strokeDashoffset=C*(1-f);$('fo').textContent=Math.round(f*100)+'%';$('tl').textContent=Math.max(0,Math.ceil((DUR-el)/1000))+'s';
   $('pp').innerHTML=tx(s.prompts[Math.min(s.prompts.length-1,Math.floor(el/(DUR/s.prompts.length)))]);dt0+=dt;if(dt0>3800&&s.distractions){dt0=0;spawn()}
   if(s.sound){bt+=dt;if(bt>6000&&held){bt=0;tone()}}
   if(el>=DUR){ended=true;R.layer.querySelectorAll('.dis').forEach(d=>d.remove());$('se').hidden=false;let n=s.settle||10;$('cd').textContent=n;const iv=setInterval(()=>{n--;$('cd').textContent=n;if(n<=0){clearInterval(iv);$('se').hidden=true;api.done({score:f,title:Math.round(f*100)+'% focus',lines:[s.after||'The mind has come to a standstill.']})}},1000);onLeave(()=>clearInterval(iv));return}
   raf=requestAnimationFrame(tick)};
  holdable($('ob'),()=>{if(ended)return;held=true;if(!run){run=true;lt=performance.now();R.coach('Keep holding…');tone();raf=requestAnimationFrame(tick)}else R.coach('Keep holding…')},()=>{held=false;if(run&&!ended)R.coach('Press and hold to come back','warn')});
  onLeave(()=>{ended=true;cancelAnimationFrame(raf)});
 },
 /* ----- still: hold without moving ----- */
 still(s,api){
  const R=room(api,scene('plain'));const NEED=(s.seconds||6)*1000;
  R.layer.innerHTML='<button class="obj" id="ob" style="top:52%" aria-label="Hold still on the lotus"><svg class="ring" viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="none" stroke="rgba(15,92,94,.15)" stroke-width="10"/><circle id="rf" cx="120" cy="120" r="112" fill="none" stroke="#0f5c5e" stroke-width="10" stroke-linecap="round" stroke-dasharray="703.7" stroke-dashoffset="703.7"/></svg><svg class="art" viewBox="0 0 120 120">'+DRAW.lotusArt+'</svg></button>';
  R.coach('Press and hold. Stay still.');
  const o=$('ob');let h=false,ms=0,lt=0,raf=0,x0=0,y0=0,resets=0,fin=false;
  const tick=t=>{if(fin)return;const dt=t-lt;lt=t;if(h)ms+=dt;$('rf').style.strokeDashoffset=703.7*(1-Math.min(1,ms/NEED));if(ms>=NEED){fin=true;o.disabled=true;R.coach('Steady. The mind becomes steady too.','good');api.done({score:Math.max(.2,1-resets*.2),lines:['Moved '+resets+' times.']});return}raf=requestAnimationFrame(tick)};
  o.addEventListener('pointerdown',e=>{e.preventDefault();o.setPointerCapture&&o.setPointerCapture(e.pointerId);h=true;x0=e.clientX;y0=e.clientY;R.coach('Steady…');if(!raf){lt=performance.now();raf=requestAnimationFrame(tick)}});
  o.addEventListener('pointermove',e=>{if(h&&Math.hypot(e.clientX-x0,e.clientY-y0)>10){ms=0;resets++;x0=e.clientX;y0=e.clientY;R.coach('You moved. Start again, gently.','warn')}});
  const up=()=>{if(h&&!fin){h=false;ms=0;R.coach('Hold again, and stay still.','warn')}};o.addEventListener('pointerup',up);o.addEventListener('pointercancel',up);o.addEventListener('contextmenu',e=>e.preventDefault());
  o.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){h=true;if(!raf){lt=performance.now();raf=requestAnimationFrame(tick)}}});o.addEventListener('keyup',up);
  onLeave(()=>{fin=true;cancelAnimationFrame(raf)});
 },
 /* ----- release: tap each item to let it go ----- */
 release(s,api){
  const night=s.scene==='night';const R=room(api,night?scene('night',{bg:'#1d5257'}):scene(s.scene||'plain'));
  const pos=[[.03,.17],[.52,.17],[.03,.31],[.52,.31],[.03,.45],[.52,.45]];
  R.layer.innerHTML=(s.dots?'<div class="dots" id="dots">'+Array.from({length:14},()=>'<i style="left:'+(10+Math.random()*80)+'%;top:'+(18+Math.random()*55)+'%"></i>').join('')+'</div>':'')+s.items.map((it,i)=>'<button class="item" data-i="'+i+'" style="left:'+(pos[i][0]*100)+'%;top:'+(pos[i][1]*100)+'%">'+(it.icon?ICON[it.icon]:'')+'<span>'+tx(it.t)+'</span></button>').join('');
  R.coach(s.start);let left=s.items.length;const shades=['#1d5257','#1a4b50','#17444a','#143e44','#12383e','#0f3238','#0b2c32'];
  R.layer.querySelectorAll('.item').forEach(b=>b.onclick=()=>{const it=s.items[+b.dataset.i];b.disabled=true;left--;
   if(it.label){b.innerHTML='<span><b>'+tx(it.label)+'</b></span>';setTimeout(()=>b.classList.add('gone'),700)}else b.classList.add('gone');
   if(night)R.bg.querySelector('rect').setAttribute('fill',shades[s.items.length-left]||'#0b2c32');
   if(s.dots){const k=(s.items.length-left)/s.items.length;R.layer.querySelectorAll('.dots i').forEach(x=>{x.style.left=(50+(parseFloat(x.style.left)-50)*(1-k*.85))+'%';x.style.top=(48+(parseFloat(x.style.top)-48)*(1-k*.85))+'%'})}
   R.coach(it.note||(left?left+' left.':s.end),left?'':'good');
   if(!left)setTimeout(()=>{R.coach(s.end,'good');api.done({score:1,title:s.doneTitle})},1100)});
 },
 /* ----- reveal: tap each cloud to peek at what it is ----- */
 reveal(s,api){
  const R=room(api,scene('night',{bg:'#0f3238'}));const pos=[[.03,.17],[.53,.17],[.28,.36],[.03,.55],[.53,.55]];
  R.layer.innerHTML=s.items.map((d,i)=>'<button class="dream" data-i="'+i+'" style="left:'+(pos[i][0]*100)+'%;top:'+(pos[i][1]*100)+'%">'+tx(d.t)+'</button>').join('');
  R.coach(s.start);const seen=new Set();
  R.layer.querySelectorAll('.dream').forEach(b=>b.onclick=()=>{const d=s.items[+b.dataset.i];seen.add(b.dataset.i);b.classList.add('peek');b.innerHTML='<b>'+tx(d.label)+'</b>'+tx(d.note);
   R.coach(seen.size<s.items.length?(s.items.length-seen.size)+' more to peek at.':s.end,seen.size<s.items.length?'':'good');
   if(seen.size===s.items.length&&!s._q){s._q=1;const O=shuffle(s.question.options);
    api.ui.innerHTML='<div class="card"><div class="body"><p class="q" style="font-size:19px;font-weight:700">'+tx(s.question.q)+'</p>'+O.map(o=>'<button class="opt" data-ok="'+(o[1]?1:0)+'">'+tx(o[0])+'</button>').join('')+'<div id="rq"></div></div></div>';
    api.ui.scrollIntoView({behavior:'smooth',block:'nearest'});
    api.ui.querySelectorAll('.opt').forEach(x=>x.onclick=()=>{const ok=x.dataset.ok==='1';api.ui.querySelectorAll('.opt').forEach(y=>{y.disabled=true;if(y.dataset.ok==='1')y.classList.add('right')});if(!ok)x.classList.add('wrong');
     $('rq').innerHTML='<div class="row"><span></span><button id="sweep">'+tx(s.sweep||'Brush them away')+'</button></div>';
     $('sweep').onclick=()=>{$('sweep').disabled=true;R.layer.querySelectorAll('.dream').forEach((d,i)=>setTimeout(()=>d.classList.add('swept'),i*150));R.coach(s.swept||'Swept away.','good');setTimeout(()=>{$('rq').innerHTML='';api.done({score:ok?1:.5,title:ok?'Wise!':'Not quite',lines:s.question.why})},900)}})}
  });
  onLeave(()=>{s._q=0});
 },
 /* ----- timed: tap the button before the bar runs out ----- */
 timed(s,api){
  const R=room(api,scene('lake'));let k=0,got=0;
  const one=()=>{if(k>=s.items.length){api.done({score:got/s.items.length,lines:['Caught '+got+' of '+s.items.length+'.']});return}
   R.layer.innerHTML='<div class="dd reveal"><small>'+(k+1)+' of '+s.items.length+'</small>'+tx(s.items[k])+'</div>';R.coach(s.warn||'The mind is galloping…','warn');
   api.ui.innerHTML='<div class="card"><div class="body"><div class="timebar"><i id="tb"></i></div><button class="wake" id="wk">'+tx(s.button)+'</button></div></div>';
   const a=$('tb').animate([{width:'100%'},{width:'0%'}],{duration:(s.seconds||4.5)*1000,fill:'forwards'});let hit=false;
   $('wk').onclick=()=>{if(hit)return;hit=true;a.pause();got++;burst($('wk'));R.coach(s.good||'Awake!','good');$('wk').disabled=true;setTimeout(()=>{k++;one()},1300)};
   a.onfinish=()=>{if(hit)return;hit=true;$('wk').disabled=true;R.coach(s.miss||'That one carried you away.','warn');setTimeout(()=>{k++;one()},1500)};
   onLeave(()=>a.cancel())};
  one();
 },
 /* ----- tapfast: light all cells before time runs out ----- */
 tapfast(s,api){
  const R=room(api,scene('plain'),'short');const N=s.cells||24;
  R.layer.innerHTML='<div class="cells">'+Array.from({length:N},()=>'<i></i>').join('')+'</div>';R.coach('Ready? Tap to begin.');
  api.ui.innerHTML='<div class="card"><div class="body"><div class="timebar"><i id="tb"></i></div><button class="wake" id="vt">'+tx(s.button||'Tap! Tap! Tap!')+'</button></div></div>';
  let lit=0,go=false,end=false,an;const fin=()=>{if(end)return;end=true;$('vt').disabled=true;an&&an.pause();api.done({score:lit/N,lines:[lit+' of '+N+' cells united.']})};
  $('vt').onclick=()=>{if(end)return;if(!go){go=true;R.coach('Faster!','warn');an=$('tb').animate([{width:'100%'},{width:'0%'}],{duration:(s.seconds||8)*1000,fill:'forwards'});an.onfinish=fin}
   const cs=R.layer.querySelectorAll('.cells i');if(lit<N){cs[lit].className='on';lit++}if(lit>=N){R.coach('Every cell united!','good');fin()}};
  onLeave(()=>an&&an.cancel());
 },
 /* ----- pickn: choose the N helpful ones ----- */
 pickn(s,api){
  const O=shuffle(s.options);let n=0,good=0;
  api.st.innerHTML='<div class="card"><div class="body"><p class="q">'+tx(s.q)+'</p><div class="memgrid">'+O.map(o=>'<button class="opt" data-ok="'+(o[1]?1:0)+'">'+tx(o[0])+'</button>').join('')+'</div><div id="pk"></div></div></div>';
  api.st.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{if(n>=s.n)return;b.disabled=true;n++;const ok=b.dataset.ok==='1';if(ok)good++;b.classList.add(ok?'right':'wrong');
   if(n===s.n){api.st.querySelectorAll('.opt').forEach(x=>x.disabled=true);$('pk').innerHTML='<div class="mini" style="height:200px;margin-top:12px"><div class="relive" style="width:170px;height:170px"><span>'+tx(s.relive||'Sit and be with it…')+'</span></div></div>';setTimeout(()=>api.done({score:good/s.n,lines:[good+' of '+s.n+' helpful memories chosen.']}),2800)}});
 },
 /* ----- find: spot hidden lotus buds ----- */
 find(s,api){
  const R=room(api,scene('lake'));const spots=shuffle([[.12,.24],[.78,.62],[.46,.18],[.88,.34],[.3,.66],[.6,.4]]).slice(0,s.n||4);
  R.layer.innerHTML=spots.map(p=>'<button class="bud" style="left:'+(p[0]*100)+'%;top:'+(p[1]*100)+'%" aria-label="Lotus bud"><svg viewBox="0 0 20 24"><path d="M10 2 C4 10 5 18 10 20 C15 18 16 10 10 2Z" fill="#e889a5"/></svg></button>').join('');
  let n=0;const t0=performance.now();R.coach('0 of '+spots.length+' found.');
  R.layer.querySelectorAll('.bud').forEach(b=>b.onclick=()=>{b.classList.add('found');b.disabled=true;n++;R.coach(n+' of '+spots.length+' found.',n===spots.length?'good':'');if(n===spots.length){const sec=(performance.now()-t0)/1000;api.done({score:sec<15?1:sec<30?.8:.6,lines:['Found all in '+Math.round(sec)+' seconds.']})}});
 },
 /* ----- days: choose how to practise each day; a lotus grows or withers ----- */
 days(s,api){
  let d=0,root=0,streak=0,best=0,honor=0,practised=0,gaps=0;const log=[];
  api.st.innerHTML='<div class="meters"><div><span>'+ICON.sun.replace('<svg','<svg width="20" height="20"')+'Long time</span><div class="mt"><i id="m1"></i></div><small id="t1"></small></div><div><span>'+ICON.drop.replace('<svg','<svg width="20" height="20"')+'No gap</span><div class="mt"><i id="m2"></i></div><small id="t2"></small></div><div><span>'+ICON.heart.replace('<svg','<svg width="20" height="20"')+'Honor</span><div class="mt"><i id="m3"></i></div><small id="t3"></small></div></div><div id="rm"></div>';
  const R=room({st:$('rm')},'');
  const draw=()=>{const g=Math.min(1,root/18),stem=20+g*40,rl=10+g*50,b=168;
   R.bg.innerHTML='<rect width="320" height="220" fill="#ffe3bd"/>'+U('sun',246,40,60,60)+'<rect x="0" y="118" width="320" height="102" fill="#0f5c5e"/><rect x="0" y="118" width="320" height="3" fill="#5fa9a3"/><rect x="0" y="'+b+'" width="320" height="52" fill="#3c2a1e" opacity=".55"/>'+
   '<g stroke="#e9c79f" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M160 '+b+' C156 '+(b+rl*.3)+' 146 '+(b+rl*.5)+' 136 '+(b+rl*.6)+'"/><path d="M160 '+b+' L160 '+(b+rl*.65)+'"/><path d="M160 '+b+' C164 '+(b+rl*.3)+' 176 '+(b+rl*.5)+' 186 '+(b+rl*.6)+'"/></g><path d="M160 '+b+' L160 '+(b-stem)+'" stroke="#3f9b6b" stroke-width="4"/>'+
   (root>=4?'<ellipse cx="134" cy="150" rx="26" ry="6" fill="#3f9b6b"/><ellipse cx="188" cy="160" rx="22" ry="5" fill="#56b07f"/>':'')+(root>=16?U('lotus',124,b-stem-40,72,48):root>=10?'<path d="M160 '+(b-stem-26)+' C150 '+(b-stem-10)+' 152 '+(b-stem)+' 160 '+(b-stem)+' C168 '+(b-stem)+' 170 '+(b-stem-10)+' 160 '+(b-stem-26)+'Z" fill="#e889a5"/>':'')+
   U('seekerSit',18,72,76,72)+'<text x="296" y="212" text-anchor="end" font-family="Mukta" font-weight="700" font-size="11" fill="#e9c79f">roots</text>';
   $('m1').style.width=(practised/s.days.length*100)+'%';$('t1').textContent=practised+' of '+s.days.length+' days';$('m2').style.width=(Math.min(s.days.length,streak)/s.days.length*100)+'%';$('t2').textContent=streak+' in a row';$('m3').style.width=(practised?honor/practised*100:0)+'%';$('t3').textContent=honor+' with honor'};
  const show=()=>{const day=s.days[d];draw();R.coach(d?'Roots: '+(root>=16?'firm and deep':root>=8?'growing':'just starting'):'A small lotus seed waits in the pond.');
   api.ui.innerHTML='<div class="card"><div class="body"><p class="clue">Day '+(d+1)+' of '+s.days.length+'</p><p class="q">'+tx(day.s)+'</p>'+day.o.map(o=>'<button class="opt" data-k="'+o[0]+'">'+tx(o[1])+'</button>').join('')+'<div id="df"></div></div></div>';
   api.ui.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{const k=b.dataset.k;api.ui.querySelectorAll('.opt').forEach(x=>x.disabled=true);b.classList.add(k==='h'?'right':'wrong');
    if(k==='h'){root+=2;streak++;honor++;practised++;api.addPts(2)}else if(k==='g'){root+=.5;streak++;practised++}else{root=Math.max(0,root-2);streak=0;gaps++}best=Math.max(best,streak);log.push(k);draw();
    const f=s.effects[k];R.coach(f.v,k==='h'?'good':'warn');
    openSheet('<div class="fbk'+(k==='h'?'':' no')+'"><div class="v">'+tx(f.v)+'</div><ul class="lines">'+lis(f.l)+'</ul></div><div class="row"><span></span><button id="dn">'+(d===s.days.length-1?'After '+s.days.length+' days…':'Next day')+'</button></div>');
    $('dn').focus({preventScroll:true});
    $('dn').onclick=()=>{closeSheet();d++;if(d<s.days.length){show()}else{api.ui.innerHTML='';const nm={h:'with honor',g:'grumbling',x:'skipped'};api.done({score:gaps?Math.max(0,honor/s.days.length-.2*gaps):honor/s.days.length,title:honor+' of '+s.days.length+' days with honor',lines:['Gaps: '+gaps+'. Longest run without a gap: '+best+' days.','Day by day: '+log.map((k,i)=>(i+1)+' '+nm[k]).join(', ')+'.']})}}})};
  show();
 }
};

/* ---------- result ---------- */
function result(){
 leave();const n=results.length,avg=n?results.reduce((a,r)=>a+r.score,0)/L.steps.length:0;const b=L.badge,won=!mode.lost&&avg>=(b.need==null?.8:b.need);
 const done=store.get('done',{});const prev=done[L.id]||{};done[L.id]={badge:won?b.name:(prev.badge||''),best:Math.max(prev.best||0,Math.round(avg*100))};store.set('done',done);
 const sc=L.resultScene?scene(L.resultScene,{h:220,clear:!mode.lost,n:5,colors:L.mode&&L.mode.collect?L.mode.collect.gems.map(g=>g.c):[]}):'';
 app().innerHTML='<section class="card res">'+(sc?'<svg class="scene" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+sc+'</svg>':'')+'<div class="body">'+yogi('[[sutra|'+sutTag(L)+']]',mode.lost?(L.lostLabel||'Try again'):(L.doneLabel||'Lesson complete'))+
 '<div class="row" style="margin-top:0;align-items:flex-end"><div><div class="big">'+Math.round(avg*100)+'%</div><div style="color:var(--soft)">'+tx(L.scoreLabel||'lesson score')+'</div></div><button class="ghost" id="ag">Play again</button></div>'+
 '<div class="badge">'+ICON.lotus.replace('<svg','<svg width="64" height="64"')+'<div><b>'+(won?'Badge earned: ':'Almost there: ')+tx(b.name)+'</b><br><span style="color:var(--soft);font-size:16px">'+tx(won?b.text:b.miss)+'</span></div></div>'+
 '<div class="scores">'+results.map(r=>'<span><b>'+Math.round(r.score*100)+'%</b> '+tx(r.s.title)+'</span>').join('')+'</div><ul class="lines">'+lis(L.endLines)+'</ul><div class="row"><span></span><button id="hm">All lessons</button></div></div></section>';
 $('ag').onclick=()=>startLesson(L.id);$('hm').onclick=()=>{location.hash=''};window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- pop-ups: hover, focus or tap (guideline 17) ---------- */
function tips(){const tb=$('tipBox');let cur=null;
 const show=el=>{cur=el;tb.textContent=el.dataset.tip;tb.classList.add('on');const r=el.getBoundingClientRect(),w=tb.offsetWidth,h=tb.offsetHeight;let x=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8),y=r.top-h-8;if(y<8)y=r.bottom+8;tb.style.left=x+'px';tb.style.top=y+'px'};
 const hide=()=>{cur=null;tb.classList.remove('on')};
 document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('.tip');if(t)show(t)});
 document.addEventListener('mouseout',e=>{const t=e.target.closest&&e.target.closest('.tip');if(t&&!t.contains(e.relatedTarget))hide()});
 document.addEventListener('focusin',e=>{if(e.target.classList&&e.target.classList.contains('tip'))show(e.target)});
 document.addEventListener('focusout',e=>{if(e.target.classList&&e.target.classList.contains('tip'))hide()});
 document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('.tip');if(t){e.stopPropagation();e.preventDefault();cur===t&&tb.classList.contains('on')?hide():show(t)}else hide()},true);
 addEventListener('scroll',hide,{passive:true});
}

/* ---------- routing ---------- */
function route(){const h=location.hash.slice(1);if(h.startsWith('lesson-'))startLesson(h.slice(7));else{if(!av){avatarScreen(()=>{location.hash='';home()});return}home()}}
return {start(){showPts();castDefs();tips();$('homeB').onclick=()=>{location.hash=''};addEventListener('hashchange',route);route()},tx,scene,U,DRAW,ICON};
})();
