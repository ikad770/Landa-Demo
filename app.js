
/* ===== Helpers ===== */
function toast(msg,type='ok'){ const t=document.createElement('div'); t.className='toast '+type; t.textContent=msg; const w=document.getElementById('toasts'); w.appendChild(t); setTimeout(()=>{t.style.opacity='0'; setTimeout(()=>t.remove(),250)},1600); }
function esc(s){ return (s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) } function nl(s){ return String(s||'').replace(/\n/g,'<br>') }
const LS_KEY='landa_cases_v13';

/* ===== Storage ===== */
function getCases(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return [] } }
function setCases(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); updateKPIs(); }

/* ===== Routing ===== */
const pages=['dashboard','create','cases','diagnosis','settings'];
const fabNew=document.getElementById('fabNew');
function go(route){
  pages.forEach(p=>document.getElementById('page-'+p).classList.add('hidden'));
  const tgt=document.getElementById('page-'+route); if(tgt) tgt.classList.remove('hidden');
  document.querySelectorAll('.nav .item').forEach(a=>a.classList.toggle('active', a.dataset.route===route));
  if(route==='dashboard') updateKPIs();
  if(route==='cases') renderCases();
  if(fabNew) fabNew.style.display = (route==='create') ? 'none' : 'block';
  window.scrollTo({top:0, behavior:'smooth'});
}
document.getElementById('logoHome').addEventListener('click', ()=> go('dashboard'));
document.querySelectorAll('.nav .item').forEach(a=>{
  const r=a.getAttribute('data-route');
  if(r){ a.addEventListener('click', (e)=>{ e.preventDefault(); go(r); if (document.body.classList.contains('aside-open')) document.body.classList.remove('aside-open'); }); }
});
const btnMenu=document.getElementById('btnMenu');
if(btnMenu) btnMenu.addEventListener('click', ()=> document.body.classList.toggle('aside-open'));

/* ===== Auth ===== */
const AUTH_KEY='landaAuth';
const loginPage=document.getElementById('loginPage');
const appRoot=document.getElementById('appRoot');
function showApp(){ loginPage.classList.add('hidden'); appRoot.classList.remove('hidden'); go('dashboard'); updateKPIs(); }
function showLogin(){ appRoot.classList.add('hidden'); loginPage.classList.remove('hidden'); }

function doLogin(){
  const u=document.getElementById('authUser').value.trim();
  const p=document.getElementById('authPass').value.trim();
  if(u==='Expert' && p==='Landa123456'){
    toast('Welcome, Expert','ok'); localStorage.setItem(AUTH_KEY,'true'); setTimeout(showApp, 650);
  }else{
    toast('Invalid credentials','err');
  }
}

document.getElementById('btnLogin').addEventListener('click', e=>{
  e.preventDefault();
  doLogin();
});

['authUser','authPass'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('keydown', ev=>{
    if(ev.key==='Enter'){
      ev.preventDefault();
      doLogin();
    }
  });
});

if(localStorage.getItem(AUTH_KEY)==='true'){ showApp(); }
document.getElementById('btnLogout').addEventListener('click', e=>{
  e.preventDefault(); toast('Logged out successfully','ok'); localStorage.removeItem(AUTH_KEY);
  document.body.classList.remove('aside-open'); setTimeout(showLogin, 650);
});

