// /js/cases.js — HOTFIX: render immediately on entering "cases" route

(function(){
  if (window.__LANDA_CASES__) return; window.__LANDA_CASES__=true;
  const LS_KEY='landa_cases_v18_8';
  const $=(s,r=document)=>r.querySelector(s);

  function getCases(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return [] } }
  function esc(s){ return (s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }

  function openModal(caseObj){
    const backdrop=document.createElement('div');
    backdrop.className='modal-backdrop';
    const modal=document.createElement('div');
    modal.className='modal';

    const attachHtml=(caseObj.attachments||[]).map(a=>`<li>${esc(a.name||'file')} (${a.size||0}B)</li>`).join('');
    modal.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:600">Case ${esc(caseObj.id||'')}</div>
          <div style="font-size:11px;color:var(--muted)">${esc(caseObj.pressName||'')}</div>
        </div>
        <button class="btn small ghost" type="button" id="modalClose">Close</button>
      </div>
      <div class="grid grid-3" style="margin-bottom:6px">
        <div class="field"><label>Press Type</label><div>${esc(caseObj.pressType||'')}</div></div>
        <div class="field"><label>Region</label><div>${esc(caseObj.region||'')}</div></div>
        <div class="field"><label>Date</label><div>${esc(caseObj.date||'')}</div></div>
        <div class="field"><label>System</label><div>${esc(caseObj.system||'')}</div></div>
        <div class="field"><label>Sub System</label><div>${esc(caseObj.subSystem||'')}</div></div>
        <div class="field"><label>Area</label><div>${esc(caseObj.area||'')}</div></div>
        <div class="field"><label>Type</label><div>${esc(caseObj.type||'')}</div></div>
        <div class="field"><label>Part</label><div>${esc(caseObj.part||'')}</div></div>
      </div>
      <div class="field">
        <label>Summary</label>
        <div style="font-size:12px;white-space:pre-wrap">${esc(caseObj.summary||'')}</div>
      </div>
      <div class="field">
        <label>Resolution</label>
        <div style="font-size:12px;white-space:pre-wrap">${esc(caseObj.resolution||'')}</div>
      </div>
      <div class="field">
        <label>Troubleshooting Steps</label>
        <ul style="font-size:12px;margin-left:16px">
          ${(caseObj.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}
        </ul>
      </div>
      <div class="field">
        <label>Attachments</label>
        <ul style="font-size:12px;margin-left:16px">${attachHtml||'<li>None</li>'}</ul>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click',e=>{
      if(e.target===backdrop || e.target.id==='modalClose'){
        backdrop.remove();
      }
    });
  }

  function render(){
    const root = document.getElementById('page-cases'); if(!root) return;
    const arr = getCases();
    let html = `
      <div class="panel" id="casesPro">
        <div class="inline" style="gap:8px;justify-content:space-between;flex-wrap:wrap">
          <div>
            <h3>All Cases</h3>
            <p style="font-size:11px;color:var(--muted)">Structured view of all saved troubleshooting records</p>
          </div>
          <div style="font-size:11px;color:var(--muted)">Total: <span id="casesCount">${arr.length}</span></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Press</th>
                <th>Region</th>
                <th>System</th>
                <th>Type</th>
                <th>Summary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
    `;
    html += arr.map(c=>`<tr data-id="${esc(c.id||'')}">
      <td>${esc(c.id||'')}</td>
      <td>${esc(c.pressName||'')}</td>
      <td>${esc(c.region||'')}</td>
      <td>${esc(c.system||'')}</td>
      <td>${esc(c.type||'')}</td>
      <td>${esc((c.summary||'').slice(0,50))}</td>
      <td><button type="button" class="btn small ghost btn-view">View</button></td>
    </tr>`).join('');
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    root.innerHTML = html;

    root.querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click',e=>{
        if(e.target.classList.contains('btn-view') || e.target.tagName==='TD'){
          const id=tr.getAttribute('data-id');
          const obj = getCases().find(c=>c.id===id);
          if(obj) openModal(obj);
        }
      });
    });
  }

  window.renderCasesPage = render;
})();
