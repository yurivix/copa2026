const D = window.BOLAO;
const LS_RES = 'bolao_copa_2026_results';
const LS_DEFS = 'bolao_copa_2026_defs';
const LS_THEME = 'bolao_copa_2026_theme';
const LS_TIMES = 'bolao_copa_2026_times';
let results = loadResults();
let defs = loadDefs();
let apiTimes = loadTimes();
const LS_KO='bolao_copa_2026_ko';
let koGames = loadKO();
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
function loadKO(){ try{ const k=JSON.parse(localStorage.getItem(LS_KO)); if(Array.isArray(k)) return k; }catch(e){} return []; }
function saveKO(){ try{ localStorage.setItem(LS_KO, JSON.stringify(koGames)); }catch(e){} }
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
  const koReal = withBonus ? koRealScores() : null;
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
      if(koReal && p.ko){
        Object.keys(p.ko).forEach(function(m){
          const real=koReal[m], pk=p.ko[m];
          if(!real||!pk||pk[0]==null||pk[1]==null||real[0]==null||real[1]==null) return;
          jogados++;
          if(Number(pk[0])===Number(real[0])&&Number(pk[1])===Number(real[1])){ total+=10; exatos++; }
          else if(Math.sign(Number(real[0])-Number(real[1]))===Math.sign(Number(pk[0])-Number(pk[1]))){ total+=5; acertos++; }
        });
      }
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
    const champTg='<span class="tg '+(s.champOK?'ok':'')+'">Campeao: '+flag(s.campeao)+s.campeao+'</span>';
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
function kickoffMs(i){ const d=parseTs(apiTimes[i]); if(d) return d.getTime(); const dd=new Date(D.games[i].data); return isNaN(dd)?0:dd.getTime(); }
function renderChart(){
  if(typeof Chart==='undefined') return;
  const card=document.querySelector('.chartcard');
  const played=[];
  D.games.forEach(function(g,i){ if(results[i][0]!=null && results[i][1]!=null) played.push(i); });
  played.sort(function(a,b){ return kickoffMs(a)-kickoffMs(b); });
  if(played.length===0){
    card.querySelector('.sub').textContent='O grafico aparece assim que os primeiros resultados forem registrados.';
    if(chart){chart.destroy();chart=null;}
    return;
  }
  card.querySelector('.sub').textContent='Posicao de cada participante apos cada jogo encerrado (1o no topo).';
  const n=D.participants.length;
  const labels=['Inicio']; const meta=[''];
  const series={}; D.participants.forEach(function(p){ series[p.name]=[(n+1)/2]; });
  for(let k=1;k<=played.length;k++){
    const setIdx={}; played.slice(0,k).forEach(function(x){ setIdx[x]=true; });
    const st=calc(function(i){ return setIdx[i]===true; }, false);
    st.forEach(function(s,idx){ series[s.nick].push(idx+1); });
    const gi=played[k-1], g=D.games[gi];
    labels.push(String(k));
    meta.push(g.a+' '+results[gi][0]+'x'+results[gi][1]+' '+g.b);
  }
  const datasets=D.participants.map(function(p,idx){
    return {label:p.name, data:series[p.name], borderColor:PALETTE[idx%PALETTE.length],
      backgroundColor:PALETTE[idx%PALETTE.length], borderWidth:2.5, tension:.2, pointRadius:3, pointHoverRadius:6};
  });
  if(chart) chart.destroy();
  chart=new Chart(document.getElementById('moveChart'),{
    type:'line', data:{labels:labels,datasets:datasets},
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'nearest',intersect:false},
      scales:{ y:{reverse:true,min:1,max:n,ticks:{stepSize:1,callback:function(v){return v+'o';}},title:{display:true,text:'Posicao'}},
        x:{title:{display:true,text:'Jogos (na ordem)'},ticks:{autoSkip:true,maxTicksLimit:14}} },
      plugins:{ legend:{position:'bottom',labels:{boxWidth:14,padding:10,font:{size:12}}},
        tooltip:{callbacks:{
          title:function(items){ const di=items[0].dataIndex; return di===0?'Inicio':('Jogo '+labels[di]+(meta[di]?': '+meta[di]:'')); },
          label:function(c){return c.dataset.label+': '+c.parsed.y+'o';} }} } }
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
      + '<div class="gmain"><div class="team a">'+flag(g.a)+g.a+'</div>'
      + '<div class="score"><div class="scorebox '+(r[0]==null?'empty':'')+'">'+sa+'</div>'
      + '<span class="vs">x</span><div class="scorebox '+(r[1]==null?'empty':'')+'">'+sb+'</div></div>'
      + '<div class="team b">'+flag(g.b)+g.b+'</div></div>'
      + '<div class="picks"><h4>Palpites da galera</h4>'
      + '<div class="pgrid">'+(picksHtml||'<div class="empty">Sem palpites.</div>')+'</div></div></div>';
  });
  const el=document.getElementById('gamesList');
  el.innerHTML=html||'<div class="empty" style="text-align:center;padding:30px">Nenhum jogo com esse filtro.</div>';
}