/* ===== Custom Dropdown Engine ===== */
function makeDropdown(container, { placeholder='Choose…', options=[], onChange=()=>{}, maxHeight=260 }){
  container.classList.add('dd');
  container.innerHTML = `
    <button type="button" class="dd-btn"><span class="dd-label">${placeholder}</span></button>
    <span class="dd-arrow" aria-hidden="true"></span>
    <div class="dd-list" style="max-height:${maxHeight}px"></div>
    <input type="hidden" class="dd-value" value="">
  `;
  const btn = container.querySelector('.dd-btn');
  const list = container.querySelector('.dd-list');
  const label = container.querySelector('.dd-label');
  const input = container.querySelector('.dd-value');
  let state = { open:false, opts:options, index:-1 };

  function render(){
    list.innerHTML = '';
    if(!state.opts || !state.opts.length){ list.innerHTML = `<div class="dd-empty">No options</div>`; return; }
    state.opts.forEach((o,i)=>{
      const it=document.createElement('div'); it.className='dd-item';
      it.setAttribute('data-value',o.value); it.setAttribute('data-index',i);
      if(String(input.value)===String(o.value)) it.setAttribute('aria-selected','true');
      it.textContent=o.label ?? o.value;
      it.addEventListener('click', ()=> selectIndex(i));
      list.appendChild(it);
    });
  }
  function open(){ if(container.classList.contains('disabled')) return;
    container.classList.add('open'); state.open=true;
    const idx=Math.max(0, state.opts.findIndex(o=> String(o.value)===String(input.value)));
    highlight(idx); adjustInView();
    window.addEventListener('click', outside); window.addEventListener('keydown', keys);
  }
  function close(){ container.classList.remove('open'); state.open=false;
    window.removeEventListener('click', outside); window.removeEventListener('keydown', keys); }
  function outside(e){ if(!container.contains(e.target)) close(); }
  function keys(e){
    if(!state.open) return;
    if(e.key==='Escape'){ close(); btn.focus(); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); highlight(Math.min(state.index+1, state.opts.length-1)); adjustInView(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); highlight(Math.max(state.index-1,0)); adjustInView(); }
    else if(e.key==='Enter'){ e.preventDefault(); if(state.index>=0) selectIndex(state.index); }
  }
  function highlight(i){ state.index=i; [...list.children].forEach(c=>c.classList.remove('hover')); if(list.children[i]) list.children[i].classList.add('hover'); }
  function adjustInView(){ const el=list.children[state.index]; if(!el) return; const r=el.getBoundingClientRect(); const L=list.getBoundingClientRect();
    if(r.top<L.top) list.scrollTop -= (L.top-r.top)+6; if(r.bottom>L.bottom) list.scrollTop += (r.bottom-L.bottom)+6; }
  function selectIndex(i){ const o=state.opts[i]; if(!o) return;
    input.value=o.value; label.textContent=o.label ?? o.value;
    [...list.children].forEach(x=>x.removeAttribute('aria-selected')); if(list.children[i]) list.children[i].setAttribute('aria-selected','true');
    onChange(o.value, o.label ?? o.value); close(); }
  btn.addEventListener('click', ()=> state.open?close():open());
  const api={ setOptions(newOpts){ state.opts=newOpts||[]; render(); if(!state.opts.some(o=> String(o.value)===String(input.value))){ input.value=''; label.textContent=placeholder; } },
              setValue(v){ const i=state.opts.findIndex(o=> String(o.value)===String(v)); if(i>=0){ selectIndex(i); } else { input.value=''; label.textContent=placeholder; } },
              value(){ return input.value }, disable(flag){ container.classList.toggle('disabled', !!flag); } };
  render(); return api;
}

/* ===== Machine Type / Model ===== */
const machineTypeChips=document.getElementById('machineTypeChips');
const hiddenType=document.getElementById('machineType');
const ddModel = makeDropdown(document.getElementById('dd-model'), { placeholder:'Choose…', options:[] });

// Mapping of press code -> customer name
const PRESS_NAMES = {
  Simplex: {
    S08: "ZRP",
    S10: "Virtual",
    S11: "Marketing",
    S12: "SWR MX",
    S14: "McGowans",
    S15: "BPI",
    S16: "K-1",
    S18: "Dugal",
    S19: "Neff",
    S20: "MM",
    S21: "SCT",          // (SetOff sheet – yellow)
    S22: "Primary",
    S23: "FP Mercure",
    S24: "PGI TEA",
    S25: "Model",
    S26: "ZRP",
    S28: "SWR PL",
    S29: "Marketing",
    S30: "Neff",
    S32: "SWR IE",
    S35: "Wynalda"
  },
  Duplex: {
    D04: "Bluetree",
    D06: "GP",
    D07: "BluePrint",
    D09: "BJU",
    D11: "De Jong",
    D13: "Quad",
    D14: "Advantage",
    D16: "Superior",
    D18: "De Jong",
    D19: "Abeka",
    D21: "M13",
    D22: "Mapprint",
    D23: "Bluetree",
    D24: "Shenando",      // לפי מה שנראה בתמונה – תבדוק
    D25: "Wirtz",
    D26: "Advantage",
    D27: "Menasha",
    D28: "Publication",
    D29: "Marketing",     // אם יש בשורה – תוודא מול האקסל
    D30: "Neff",          // אם מופיע – תוודא גם כן
    D33: "Geiger"
  },
  Other: {
    "NS 40-105": "Komori"
  }
};

