const D = window.BOLAO;
const LS_RES = 'bolao_copa_2026_results';
const LS_DEFS = 'bolao_copa_2026_defs';
const LS_THEME = 'bolao_copa_2026_theme';
const LS_TIMES = 'bolao_copa_2026_times';
let results = loadResults();
let defs = loadDefs();
let apiTimes = loadTimes();
let view = 'rank';
let chart = null;

/* ---------- Tema ---------- */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  try{ localStorage.setItem(LS_THEME, t); }catch(e){}
  document.querySelectorAll('.themebtn').forEach(function(b){
    b.classList.toggle('active', b.dataset.theme===t);
  });
}
(function initTheme(){
  let t='light';
  try{ t=localStorage.getItem(LS_THEME)||'light'; }catch(e){}
  applyTheme(t);
})();
document.querySelectorAll('.themebtn').forEach(function(b){
  b.addEventListener('click', function(){ applyTheme(b.dataset.theme); });
});

/* ---------- Persistencia ---------- */
function loadResults(){
  try{ const r=JSON.parse(localStorage.getItem(LS_RES)); if(Array.isArray(r)&&r.length===D.games.length) return r; }catch(e){}
  return D.games.map(function(){return [null,null];});
}
function saveResults(){ localStorage.setItem(LS_RES, JSON.stringify(results)); }
function loadDefs(){
  try{ const d=JSON.parse(localStorage.getItem(LS_DEFS)); if(d) return d; }catch(e){}
  return {champ:'', art:''};
}
function saveDefs(){ localStorage.setItem(LS_DEFS, JSON.stringify(defs)); }
function loadTimes(){ try{ const t=JSON.parse(localStorage.getItem(LS_TIMES)); if(t&&typeof t==='object') return t; }catch(e){} return {}; }
function saveTimes(){ try{ localStorage.setItem(LS_TIMES, JSON.stringify(apiTimes)); }catch(e){} }
function parseTs(ts){ if(!ts) return null; const d=new Date(ts.replace(' ','T')+(/[zZ]|[+\-]\d\d:?\d\d$/.test(ts)?'':'Z')); return isNaN(d)?null:d; }
function fmtTZ(d,tz){ return d.toLocaleString('pt-BR',{timeZone:tz,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function fmtWhen(i,g){
  const d=parseTs(apiTimes[i]);
  if(d) return 'BRT '+fmtTZ(d,'America/Sao_Paulo')+' &middot; UTC '+fmtTZ(d,'UTC');
  const dd=new Date(g.data);
  return isNaN(dd)?'' : dd.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' (previsto)';
}

/* ---------- Util ---------- */
function norm(s){ if(!s) return ''; return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,''); }
function dedup(s){ return s.replace(/(.)\1+/g,'$1'); }
function nameMatch(a,b){ a=norm(a); b=norm(b); if(!a||!b) return false;
  if(a===b||a.indexOf(b)>=0||b.indexOf(a)>=0) return true;
  const A=dedup(a),B=dedup(b); return A===B||A.indexOf(B)>=0||B.indexOf(A)>=0; }

function scoreFor(real, pick){
  const ra=real[0], rb=real[1], pa=pick[0], pb=pick[1];
  if(ra==null||rb==null||pa==null||pb==null||pa===''||pb==='') return null;
  if(Number(pa)===Number(ra)&&Number(pb)===Number(rb)) return 10;
  const s=function(x,y){return Math.sign(Number(x)-Number(y));};
  if(s(ra,rb)===s(pa,pb)) return 5;
  return 0;
}

/* ---------- Classificacao ---------- */
function calc(filterFn, withBonus){
  return D.participants.map(function(p){
    let total=0,exatos=0,acertos=0,jogados=0;
    D.games.forEach(function(g,i){
      if(filterFn && !filterFn(i)) return;
      const sc=scoreFor(results[i], p.picks[i]);
      if(sc!=null){jogados++; total+=sc; if(sc===10)exatos++; else if(sc===5)acertos++;}
    });
    let champOK=false, artOK=false;
    if(withBonus){
      if(defs.champ && norm(defs.champ)===norm(p.campeao)){ champOK=true; total+=10; }
      if(defs.art && nameMatch(defs.art, p.artilheiro)){ artOK=true; total+=10; }
    }
    return {nick:p.name,campeao:p.campeao,artilheiro:p.artilheiro,total:total,exatos:exatos,acertos:acertos,jogados:jogados,champOK:champOK,artOK:artOK};
  }).sort(function(a,b){
    return b.total-a.total || b.exatos-a.exatos || (b.champOK-a.champOK) || (b.artOK-a.artOK) || a.nick.localeCompare(b.nick);
  });
}

function renderRank(){
  const st=calc(null, true);
  document.getElementById('rankList').innerHTML = st.map(function(s,i){
    const pos=i+1;
    const champTg='<span class="tg '+(s.champOK?'ok':'')+'">Campeao: '+s.campeao+'</span>';
    const artTg='<span class="tg '+(s.artOK?'ok':'')+'">Artilheiro: '+s.artilheiro+'</span>';
    return '<div class="rrow">'
      + '<div class="pos p'+pos+'">'+pos+'o</div>'
      + '<div><div class="pname">'+s.nick+'</div>'
      + '<div class="pmeta">'+s.exatos+' cravadas - '+s.acertos+' no resultado - '+s.jogados+' jogos</div>'
      + '<div class="tags">'+champTg+artTg+'</div></div>'
      + '<div class="pts">'+s.total+'<span>pontos</span></div>'
      + '</div>';
  }).join('');
}

/* ---------- Grafico ---------- */
const PALETTE=['#e7607b','#3b82f6','#1e9e5a','#f97316','#a78bfa','#22d3ee','#eab308','#84cc16','#ef4444','#64748b'];
function renderChart(){
  if(typeof Chart==='undefined') return;
  const playedRounds=[];
  for(let r=1;r<=3;r++){
    const any=D.games.some(function(g,i){ return g.rodada===r && results[i][0]!=null && results[i][1]!=null; });
    if(any) playedRounds.push(r);
  }
  const card=document.querySelector('.chartcard');
  if(playedRounds.length===0){
    card.querySelector('.sub').textContent='O grafico aparece assim que os primeiros resultados forem registrados.';
    if(chart){chart.destroy();chart=null;}
    return;
  }
  card.querySelector('.sub').textContent='Posicao de cada participante ao fim de cada rodada (so pontos de jogos).';
  const n=D.participants.length;
  const labels=['Inicio'].concat(playedRounds.map(function(r){return 'Rodada '+r;}));
  const series={};
  D.participants.forEach(function(p){ series[p.name]=[(n+1)/2]; });
  playedRounds.forEach(function(r){
    const st=calc(function(i){ return D.games[i].rodada<=r && results[i][0]!=null && results[i][1]!=null; }, false);
    st.forEach(function(s,idx){ series[s.nick].push(idx+1); });
  });
  const datasets=D.participants.map(function(p,idx){
    return {label:p.name, data:series[p.name], borderColor:PALETTE[idx%PALETTE.length],
      backgroundColor:PALETTE[idx%PALETTE.length], borderWidth:2.5, tension:.25, pointRadius:4, pointHoverRadius:6};
  });
  if(chart) chart.destroy();
  chart=new Chart(document.getElementById('moveChart'),{
    type:'line', data:{labels:labels,datasets:datasets},
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'nearest',intersect:false},
      scales:{ y:{reverse:true,min:1,max:n,ticks:{stepSize:1,callback:function(v){return v+'o';}},title:{display:true,text:'Posicao'}}, x:{} },
      plugins:{ legend:{position:'bottom',labels:{boxWidth:14,padding:10,font:{size:12}}},
        tooltip:{callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.y+'o';}}} } }
  });
}