/* ---------- Mata-mata (chaveamento) ---------- */
const KO=[
 {r:'32 avos', ms:[
   {m:73,h:'2o A',a:'2o B'},{m:74,h:'1o E',a:'3o A/B/C/D/F'},{m:75,h:'1o F',a:'2o C'},{m:76,h:'1o C',a:'2o F'},
   {m:77,h:'1o I',a:'3o C/D/F/G/H'},{m:78,h:'2o E',a:'2o I'},{m:79,h:'1o A',a:'3o C/E/F/H/I'},{m:80,h:'1o L',a:'3o E/H/I/J/K'},
   {m:81,h:'1o D',a:'3o B/E/F/I/J'},{m:82,h:'1o G',a:'3o A/E/H/I/J'},{m:83,h:'2o K',a:'2o L'},{m:84,h:'1o H',a:'2o J'},
   {m:85,h:'1o B',a:'3o E/F/G/I/J'},{m:86,h:'1o J',a:'2o H'},{m:87,h:'1o K',a:'3o D/E/I/J/L'},{m:88,h:'2o D',a:'2o G'}
 ]},
 {r:'Oitavas', ms:[
   {m:89,h:'V74',a:'V77'},{m:90,h:'V73',a:'V75'},{m:91,h:'V76',a:'V78'},{m:92,h:'V79',a:'V80'},
   {m:93,h:'V83',a:'V84'},{m:94,h:'V81',a:'V82'},{m:95,h:'V86',a:'V88'},{m:96,h:'V85',a:'V87'}
 ]},
 {r:'Quartas', ms:[ {m:97,h:'V89',a:'V90'},{m:98,h:'V93',a:'V94'},{m:99,h:'V91',a:'V92'},{m:100,h:'V95',a:'V96'} ]},
 {r:'Semifinais', ms:[ {m:101,h:'V97',a:'V98'},{m:102,h:'V99',a:'V100'} ]},
 {r:'3o lugar', ms:[ {m:103,h:'Perdedor 101',a:'Perdedor 102'} ]},
 {r:'Final', ms:[ {m:104,h:'V101',a:'V102'} ]}
];
/* Placar de 90 MINUTOS para jogos que foram a prorrogacao/penaltis.
   So preencher quando o placar final (com prorrogacao) for diferente do de 90 min.
   Ex.: KO90={ '101':[1,1] }  (semifinal jogo 101 estava 1x1 nos 90 min) */
