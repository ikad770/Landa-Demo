/* ===== Helpers ===== */
function toast(msg,type='ok'){
  const wrap=document.getElementById('toasts');
  if(!wrap) return;
  const el=document.createElement('div');
  el.className='toast '+type;
  el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),300); },2600);
}
function qs(sel,root=document){ return root.querySelector(sel); }
function qsa(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }

/* ===== Particles (background stars) ===== */
(function(){
  const canvas=document.getElementById('particles'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let w=canvas.width=window.innerWidth;
  let h=canvas.height=window.innerHeight;
  const stars=Array.from({length:160},()=>({
    x:Math.random()*w,
    y:Math.random()*h,
    r:Math.random()*1.6+0.4,
    v:Math.random()*0.3+0.1
  }));
  window.addEventListener('resize',()=>{
    w=canvas.width=window.innerWidth;
    h=canvas.height=window.innerHeight;
  });
  function draw(){
    ctx.clearRect(0,0,w,h);
    stars.forEach(s=>{
      ctx.globalAlpha=0.2+Math.sin(Date.now()*0.001*s.v)*0.25;
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle='#ffffff';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

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
    toast('Welcome, '+u,'ok');
    localStorage.setItem(AUTH_KEY,'true');
    setTimeout(showApp, 650);
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
  e.preventDefault();
  toast('Logged out successfully','ok');
  localStorage.removeItem(AUTH_KEY);
  document.body.classList.remove('aside-open');
  setTimeout(showLogin, 650);
});

/* ===== Custom Dropdown Engine ===== */
function makeDropdown(container, { placeholder='Choose…', options=[], onChange=()=>{}, maxHeight=260 }){
  container.innerHTML='';
  container.classList.add('dd');
  const display=document.createElement('button');
  display.type='button';
  display.className='input dd-display';
  display.textContent=placeholder;
  const list=document.createElement('div');
  list.className='dd-list';
  list.style.maxHeight=maxHeight+'px';
  list.style.display='none';

  options.forEach(opt=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='dd-item';
    b.textContent=opt.label ?? opt;
    b.dataset.value=opt.value ?? opt;
    b.addEventListener('click',()=>{
      display.textContent=b.textContent;
      list.style.display='none';
      onChange(b.dataset.value);
    });
    list.appendChild(b);
  });

  display.addEventListener('click',()=>{
    const open=list.style.display==='block';
    qsa('.dd-list').forEach(l=>l.style.display='none');
    list.style.display=open?'none':'block';
  });

  container.appendChild(display);
  container.appendChild(list);
  document.addEventListener('click',e=>{
    if(!container.contains(e.target)) list.style.display='none';
  });

  return {
    setValue(label){
      display.textContent=label ?? placeholder;
    }
  };
}

/* ===== Data: Press Names / Systems (from your mapping) ===== */
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
    S21: "SCT",
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
    D10: "Vanguard",
    D11: "Test",
    D12: "MM",
    D13: "MM",
    D14: "MM",
    D15: "Virtual"
  }
};

const SYSTEMS = {
  "Feeder": ["Input", "Vacuum", "Alignment"],
  "Print Engine": ["Ink", "Imaging", "Registration"],
  "IRD": ["Temperature", "Mass Balance", "Flow"],
  "Coater": ["Varnish", "UV", "Dryer"]
};
const AREAS = {
  "Ink": ["Loop", "Pump", "Filter"],
  "Imaging": ["Drum", "Laser", "Developer"]
};

const PARTS_HW = [
  { code:"P-1001", name:"IRD Pump" },
  { code:"P-1002", name:"Feeder Sensor" },
  { code:"P-1003", name:"Ink Temp Sensor" }
];

/* LocalStorage key for cases */
const LS_CASES_KEY='landa_cases_v18_8';

/* ===== Cases Helpers ===== */
function getCases(){
  try{
    return JSON.parse(localStorage.getItem(LS_CASES_KEY)||'[]');
  }catch(e){
    return [];
  }
}
function saveCases(arr){
  localStorage.setItem(LS_CASES_KEY, JSON.stringify(arr));
}
function genId(){
  return 'C-'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,12);
}