function fillModels(kind){
   const prefix = (kind === 'Duplex') ? 'D' : 'S';
   const max = (kind === 'Duplex') ? 33 : 35;
   const map = PRESS_NAMES[kind] || {};

   const opts = [];
   for (let i = 1; i <= max; i++) {
     const code = `${prefix}${i}`;
     const name = map[code];
     const label = name ? `${code} – ${name}` : code;
     opts.push({ value: code, label });
   }

   if (kind === 'Duplex' && PRESS_NAMES.Other) {
     Object.entries(PRESS_NAMES.Other).forEach(([code, name])=>{
       opts.push({ value: code, label: `${code} – ${name}` });
     });
   }

   ddModel.setOptions(opts);
   ddModel.setValue('');
}
fillModels(hiddenType.value||'Simplex');
machineTypeChips.addEventListener('click', (e)=>{
  const chip=e.target.closest('.chip'); if(!chip) return;
  machineTypeChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active'); hiddenType.value=chip.dataset.type; fillModels(hiddenType.value);
});

/* ===== Hierarchical data (from your image – BSS) ===== */
const HIER = {
  "BSS": {
    subSystems: [
      "LIB","BCU","BCD&BTD Motors","BACS","Fly-Off","Air Knife","Hot Plate","Dancer","BCLS","Vacuum Box"
    ],
    categories: {
      "HW": ["Rollers","Sensors","Motors","Brackets","Gaskets","Spare Parts","Pipes","Encoders","Valves"],
      "SW": ["LIA","RTC","OPC","Parameters","Inverters Version"],
      "EC": ["Inverters","Cables","SSR","CB's","FEC's"]
    }
  }
};
const SYSTEMS = Object.keys(HIER).map(x=>({value:x,label:x}));

/* ===== Build dynamic dropdowns: System → Sub → Category → Item ===== */
const ddSystem = makeDropdown(document.getElementById('dd-system'), { placeholder:'Choose…', options:SYSTEMS, onChange:onSystem });
const wrapSub = document.getElementById('wrap-sub');
const wrapCat = document.getElementById('wrap-cat');
const wrapItem= document.getElementById('wrap-item');

const ddSub = makeDropdown(document.getElementById('dd-sub'), { placeholder:'Select sub-system…', options:[], onChange:onSub });
const ddCat = makeDropdown(document.getElementById('dd-cat'), { placeholder:'HW / SW / EC', options:[], onChange:onCat });
const ddItem= makeDropdown(document.getElementById('dd-item'), { placeholder:'Select item…', options:[] });

function onSystem(val){
  wrapItem.classList.add('hidden'); ddItem.setOptions([]); ddItem.setValue('');
  wrapCat.classList.add('hidden'); ddCat.setOptions([]); ddCat.setValue('');
  wrapSub.classList.add('hidden'); ddSub.setOptions([]); ddSub.setValue('');

  const node = HIER[val];
  if(!node){ return; }
  ddSub.setOptions(node.subSystems.map(s=>({value:s,label:s})));
  wrapSub.classList.remove('hidden');
}
function onSub(){
  wrapItem.classList.add('hidden'); ddItem.setOptions([]); ddItem.setValue('');
  wrapCat.classList.add('hidden'); ddCat.setOptions([]); ddCat.setValue('');

  const sys = ddSystem.value();
  if(!sys || !HIER[sys]) return;
  const cats = Object.keys(HIER[sys].categories);
  ddCat.setOptions(cats.map(c=>({value:c,label:c})));
  wrapCat.classList.remove('hidden');
}
function onCat(catVal){
  wrapItem.classList.add('hidden'); ddItem.setOptions([]); ddItem.setValue('');
  const sys = ddSystem.value();
  if(!sys || !catVal) return;
  const items = (HIER[sys].categories[catVal] || []).map(x=>({value:x,label:x}));
  ddItem.setOptions(items);
  wrapItem.classList.remove('hidden');
}

