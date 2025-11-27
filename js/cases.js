// /js/cases.js — HOTFIX: render immediately on entering "cases" route

(function(){
  if (window.__LANDA_CASES__) return; window.__LANDA_CASES__=true;
  const LS_KEY='landa_cases_v13';
  const $=(s,r=document)=>r.querySelector(s);

  function getCases(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return [] } }
  function esc(s){ return (s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }

  function render(){
    const root = document.getElementById('page-cases'); if(!root) return;
    root.innerHTML = `
      <div class="panel" id="casesPro">
        <div class="inline" style="gap:8px;justify-content:space-between;flex-wrap:wrap">
          <h2 style="margin:0">All Cases</h2>
          <div class="inline" style="gap:8px;flex-wrap:wrap">
            <input id="q" class="input v13" placeholder="Search…" style="min-width:240px">
            <button class="btn" id="apply">Apply</button>
          </div>
        </div>
        <div id="cards" style="margin-top:10px"></div>
      </div>
    `;

    const cards = document.getElementById('cards');
    function paint(){
      const q = ($('#q').value||'').toLowerCase();
      const arr = getCases().filter(c=>{
        const s=((c.issueSummary||'')+' '+(c.model||'')+' '+(c.system||'')+' '+(c.item||'')).toLowerCase();
        return !q || s.includes(q);
      });
      cards.innerHTML = arr.length ? arr.map((c,i)=>`
        <div class="case-card">
          <div class="stripe"></div>
          <div>
            <div class="title">#${i+1} — ${esc(c.sfCase||'')}</div>
            <div class="meta">Model: ${esc(c.model||'')} (${esc(c.machineType||'')}) · System: ${esc(c.system||'')} / ${esc(c.subSystem||'')}</div>
            <div class="kv" style="margin-top:6px"><span class="k">Issue:</span><span class="v">${esc(c.issueSummary||'')}</span></div>
          </div>
          <div class="actions">
            <button class="btn small" onclick="openCase(${i})">Details</button>
          </div>
        </div>
      `).join('') : '<div class="help">No cases.</div>';

      const badge=document.getElementById('casesCount'); if(badge) badge.textContent=String(getCases().length);
    }
    $('#apply').onclick = paint;
    paint();
  }

  // router hook
  const prevGo = window.go;
  if (typeof prevGo === 'function') {
    window.go = function(route){
      const r = prevGo.apply(this, arguments);
      if (route === 'cases') setTimeout(render, 0);
      return r;
    };
  }

  // if page already visible on load
  document.addEventListener('DOMContentLoaded', ()=>{
    const pg = document.getElementById('page-cases');
    if (pg && !pg.classList.contains('hidden')) render();
  });
})();