const KO90={};
const FLAGCODE={"México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Chéquia": "cz", "Canadá": "ca", "Bósnia e Herzegovina": "ba", "Estados Unidos": "us", "Paraguai": "py", "Austrália": "au", "Turquia": "tr", "Catar": "qa", "Suíça": "ch", "Brasil": "br", "Marrocos": "ma", "Haiti": "ht", "Escócia": "gb-sct", "Alemanha": "de", "Curaçao": "cw", "Holanda": "nl", "Japão": "jp", "Costa do Marfim": "ci", "Equador": "ec", "Suécia": "se", "Tunísia": "tn", "Espanha": "es", "Cabo Verde": "cv", "Bélgica": "be", "Egito": "eg", "Arábia Saudita": "sa", "Uruguai": "uy", "Irã": "ir", "Nova Zelândia": "nz", "França": "fr", "Senegal": "sn", "Iraque": "iq", "Noruega": "no", "Argentina": "ar", "Argélia": "dz", "Áustria": "at", "Jordânia": "jo", "Portugal": "pt", "Congo DR": "cd", "Uzbequistão": "uz", "Colômbia": "co", "Inglaterra": "gb-eng", "Croácia": "hr", "Gana": "gh", "Panamá": "pa"};
let FLAG=null;
function buildFlags(){ FLAG={}; Object.keys(FLAGCODE).forEach(function(pt){ var c=FLAGCODE[pt]; FLAG[canon(pt)]=c; var en=(D.pt2en&&D.pt2en[pt]); if(en) FLAG[canon(en)]=c; }); }
function flag(name){ if(!FLAG) buildFlags(); var c=FLAG[canon(name)]; return c?'<img class="fl" src="https://flagcdn.com/20x15/'+c+'.png" srcset="https://flagcdn.com/40x30/'+c+'.png 2x" width="20" height="15" alt="" loading="lazy"> ':''; }

function koRoundByDate(ms){
  const s=new Date(ms).toISOString().slice(0,10);
  if(s<='2026-06-27') return null;
  if(s<='2026-07-03') return 'r32';
  if(s<='2026-07-07') return 'r16';
  if(s<='2026-07-11') return 'qf';
  if(s<='2026-07-15') return 'sf';
  if(s<='2026-07-18') return 'tp';
  return 'fn';
}
function dedupKo(arr){
  const map={};
  arr.forEach(function(g){
    const key=g.round+'|'+[canon(g.home),canon(g.away)].sort().join('|');
    const prev=map[key];
    const has=(g.sh!=null&&g.sa!=null)||g.advHome||g.advAway;
    const pHas=prev&&((prev.sh!=null&&prev.sa!=null)||prev.advHome||prev.advAway);
    if(!prev||(has&&!pHas)) map[key]=g;
  });
  return Object.keys(map).map(function(k){return map[k];});
}
function collectKO(events){
  const arr=[];
  events.forEach(function(ev){
    if(!ev.strTimestamp||!ev.strHomeTeam||!ev.strAwayTeam) return;
    const d=parseTs(ev.strTimestamp); if(!d) return;
    const rd=koRoundByDate(d.getTime()); if(!rd) return;
    arr.push({round:rd,home:ev.strHomeTeam,away:ev.strAwayTeam,
      sh:(ev.intHomeScore===''||ev.intHomeScore==null)?null:ev.intHomeScore,
      sa:(ev.intAwayScore===''||ev.intAwayScore==null)?null:ev.intAwayScore,
      advHome:!!ev.advHome,advAway:!!ev.advAway});
  });
  if(arr.length){ koGames=dedupKo(koGames.concat(arr)); saveKO(); }
}
function computeStandings(){
  const groups={};
  D.games.forEach(function(g,i){
    const grp=g.grupo; groups[grp]=groups[grp]||{}; const tb=groups[grp];
    tb[g.a]=tb[g.a]||{t:g.a,pts:0,gf:0,ga:0,pl:0};
    tb[g.b]=tb[g.b]||{t:g.b,pts:0,gf:0,ga:0,pl:0};
    const r=results[i]; if(r[0]==null||r[1]==null) return;
    const ha=+r[0],aw=+r[1];
    tb[g.a].gf+=ha;tb[g.a].ga+=aw;tb[g.b].gf+=aw;tb[g.b].ga+=ha;tb[g.a].pl++;tb[g.b].pl++;
    if(ha>aw)tb[g.a].pts+=3; else if(aw>ha)tb[g.b].pts+=3; else {tb[g.a].pts++;tb[g.b].pts++;}
  });
  const out={};
  Object.keys(groups).forEach(function(grp){
    const arr=Object.keys(groups[grp]).map(function(k){return groups[grp][k];});
    arr.sort(function(a,b){return b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.t.localeCompare(b.t);});
    out[grp]={teams:arr,complete:arr.every(function(x){return x.pl>=3;})};
  });
  return out;
}
function koListByRound(){
  const by={r32:[],r16:[],qf:[],sf:[],tp:[],fn:[]};
  koGames.forEach(function(g){ if(by[g.round]) by[g.round].push(g); });
  return by;
}
function koFindTeam(list,team){ const c=canon(team);
  for(var i=0;i<list.length;i++){ if(canon(list[i].home)===c||canon(list[i].away)===c) return list[i]; } return null; }