/* ===== TFS toggle ===== */
const tfsToggle=document.getElementById('tfsToggle');
const tfsNumber=document.getElementById('tfsNumber');
tfsToggle.addEventListener('change', ()=>{
  if(tfsToggle.checked){ tfsNumber.classList.remove('hidden'); tfsNumber.focus(); }
  else { tfsNumber.classList.add('hidden'); tfsNumber.value=''; }
});

/* ===== Troubleshooting steps ===== */
const tsSteps=document.getElementById('tsSteps');
function addStep(val=''){
  const row=document.createElement('div'); row.className='inline'; row.style.margin='6px 0';
  const inp=document.createElement('input'); inp.className='input v13'; inp.placeholder='Describe a step…'; inp.value=val; inp.style.flex='1';
  const rm=document.createElement('button'); rm.className='btn small danger'; rm.type='button'; rm.textContent='Remove'; rm.onclick=()=>row.remove();
  row.appendChild(inp); row.appendChild(rm); tsSteps.appendChild(row);
}
addStep('Check connections and sensors');
addStep('Verify model-specific settings');

/* ===== Part smart suggest (demo) ===== */
const partInput=document.getElementById('partInput');
const partSuggest=document.getElementById('partSuggest');
if(partInput){
  const parts=Array.from({length:160},(_,i)=> ((i%2===0)?'12':'34') + '-' + String(10000+i).slice(-5));
  const filterParts=q=>{const v=String(q||'').trim().toLowerCase(); if(!v) return []; return parts.filter(p=>p.toLowerCase().includes(v)).slice(0,30)};
  partInput.addEventListener('input', ()=>{
    const list=filterParts(partInput.value); partSuggest.innerHTML='';
    if(!list.length){ partSuggest.style.display='none'; return }
    list.forEach(p=>{ const row=document.createElement('div'); row.textContent=p; row.addEventListener('click',()=>{partInput.value=p; partSuggest.style.display='none'}); partSuggest.appendChild(row) });
    partSuggest.style.display='block';
  });
  document.addEventListener('click',(e)=>{ if(!partSuggest.contains(e.target) && e.target!==partInput){ partSuggest.style.display='none' }});
}

/* ===== Files ===== */
function addFileRow(){
  const w=document.getElementById('filesWrap');
  const row=document.createElement('div'); row.className='inline';
  const inp=document.createElement('input'); inp.type='file'; inp.className='file'; inp.accept='.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip';
  const rm=document.createElement('button'); rm.className='btn small danger'; rm.type='button'; rm.textContent='Remove'; rm.onclick=()=>row.remove();
  row.appendChild(inp); row.appendChild(rm); w.appendChild(row);
}
addFileRow();