/* ---------- Jogos ---------- */
function gameState(i){ const r=results[i]; return (r[0]!=null&&r[1]!=null)?'played':'pending'; }
function renderGames(){
  const grp=document.getElementById('filterGroup').value;
  const stt=document.getElementById('filterState').value;
  let html='';
  D.games.forEach(function(g,i){
    if(grp && g.grupo!==grp) return;
    const state=gameState(i);
    if(stt==='played'&&state!=='played') return;
    if(stt==='pending'&&state!=='pending') return;
    const dstr=fmtWhen(i,g);
    const r=results[i];
    const sa=r[0]!=null?r[0]:'-', sb=r[1]!=null?r[1]:'-';
    const picksHtml=D.participants.map(function(p){
      const pk=p.picks[i];
      if(pk[0]==null||pk[1]==null) return '';
      const sc=scoreFor(r,pk);
      const cls=sc===10?'g10':sc===5?'g5':sc===0?'g0':'';
      const tag=sc!=null?'<span class="badge" style="background:'+(sc===10?'var(--green)':sc===5?'var(--yellow)':'var(--red)')+';color:#fff">+'+sc+'</span>':'';
      return '<div class="pchip '+cls+'"><span class="nm">'+p.name+'</span><span class="sc">'+pk[0]+'-'+pk[1]+tag+'</span></div>';
    }).join('');
    html+='<div class="game">'
      + '<div class="ghead"><span class="gtag">Grupo '+g.grupo+' - '+g.rodada+'a rodada</span><span>'+dstr+'</span>'
      + '<span class="badge" style="background:var(--card2);color:var(--muted)">'+(state==='played'?'ENCERRADO':'A JOGAR')+'</span></div>'
      + '<div class="gmain"><div class="team a">'+g.a+'</div>'
      + '<div class="score"><div class="scorebox '+(r[0]==null?'empty':'')+'">'+sa+'</div>'
      + '<span class="vs">x</span><div class="scorebox '+(r[1]==null?'empty':'')+'">'+sb+'</div></div>'
      + '<div class="team b">'+g.b+'</div></div>'
      + '<div class="picks"><h4>Palpites da galera</h4>'
      + '<div class="pgrid">'+(picksHtml||'<div class="empty">Sem palpites.</div>')+'</div></div></div>';
  });
  const el=document.getElementById('gamesList');
  el.innerHTML=html||'<div class="empty" style="text-align:center;padding:30px">Nenhum jogo com esse filtro.</div>';
}