function koFindPair(list,a,b){ const ca=canon(a),cb=canon(b);
  for(var i=0;i<list.length;i++){ var g=list[i],h=canon(g.home),w=canon(g.away);
    if((h===ca&&w===cb)||(h===cb&&w===ca)) return g; } return null; }
function gameOutcome(g,h,a){
  var dh=g.sh,da=g.sa; if(canon(g.home)===canon(a)){ dh=g.sa; da=g.sh; }
  var winner=null; if(g.advHome) winner=g.home; else if(g.advAway) winner=g.away;
  else if(g.sh!=null&&g.sa!=null){ if(+g.sh>+g.sa) winner=g.home; else if(+g.sa>+g.sh) winner=g.away; }
  var loser=winner?(canon(winner)===canon(g.home)?g.away:g.home):null;
  return {sh:dh,sa:da,winner:winner,loser:loser};
}
function resolveBracket(){
  const st=computeStandings(), kr=koListByRound();
  const rkey={'32 avos':'r32','Oitavas':'r16','Quartas':'qf','Semifinais':'sf','3o lugar':'tp','Final':'fn'};
  const T={},R={};
  function slot(lb){ if(!lb) return null;
    var m=lb.match(/^1o ([A-L])$/); if(m){ var g=st[m[1]]; return g&&g.complete?g.teams[0].t:null; }
    m=lb.match(/^2o ([A-L])$/); if(m){ var g2=st[m[1]]; return g2&&g2.complete?g2.teams[1].t:null; }
    m=lb.match(/^V(\d+)$/); if(m){ var r=R[+m[1]]; return r?r.winner:null; }
    m=lb.match(/^Perdedor (\d+)$/); if(m){ var r2=R[+m[1]]; return r2?r2.loser:null; }
    return null;
  }
  KO.forEach(function(col){
    var rk=rkey[col.r], list=kr[rk]||[];
    col.ms.forEach(function(g){
      var h=slot(g.h), a=slot(g.a), isThird=/^3o /.test(g.a);
      if(h&&!a){ var gm0=koFindTeam(list,h); if(gm0){ a=canon(gm0.home)===canon(h)?gm0.away:gm0.home; } }
      T[g.m]={h:h,a:a};
      if(h&&a){ var gm=koFindPair(list,h,a); if(gm){ R[g.m]=gameOutcome(gm,h,a); } }
    });
  });
  return {T:T,R:R};
}
function koRealScores(){
  const res=resolveBracket(); const out={};
  Object.keys(res.R).forEach(function(m){ const r=res.R[m]; if(r.sh!=null&&r.sa!=null) out[m]=[r.sh,r.sa]; });
  Object.keys(KO90).forEach(function(m){ out[m]=KO90[m]; }); // override 90 min
  return out;
}
function renderKO(){
  const wrap=document.getElementById('koWrap');
  const res=resolveBracket();
  wrap.innerHTML = KO.map(function(col){
    const matches=col.ms.map(function(g){
      const t=res.T[g.m]||{}, r=res.R[g.m]||{};
      const hN=t.h||g.h, aN=t.a||g.a, hR=!!t.h, aR=!!t.a;
      const sh=(r.sh!=null)?r.sh:'-', sa=(r.sa!=null)?r.sa:'-';
      const hW=r.winner&&canon(r.winner)===canon(hN), aW=r.winner&&canon(r.winner)===canon(aN);
      function sl(n,real,sc,win){ return '<div class="ko-slot'+(win?' win':'')+(real?'':' slotref')+'"><span class="nm">'+(real?flag(n):'')+n+'</span><span class="sc">'+sc+'</span></div>'; }
      return '<div class="ko-match"><div class="ko-mhd">Jogo '+g.m+'</div>'+sl(hN,hR,sh,hW)+sl(aN,aR,sa,aW)+'</div>';
    }).join('');
    return '<div class="ko-col"><div class="ko-rtitle">'+col.r+'</div><div class="ko-matches">'+matches+'</div></div>';
  }).join('');
}