/* ===== Routing ===== */
const routes=['dashboard','create','cases','rca'];
function go(route){
  routes.forEach(r=>{
    const page=document.getElementById('page-'+r);
    if(page) page.classList.toggle('hidden', r!==route);
    qsa('.aside-item[data-route]').forEach(btn=>{
      if(btn.dataset.route===route) btn.classList.add('active'); else btn.classList.remove('active');
    });
  });
  if(route==='cases'){
    if(window.renderCasesPage) window.renderCasesPage();
  }
  if(route==='rca'){
    if(window.renderRCAPage) window.renderRCAPage();
  }
}
qsa('.aside-item[data-route]').forEach(btn=>{
  btn.addEventListener('click',()=>go(btn.dataset.route));
});
document.getElementById('logoHome').addEventListener('click',()=>go('dashboard'));

/* ===== Menu toggle (mobile) ===== */
const aside=document.getElementById('aside');
const btnMenu=document.getElementById('btnMenu');
btnMenu.addEventListener('click',()=>{
  document.body.classList.toggle('aside-open');
});

/* ===== Dashboard KPIs ===== */
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

/* Simple dashboard render of recent cases */
function renderDashboardRecent(){
  const root=document.getElementById('dashRecent'); if(!root) return;
  const arr=getCases().slice(-5).reverse();
  if(!arr.length){
    root.innerHTML='<p style="font-size:12px;color:var(--muted)">No cases yet.</p>';
    return;
  }
  let html='<div class="table-wrap"><table><thead><tr><th>ID</th><th>Press</th><th>System</th><th>Type</th><th>Summary</th></tr></thead><tbody>';
  html+=arr.map(c=>`<tr>
    <td>${c.id}</td>
    <td>${c.pressName||''}</td>
    <td>${c.system||''}</td>
    <td>${c.type||''}</td>
    <td>${(c.summary||'').slice(0,60)}</td>
  </tr>`).join('');
  html+='</tbody></table></div>';
  root.innerHTML=html;
}