/* ===== Save Case ===== */
async function saveCase(e){
  e.preventDefault();
  const req=v=>v&&String(v).trim().length>0;

  const data={
    sfCase:val('sfCase'),
    tfsNumber: tfsToggle.checked ? val('tfsNumber') : '',
    machineType: val('machineType'),
    model: ddModel.value(),
    system: ddSystem.value(),
    subSystem: ddSub.value(),
    category: ddCat.value(),
    item: ddItem.value(),
    softwareVersion: val('softwareVersion'),
    issueSummary: val('issueSummary'),
    symptoms: val('symptoms'),
    troubleshooting: collectSteps(),
    partCatalog: val('partInput'),
    solution: val('solution'),
    verification: val('verification'),
    notes: val('notes'),
    attachments: [],
    createdAt: new Date().toISOString(),
    author:'Expert'
  };

  const errors=[];
  if(!req(data.sfCase))errors.push('sfCase');
  if(!req(data.model))errors.push('model');
  if(!req(data.system))errors.push('system');
  if(!req(data.subSystem))errors.push('subSystem');
  if(!req(data.category))errors.push('category');
  if(!req(data.item))errors.push('item');
  if(!req(data.issueSummary))errors.push('issueSummary');
  if(!req(data.solution))errors.push('solution');

  if(errors.length){ toast('Please fill required: '+errors.join(', '),'err'); return; }

  const inputs=[...document.querySelectorAll('#filesWrap input[type="file"]')];
  const files=inputs.map(i=>i.files&&i.files[0]).filter(Boolean);
  if(files.length){ for(const f of files){
      const ok=/\.(pdf|docx?|xlsx?|png|jpg|jpeg|zip)$/i.test(f.name);
      if(!ok){ toast('Unsupported file: '+f.name,'err'); continue }
      const base64=await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f) });
      data.attachments.push({name:f.name,type:f.type,data:base64});
    } }

  const arr=getCases(); arr.push(data); setCases(arr);

  document.getElementById('caseForm').reset();
  hiddenType.value='Simplex';
  machineTypeChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  machineTypeChips.querySelector('[data-type="Simplex"]').classList.add('active');
  fillModels('Simplex');

  ddSystem.setValue(''); ddSub.setOptions([]); ddSub.setValue('');
  ddCat.setOptions([]); ddCat.setValue(''); ddItem.setOptions([]); ddItem.setValue('');
  wrapSub.classList.add('hidden'); wrapCat.classList.add('hidden'); wrapItem.classList.add('hidden');

  document.getElementById('filesWrap').innerHTML=''; addFileRow();
  tsSteps.innerHTML=''; addStep('Check connections and sensors'); addStep('Verify model-specific settings');

  toast('Case saved successfully','ok'); go('cases');
}
function collectSteps(){ return [...tsSteps.querySelectorAll('.inline input')].map(i=>i.value).filter(v=>String(v).trim()).join('\n') }
function val(id){ const el=document.getElementById(id); return el?el.value:'' }

