/* ===================================================================
   Landa Quantum – Fishbone Troubleshooter (V20.0 • Multi-Issue)
   - Issue selector: SetOff / Scratches / Uniformity / PQ
   - Loads tree from RCA_DATA[issue] (data/rca-data.js); falls back to SetOff default
   - Uses SET_OFF_DATA (setoff.js) for subsystem checklists/specs
   - Zero global CSS changes
=================================================================== */
(function(){
  if (window.__LANDA_FISHBONE__) return; window.__LANDA_FISHBONE__ = true;
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const h=(t,a={},c=[])=>{ const e=document.createElement(t);
    for(const [k,v] of Object.entries(a||{})){
      if(k==='class') e.className=v; else if(k==='text') e.textContent=v;
      else if(k.startsWith('on') && typeof v==='function') e.addEventListener(k.substring(2),v);
      else e.setAttribute(k,v);
    }
    (Array.isArray(c)?c:[c]).forEach(n=>{ if(n==null)return; typeof n==='string'?e.appendChild(document.createTextNode(n)):e.appendChild(n); });
    return e;
  };
  const css=`
  #fbRoot .progress{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}
  #fbRoot .step{padding:6px 10px;border:1px solid var(--border);border-radius:999px;opacity:.9}
  #fbRoot .step.active{background:linear-gradient(180deg, rgba(0,174,239,.28), rgba(0,174,239,.08));border-color:rgba(0,174,239,.55)}
  #fbRoot .qa{display:grid;gap:10px}
  #fbRoot .opt{display:flex;align-items:center;justify-content:space-between;padding:6px 9px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg, rgba(15,23,42,.98), rgba(15,23,42,.985));font-size:13px;cursor:pointer}
  #fbRoot .opt:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.35);border-color:rgba(59,208,255,.35)}
  #fbRoot .crumbs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
  #fbRoot .crumb{padding:3px 8px;border:1px solid rgba(255,255,255,.16);border-radius:999px;font-size:11px;color:var(--muted)}
  #fbRoot .panel-lite{border-radius:14px;border:1px solid rgba(255,255,255,.12);padding:10px 12px;background:rgba(8,12,24,.96);margin-top:8px}
  #fbRoot .panel-lite h4{font-size:13px;margin-bottom:4px}
  #fbRoot .panel-lite p{font-size:12px;color:var(--muted)}
  `;
  const style=h('style',{text:css});
  document.head.appendChild(style);

  function renderFishbone(root, issueKey){
    root.innerHTML='';
    const data = window.RCA_DATA && window.RCA_DATA[issueKey || 'SetOff'];
    if(!data){ root.textContent='No RCA data loaded.'; return; }

    let path = [];
    let currentNode = data;

    const elProgress = h('div',{class:'progress'});
    const elCrumbs = h('div',{class:'crumbs'});
    const elQA = h('div',{class:'qa'});
    const elResult = h('div',{class:'panel-lite'});

    function updateProgress(){
      elProgress.innerHTML='';
      data.steps.forEach((s,idx)=>{
        elProgress.appendChild(h('div',{class:'step'+(idx<path.length?' active':''),text:(idx+1)+'. '+s}));
      });
    }

    function updateCrumbs(){
      elCrumbs.innerHTML='';
      path.forEach(p=>{
        elCrumbs.appendChild(h('span',{class:'crumb',text:p.label}));
      });
    }

    function updateQA(){
      elQA.innerHTML='';
      if(currentNode.question){
        elQA.appendChild(h('div',{class:'q',text:currentNode.question}));
      }
      if(currentNode.options){
        currentNode.options.forEach(opt=>{
          elQA.appendChild(h('button',{class:'opt',onclick:()=>selectOption(opt)},[
            h('span',{text:opt.label}),
            opt.weight? h('span',{style:'font-size:11px;color:var(--muted)',text:opt.weight+'★'}):null
          ]));
        });
      }
      if(currentNode.result){
        elResult.innerHTML='';
        elResult.appendChild(h('h4',{text:currentNode.result.title||'Recommended actions'}));
        elResult.appendChild(h('p',{text:currentNode.result.description||''}));
        if(currentNode.result.checklist){
          const ul=h('ul');
          currentNode.result.checklist.forEach(item=>{
            ul.appendChild(h('li',{text:item}));
          });
          elResult.appendChild(ul);
        }
      }else{
        elResult.innerHTML='';
      }
    }

    function selectOption(opt){
      path.push({ label: opt.label });
      if(opt.next){
        currentNode = opt.next;
      }
      updateProgress();
      updateCrumbs();
      updateQA();
    }

    updateProgress();
    updateCrumbs();
    updateQA();

    root.appendChild(elProgress);
    root.appendChild(elCrumbs);
    root.appendChild(elQA);
    root.appendChild(elResult);
  }

  window.renderFishbone = renderFishbone;
})();