/* ===== Create Case Logic ===== */
(function(){
  const fPressType=document.getElementById('fPressType');
  const fPressName=document.getElementById('fPressName');
  const fSystem=document.getElementById('fSystem');
  const fSubSystem=document.getElementById('fSubSystem');
  const fArea=document.getElementById('fArea');
  const fType=document.getElementById('fType');
  const fPart=document.getElementById('fPart');
  const fFiles=document.getElementById('fFiles');
  const filesList=document.getElementById('filesList');
  const stepsWrap=document.getElementById('stepsWrap');
  const btnAddStep=document.getElementById('btnAddStep');
  const form=document.getElementById('caseForm');

  if(!form) return;

  function populatePressNames(){
    fPressName.innerHTML='';
    const type=fPressType.value;
    if(!type || !PRESS_NAMES[type]) return;
    const map=PRESS_NAMES[type];
    Object.keys(map).forEach(code=>{
      const opt=document.createElement('option');
      opt.value=code;
      opt.textContent=code+' – '+map[code];
      fPressName.appendChild(opt);
    });
  }

  function populateSystems(){
    fSystem.innerHTML='<option value="">Select…</option>';
    Object.keys(SYSTEMS).forEach(sys=>{
      const opt=document.createElement('option');
      opt.value=sys;
      opt.textContent=sys;
      fSystem.appendChild(opt);
    });
  }

  function populateSubSystems(){
    fSubSystem.innerHTML='<option value="">Select…</option>';
    const sys=fSystem.value;
    if(!sys || !SYSTEMS[sys]) return;
    SYSTEMS[sys].forEach(s=>{
      const opt=document.createElement('option');
      opt.value=s;
      opt.textContent=s;
      fSubSystem.appendChild(opt);
    });
  }

  function populateAreas(){
    fArea.innerHTML='<option value="">Select…</option>';
    const key=fSubSystem.value;
    if(!key || !AREAS[key]) return;
    AREAS[key].forEach(a=>{
      const opt=document.createElement('option');
      opt.value=a;
      opt.textContent=a;
      fArea.appendChild(opt);
    });
  }

  function populateParts(){
    fPart.innerHTML='';
    if(fType.value!=='HW') return;
    PARTS_HW.forEach(p=>{
      const opt=document.createElement('option');
      opt.value=p.code;
      opt.textContent=p.code+' – '+p.name;
      fPart.appendChild(opt);
    });
  }

  fPressType.addEventListener('change', populatePressNames);
  fSystem.addEventListener('change',()=>{
    populateSubSystems();
    populateAreas();
  });
  fSubSystem.addEventListener('change', populateAreas);
  fType.addEventListener('change', populateParts);

  populateSystems();

  fFiles.addEventListener('change',()=>{
    filesList.innerHTML='';
    Array.from(fFiles.files||[]).forEach((file,idx)=>{
      const chip=document.createElement('div');
      chip.className='chip';
      chip.innerHTML=`<span>${file.name}</span> <button type="button" data-idx="${idx}">×</button>`;
      filesList.appendChild(chip);
    });
  });
  filesList.addEventListener('click',e=>{
    if(e.target.tagName!=='BUTTON') return;
    const i=+e.target.dataset.idx;
    const files=Array.from(fFiles.files);
    files.splice(i,1);
    const dt=new DataTransfer();
    files.forEach(f=>dt.items.add(f));
    fFiles.files=dt.files;
    fFiles.dispatchEvent(new Event('change'));
  });

  function addStep(initial=''){
    const idx=stepsWrap.children.length+1;
    const wrapper=document.createElement('div');
    wrapper.className='chip';
    wrapper.style.width='100%';
    wrapper.innerHTML=`
      <span style="font-size:11px;color:var(--muted)">Step ${idx}</span>
      <textarea rows="2" class="input" style="flex:1">${initial||''}</textarea>
      <button type="button" aria-label="Remove step">×</button>
    `;
    stepsWrap.appendChild(wrapper);
  }
  btnAddStep.addEventListener('click',()=>addStep());

  stepsWrap.addEventListener('click',e=>{
    if(e.target.tagName!=='BUTTON') return;
    e.target.parentElement.remove();
  });

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const cases=getCases();
    const id=genId();
    const steps=Array.from(stepsWrap.querySelectorAll('textarea')).map(t=>t.value.trim()).filter(Boolean);
    const attachments=Array.from(fFiles.files||[]).map(f=>({ name:f.name, size:f.size }));
    const payload={
      id,
      pressType:fPressType.value||'',
      pressName:fPressName.value? (fPressName.value+' – '+(PRESS_NAMES[fPressType.value]?.[fPressName.value]||'')) : '',
      region:document.getElementById('fRegion').value||'',
      system:fSystem.value||'',
      subSystem:fSubSystem.value||'',
      area:fArea.value||'',
      type:fType.value||'',
      part:fType.value==='HW'? fPart.value||'' : '',
      date:document.getElementById('fDate').value||'',
      summary:document.getElementById('fSummary').value||'',
      resolution:document.getElementById('fResolution').value||'',
      steps,
      attachments,
      createdAt:new Date().toISOString()
    };
    cases.push(payload);
    saveCases(cases);
    toast('Case saved','ok');
    updateKPIs();
    renderDashboardRecent();
    form.reset();
    stepsWrap.innerHTML='';
    filesList.innerHTML='';
  });

})();

/* ===== Init on load ===== */
document.addEventListener('DOMContentLoaded',()=>{
  updateKPIs();
  renderDashboardRecent();
});