/* ---------- Zoom do chaveamento ---------- */
let koZoom=1, koInit=false;
function applyKoZoom(){ const w=document.getElementById('koWrap'); if(w) w.style.zoom=koZoom; const l=document.getElementById('koZoomLbl'); if(l) l.textContent=Math.round(koZoom*100)+'%'; }
function koFit(){ const w=document.getElementById('koWrap'); if(!w) return; w.style.zoom=1; const cw=w.clientWidth, sw=w.scrollWidth; koZoom = sw>cw+2 ? Math.max(0.4, Math.floor((cw/sw)*100)/100) : 1; applyKoZoom(); }
(function initKoZoom(){
  const i=document.getElementById('koZoomIn'), o=document.getElementById('koZoomOut'), fit=document.getElementById('koZoomFit');
  if(i) i.addEventListener('click',function(){ koZoom=Math.min(2.5,Math.round((koZoom+0.1)*10)/10); applyKoZoom(); });
  if(o) o.addEventListener('click',function(){ koZoom=Math.max(0.4,Math.round((koZoom-0.1)*10)/10); applyKoZoom(); });
  if(fit) fit.addEventListener('click',koFit);
})();

function render(){ renderRank(); renderChart(); if(view==='games') renderGames(); if(view==='ko'){ renderKO(); if(!koInit){ koInit=true; if(window.innerWidth<700){ koFit(); } else { applyKoZoom(); } } else { applyKoZoom(); } } }

/* ---------- Abas ---------- */
document.querySelectorAll('.tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active'); view=t.dataset.view;
    document.getElementById('viewRank').style.display = view==='rank'?'':'none';
    document.getElementById('viewGames').style.display = view==='games'?'':'none';
    document.getElementById('viewKO').style.display = view==='ko'?'':'none';
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
  function esp(ev){const c=ev.competitions&&ev.competitions[0];if(!c)return null;const cs=c.competitors||[];const h=cs.find(function(x){return x.homeAway==='home';}),a=cs.find(function(x){return x.homeAway==='away';});if(!h||!a)return null;const stt=c.status&&c.status.type&&c.status.type.state;const started=(stt==='in'||stt==='post');return {strHomeTeam:h.team&&(h.team.name||h.team.displayName),strAwayTeam:a.team&&(a.team.name||a.team.displayName),intHomeScore:started?h.score:null,intAwayScore:started?a.score:null,advHome:!!h.winner,advAway:!!a.winner,strTimestamp:ev.date};}
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
  events.forEach(function(ev){
    const home=canon(ev.strHomeTeam), away=canon(ev.strAwayTeam);
    let i=enIndex[home+'|'+away]; if(i==null) i=enIndex[away+'|'+home];
    if(i==null) return;
    if(ev.strTimestamp) apiTimes[i]=ev.strTimestamp;
    const ha=ev.intHomeScore, aw=ev.intAwayScore;
    if(ha==null||aw==null||ha===''||aw==='') return;
    const g=D.games[i];
    if(canon(g.enA)===home){ fresh[i]=[+ha,+aw]; } else { fresh[i]=[+aw,+ha]; }
  });
  collectKO(events);
  saveTimes(); results=fresh; applyManual(results); saveResults(); render();
  const cnt=results.filter(function(r){return r[0]!=null&&r[1]!=null;}).length;
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