function render(){ renderRank(); renderChart(); if(view==='games') renderGames(); }

/* ---------- Abas ---------- */
document.querySelectorAll('.tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active'); view=t.dataset.view;
    document.getElementById('viewRank').style.display = view==='rank'?'':'none';
    document.getElementById('viewGames').style.display = view==='games'?'':'none';
    document.getElementById('viewRules').style.display = view==='rules'?'':'none';
    render();
  });
});

/* ---------- Filtros ---------- */
Array.from(new Set(D.games.map(function(g){return g.grupo;}))).sort().forEach(function(gr){
  const o=document.createElement('option');o.value=gr;o.textContent='Grupo '+gr;
  document.getElementById('filterGroup').appendChild(o);
});
document.getElementById('filterGroup').addEventListener('change',renderGames);
document.getElementById('filterState').addEventListener('change',renderGames);

/* ---------- Painel organizador ---------- */
(function initDefs(){
  const sel=document.getElementById('champSel');
  (D.teams||[]).forEach(function(t){ const o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o); });
  sel.value=defs.champ||'';
  document.getElementById('artInput').value=defs.art||'';
})();
document.getElementById('saveDefs').addEventListener('click',function(){
  defs.champ=document.getElementById('champSel').value;
  defs.art=document.getElementById('artInput').value.trim();
  saveDefs(); render();
  setStatus('Definicoes salvas.');
});

/* ---------- API ---------- */
function setStatus(msg){ document.getElementById('status').textContent=msg; }
const alias={turkiye:'turkey',korearepublic:'southkorea',republicofkorea:'southkorea',czechia:'czechrepublic',
  unitedstates:'usa',unitedstatesofamerica:'usa',congodr:'drcongo',democraticrepublicofcongo:'drcongo',
  capeverdeislands:'capeverde',cotedivoire:'ivorycoast'};
function canon(nm){ nm=norm(nm); return alias[nm]||nm; }
const enIndex={};
D.games.forEach(function(g,i){ enIndex[canon(g.enA)+'|'+canon(g.enB)]=i; enIndex[canon(g.enB)+'|'+canon(g.enA)]=i; });

/* ---------- Resultados manuais (entram so quando a API nao traz; API tem prioridade) ---------- */
/* Formato: [TimeCasa(EN), TimeFora(EN), golsCasa, golsFora] */
const MANUAL_RAW=[
  ['Australia','Turkey',2,0],
  ['Netherlands','Japan',2,2]
];
function applyManual(res){
  MANUAL_RAW.forEach(function(m){
    const home=canon(m[0]), away=canon(m[1]);
    let i=enIndex[home+'|'+away]; if(i==null) i=enIndex[away+'|'+home];
    if(i==null) return;
    if(res[i] && res[i][0]!=null && res[i][1]!=null) return;
    const g=D.games[i];
    if(canon(g.enA)===home){ res[i]=[m[2],m[3]]; } else { res[i]=[m[3],m[2]]; }
  });
  return res;
}