/* ===== Cases render ===== */
function renderCases(){
  const list=document.getElementById('casesList');
  const q=(document.getElementById('searchBox').value||'').toLowerCase();
  const arr=getCases().filter(c=> !q ||
    (c.issueSummary||'').toLowerCase().includes(q) ||
    (c.model||'').toLowerCase().includes(q) ||
    (c.system||'').toLowerCase().includes(q) ||
    (c.item||'').toLowerCase().includes(q)
  );
  const badge=document.getElementById('casesCount'); if(badge) badge.textContent=String(arr.length);
  list.innerHTML = arr.length ? arr.map((c,i)=>caseCard(c,i)).join('') : '<div class="panel">No cases yet.</div>';
}
function caseCard(c,i){
  const files=Array.isArray(c.attachments)&&c.attachments.length? `${c.attachments.length} file(s)` : 'No attachments';
  return `<div class="case-card">
    <div class="stripe"></div>
    <div>
      <div class="title">#${i+1} — ${esc(c.sfCase||'')}</div>
      <div class="meta">
        <span class="kv"><span class="k">Model:</span><span class="v">${esc(c.model||'')} (${esc(c.machineType||'')})</span></span>
        <span class="kv"><span class="k">System:</span><span class="v">${esc(c.system||'')} / ${esc(c.subSystem||'')}</span></span>
        <span class="kv"><span class="k">Category:</span><span class="v">${esc(c.category||'')} → ${esc(c.item||'')}</span></span>
        <span class="kv"><span class="k">SW:</span><span class="v">${esc(c.softwareVersion||'')}</span></span>
      </div>
      <div class="kv" style="margin-top:8px"><span class="k">Issue:</span><span class="v">${esc(c.issueSummary||'')}</span></div>
      <div class="files" style="margin-top:4px">${files}</div>
    </div>
    <div class="actions">
      <button class="btn small" onclick="openCase(${i})">Details</button>
      <button class="btn small danger" onclick="deleteCase(${i})">Delete</button>
    </div>
  </div>`;
}
function openCase(i){
  const c=getCases()[i]; if(!c) return; document.getElementById('modalTitle').textContent=`Case #${i+1} — ${c.sfCase||''}`;
  const files=Array.isArray(c.attachments)&&c.attachments.length?
    c.attachments.map(a=>`<div class="kv"><span class="k">•</span><a class="btn small" href="${a.data}" target="_blank" rel="noopener">View</a> <a class="btn small" href="${a.data}" download="${a.name}">Download</a> <span class="v">${esc(a.name)}</span></div>`).join('')
    : '<div class="attach-empty">No attachments</div>';
  document.getElementById('modalBody').innerHTML = `
    <div class="grid cols-2">
      <div class="panel">
        <div class="kv"><span class="k">Model:</span><span class="v">${esc(c.model||'')} (${esc(c.machineType||'')})</span></div>
        <div class="kv"><span class="k">System:</span><span class="v">${esc(c.system||'')} / ${esc(c.subSystem||'')}</span></div>
        <div class="kv"><span class="k">Category:</span><span class="v">${esc(c.category||'')} → ${esc(c.item||'')}</span></div>
        <div class="kv"><span class="k">Software:</span><span class="v">${esc(c.softwareVersion||'')}</span></div>
        <div class="kv"><span class="k">TFS:</span><span class="v">${esc(c.tfsNumber||'')}</span></div>
      </div>
      <div class="panel">
        <div class="kv"><span class="k">Opened:</span><span class="v">${new Date(c.createdAt).toLocaleString()}</span></div>
        <div class="kv"><span class="k">Author:</span><span class="v">${esc(c.author||'')}</span></div>
      </div>
    </div>
    <div class="panel" style="margin-top:12px"><h3>Problem</h3>
      <div class="kv"><span class="k">Summary:</span><span class="v">${esc(c.issueSummary||'')}</span></div>
      <div class="kv"><span class="k">Symptoms:</span><span class="v">${nl(esc(c.symptoms||''))}</span></div>
    </div>
    <div class="panel" style="margin-top:12px"><h3>Solution</h3>
      <div class="kv"><span class="k">Troubleshooting:</span><span class="v">${nl(esc(c.troubleshooting||''))}</span></div>
      <div class="kv"><span class="k">Part (catalog):</span><span class="v">${esc(c.partCatalog||'')}</span></div>
      <div class="kv"><span class="k">Implemented:</span><span class="v">${nl(esc(c.solution||''))}</span></div>
      <div class="kv"><span class="k">Verification:</span><span class="v">${esc(c.verification||'')}</span></div>
      <div class="kv"><span class="k">Notes:</span><span class="v">${nl(esc(c.notes||''))}</span></div>
      <div class="kv" style="margin-top:12px"><span class="k">Files:</span><span class="v">${files}</span></div>
    </div>`;
  openModal();
}
function deleteCase(i){ const arr=getCases(); if(!arr[i]) return; if(!confirm('Delete this case?')) return; arr.splice(i,1); setCases(arr); renderCases(); toast('Case deleted','ok'); }
function openModal(){ document.getElementById('modalBack').style.display='flex'; }
function closeModal(){ document.getElementById('modalBack').style.display='none'; }
function updateKPIs(){
  const arr=getCases(); 
  const elTotal=document.getElementById('kpiTotal');
  if(elTotal) elTotal.textContent=arr.length;
  const elFiles=document.getElementById('kpiFiles');
  if(elFiles) elFiles.textContent=arr.filter(c=>Array.isArray(c.attachments)&&c.attachments.length).length;
  const last=arr.length? new Date(arr[arr.length-1].createdAt).toLocaleString() : '—';
  const elUpdated=document.getElementById('kpiUpdated');
  if(elUpdated) elUpdated.textContent=last;
  const pageCasesCount=document.getElementById('casesCount'); 
  if(pageCasesCount) pageCasesCount.textContent=String(arr.length);
}

/* ===== Particles ===== */
(function(){
  const c=document.getElementById('particles'); if(!c) return; const ctx=c.getContext('2d'); let w,h;
  function resize(){ w=c.width=innerWidth; h=c.height=innerHeight; }
  addEventListener('resize',resize); resize();
  const dots=Array.from({length:60},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.6+0.6,vx:(Math.random()-.5)*0.28,vy:(Math.random()-.5)*0.28}));
  function step(){
    ctx.clearRect(0,0,w,h);
    for(const d of dots){
      d.x+=d.vx; d.y+=d.vy;
      if(d.x<0||d.x>w) d.vx*=-1; if(d.y<0||d.y>h) d.vy*=-1;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle='rgba(59,208,255,0.25)'; ctx.fill();
    }
    requestAnimationFrame(step);
  }
  step();
})();

/* ===== Expose utilities used by RCA ===== */
window.toast = toast;