function startedMs(ev){ if(!ev.strTimestamp) return Infinity; const t=Date.parse(ev.strTimestamp.replace(' ','T')+(/[zZ]|[+\-]\d\d:?\d\d$/.test(ev.strTimestamp)?'':'Z')); return isNaN(t)?Infinity:t; }
async function fetchEventsClient(){
  const out=[];
  function dr(st,en){const a=[];let d=new Date(st+'T00:00:00Z');const ee=new Date(en+'T00:00:00Z');while(d<=ee){a.push(d.toISOString().slice(0,10).replace(/-/g,''));d.setUTCDate(d.getUTCDate()+1);}return a;}
  function esp(ev){const c=ev.competitions&&ev.competitions[0];if(!c)return null;const cs=c.competitors||[];const h=cs.find(function(x){return x.homeAway==='home';}),a=cs.find(function(x){return x.homeAway==='away';});if(!h||!a)return null;const stt=c.status&&c.status.type&&c.status.type.state;const started=(stt==='in'||stt==='post');return {strHomeTeam:h.team&&(h.team.name||h.team.displayName),strAwayTeam:a.team&&(a.team.name||a.team.displayName),intHomeScore:started?h.score:null,intAwayScore:started?a.score:null,strTimestamp:ev.date};}
  try{
    const dates=dr('2026-06-11','2026-07-20'); const CHUNK=6;
    for(let i=0;i<dates.length;i+=CHUNK){
      const parts=await Promise.all(dates.slice(i,i+CHUNK).map(function(d){
        return fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates='+d,{cache:'no-store'}).then(function(r){return r.ok?r.json():{events:null};}).catch(function(){return {events:null};});
      }));
      parts.forEach(function(p){ (p.events||[]).forEach(function(ev){const c=esp(ev);if(c)out.push(c);}); });
    }
  }catch(e){}
  try{
    const rr=await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsround.php?id=4429&r=1&s=2026',{cache:'no-store'}).then(function(r){return r.json();}).catch(function(){return {events:null};});
    ((rr&&rr.events)||[]).forEach(function(ev){ out.push({strHomeTeam:ev.strHomeTeam,strAwayTeam:ev.strAwayTeam,intHomeScore:ev.intHomeScore,intAwayScore:ev.intAwayScore,strTimestamp:ev.strTimestamp}); });
  }catch(e){}
  return out;
}
async function fetchResults(){
  const btn=document.getElementById('fetchBtn'); btn.disabled=true;
  setStatus('Buscando resultados...');
  let events=null;
  try{ const res=await fetch('/api/results',{cache:'no-store'}); if(res.ok){ const j=await res.json(); if(j&&j.events&&j.events.length) events=j.events; } }catch(e){}
  if(!events){ try{ events=await fetchEventsClient(); }catch(e){} }
  if(!events||!events.length){ setStatus('Nao consegui buscar agora. Tente novamente em instantes.'); btn.disabled=false; return; }
  const fresh=D.games.map(function(){return [null,null];});
  let cnt=0;
  events.forEach(function(ev){
    const home=canon(ev.strHomeTeam), away=canon(ev.strAwayTeam);
    let i=enIndex[home+'|'+away]; if(i==null) i=enIndex[away+'|'+home];
    if(i==null) return;
    if(ev.strTimestamp) apiTimes[i]=ev.strTimestamp;
    const ha=ev.intHomeScore, aw=ev.intAwayScore;
    if(ha==null||aw==null||ha===''||aw==='') return;
    const g=D.games[i];
    if(canon(g.enA)===home){ fresh[i]=[+ha,+aw]; } else { fresh[i]=[+aw,+ha]; }
    cnt++;
  });
  saveTimes(); results=fresh; applyManual(results); saveResults(); render();
  setStatus(cnt+' jogo(s) com resultado - atualizado '+new Date().toLocaleTimeString('pt-BR'));
  btn.disabled=false;
}
document.getElementById('fetchBtn').addEventListener('click',fetchResults);

async function calcArt(){
  const btn=document.getElementById('calcArt'); btn.disabled=true;
  const box=document.getElementById('scorersBox');
  box.textContent='Somando gols de todos os jogos (pode demorar)...';
  try{
    const res=await fetch('/api/scorers',{cache:'no-store'});
    if(!res.ok) throw new Error('sem servidor');
    const j=await res.json();
    const list=(j.scorers||[]).slice(0,8);
    if(list.length===0){ box.textContent='Ainda nao ha gols registrados.'; btn.disabled=false; return; }
    box.innerHTML='<b>Artilharia (parcial, via API):</b>'+list.map(function(s){return '<div>'+s.goals+' gols - '+s.player+'</div>';}).join('');
    document.getElementById('artInput').value=list[0].player;
    setStatus('Lider de gols: '+list[0].player+' ('+list[0].goals+'). Confira e salve as definicoes.');
  }catch(e){
    box.textContent='O calculo automatico precisa do site publicado no Vercel (funcao /api/scorers). Abrindo o arquivo localmente, defina o artilheiro manualmente.';
  }
  btn.disabled=false;
}
document.getElementById('calcArt').addEventListener('click',calcArt);

async function loadSchedule(){
  try{
    const base='https://www.thesportsdb.com/api/v1/json/3';
    const rr=await fetch(base+'/eventsround.php?id=4429&r=1&s=2026',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
    const roster=(rr&&rr.events)||[]; let changed=false;
    roster.forEach(function(ev){
      const home=canon(ev.strHomeTeam), away=canon(ev.strAwayTeam);
      let i=enIndex[home+'|'+away]; if(i==null) i=enIndex[away+'|'+home];
      if(i==null||!ev.strTimestamp) return;
      if(apiTimes[i]!==ev.strTimestamp){ apiTimes[i]=ev.strTimestamp; changed=true; }
    });
    if(changed){ saveTimes(); if(view==='games') renderGames(); }
  }catch(e){}
}

applyManual(results); saveResults();
render();
loadSchedule();
