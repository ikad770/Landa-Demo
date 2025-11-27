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
      if(k==='class') e.className=v; else if(k==='text') e.textContent=v; else if(k==='style') e.setAttribute('style',v);
      else if(k.startsWith('on') && typeof v==='function') e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
    }
    (Array.isArray(c)?c:[c]).forEach(n=>{ if(n==null)return; typeof n==='string'?e.appendChild(document.createTextNode(n)):e.appendChild(n); });
    return e;
  };
  const css=`
  #fbRoot .progress{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}
  #fbRoot .step{padding:6px 10px;border:1px solid var(--border);border-radius:999px;opacity:.9}
  #fbRoot .step.active{background:linear-gradient(180deg, rgba(0,174,239,.28), rgba(0,174,239,.08));border-color:rgba(0,174,239,.55)}
  #fbRoot .qa{display:grid;gap:10px}
  #fbRoot .opt{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border);border-radius:12px;padding:10px 12px;background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015));cursor:pointer}
  #fbRoot .opt:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.35);border-color:rgba(59,208,255,.35)}
  #fbRoot .crumbs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
  #fbRoot .crumb{padding:3px 8px;border:1px solid var(--border);border-radius:999px;font-size:12px}
  #fbRoot .ask{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
  #fbRoot .mini-bar{height:6px;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,.05);position:relative;min-width:120px}
  #fbRoot .mini-bar .val{position:absolute;top:-4px;height:14px;width:2px;background:#bfe9ff;border-radius:2px;box-shadow:0 0 8px rgba(0,174,239,.45)}
  #fbRoot .pill{padding:2px 8px;border:1px solid var(--border);border-radius:999px;font-size:12px}
  #fbRoot .pill.ok{border-color:rgba(74,222,128,.55)} #fbRoot .pill.bad{border-color:rgba(255,73,103,.6)}
  #fbRoot .tabs{display:flex;gap:8px;flex-wrap:wrap}
  #fbRoot .tabs .chip{cursor:pointer}
  #fbRoot .grid.compact{display:grid;grid-template-columns:repeat(auto-fit, minmax(160px,1fr));gap:8px}
  .issue-grid{display:flex;flex-wrap:wrap;gap:12px}
  .issue-card{flex:1 1 200px;min-width:200px;max-width:280px;padding:14px;border:1px solid var(--border);border-radius:14px;cursor:pointer;background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015));box-shadow:0 10px 26px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.03);transition:.2s}
  .issue-card:hover{transform:translateY(-2px);border-color:rgba(59,208,255,.45);box-shadow:0 18px 40px rgba(0,174,239,.28)}
  .issue-card .title{font-weight:600;margin-bottom:6px}
  .issue-card .sub{color:var(--muted);font-size:12.5px}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // helpers for SPEC
  function parseSpec(tok){ if(!tok&&tok!==0) return null; const s=String(tok).trim(); const m=s.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/); if(m) return {min:+m[1],max:+m[2]}; if(/^-?\d+(?:\.\d+)?$/.test(s)) return {target:+s}; return null; }
  function withinSpec(val,spec){ if(!spec) return null; const n=Number(val); if(!isFinite(n)) return null; if(typeof spec.min==='number'&&n<spec.min) return false; if(typeof spec.max==='number'&&n>spec.max) return false; if(typeof spec.target==='number') return Math.abs(n-spec.target)<=1e-9; return true; }
  const pill=(ok)=> ok==null?h('span',{class:'pill'},'—'):(ok?h('span',{class:'pill ok'},'Within spec'):h('span',{class:'pill bad'},'Out of spec'));
  function miniBar(spec,val){ if(!spec||(typeof spec.min!=='number'&&typeof spec.max!=='number')) return null; const min=typeof spec.min==='number'?spec.min:(spec.target-1||0); const max=typeof spec.max==='number'?spec.max:(spec.target+1||1); const w=h('div',{class:'mini-bar'}),v=h('div',{class:'val'}); w.appendChild(v); function place(x){ const n=Number(x); if(!isFinite(n)){v.style.left='-9999px';return;} const p=Math.max(0,Math.min(100,((n-min)*100/(max-min)))); v.style.left=`calc(${p}% - 1px)`; } place(val); w._place=place; return w; }
  function globalSpec(key){ try{ const g=(typeof SET_OFF_DATA!=='undefined' && SET_OFF_DATA.spec)?SET_OFF_DATA.spec[key]:null; return g?parseSpec(g):null; }catch{return null;} }
  function getSubNodes(name){ const raw=(typeof SET_OFF_DATA!=='undefined')?SET_OFF_DATA:null; const subs=raw?.subsystems||raw?.Subsystems||{}; return subs?.[name]||null; }

  // default SetOff tree (in case RCA_DATA.setoff is missing tree)
  const DEFAULT_SETOFF = {
    root:{ type:'q', title:'SetOff — A/B drying sanity check', text:'Print the same job with and without coating. Which sample is under-dried?', options:[
      {label:'Without coating', next:'drying'},
      {label:'With coating',    next:'coating'},
      {label:'Both',            next:'both'}
    ]},
    nodes:{
      drying:{ type:'ask', title:'Temperature after IRD (°C)', text:'Measure immediately after the last IRD zone.', unit:'°C', specFrom:'IRD_Temp',
        routes:[ {when:'<',value:60,next:'drying_low'}, {when:'>=',value:60,next:'ask_humidity'} ] },
      ask_humidity:{ type:'ask', title:'Humidity / exhaust at drying area (%)', text:'Measure near the exhaust / humidity sensor.', unit:'%', routes:[
        {when:'>',value:55,next:'drying_flow'},{when:'<=',value:55,next:'leaf_drying'} ] },
      drying_low:{ type:'q', title:'Likely IRD under-performance', text:'Where do you want to go next?', options:[
        {label:'Check IRD / IPU', next:'leaf_IRD'}, {label:'Check STS (fans / temperature)', next:'leaf_STS'} ] },
      drying_flow:{ type:'q', title:'Likely airflow / exhaust bottleneck', text:'Recommended to verify STS and Powder (if applicable).', options:[
        {label:'Open STS checklist', next:'leaf_STS'}, {label:'Open Powder checklist', next:'leaf_Powder'} ] },
      coating:{ type:'q', title:'Coating system', text:'Select what to inspect first:', options:[
        {label:'ICS (Inline Coating)',next:'leaf_ICS'},{label:'BCS',next:'leaf_BCS'},{label:'IRD X (Extrusions)',next:'leaf_IRDX'} ] },
      both:{ type:'q', title:'Both samples under-dried — start broad', text:'Pick a starting point:', options:[
        {label:'IRD / IPU',next:'leaf_IRD'},{label:'STS',next:'leaf_STS'},{label:'Powder',next:'leaf_Powder'},
        {label:'ICS',next:'leaf_ICS'},{label:'BCS',next:'leaf_BCS'},{label:'IRD X',next:'leaf_IRDX'} ] },
      leaf_IRD:{type:'leaf',title:'IRD / IPU',subs:['IRD']}, leaf_STS:{type:'leaf',title:'STS',subs:['STS']}, leaf_Powder:{type:'leaf',title:'Powder',subs:['Powder']},
      leaf_ICS:{type:'leaf',title:'ICS',subs:['ICS']}, leaf_BCS:{type:'leaf',title:'BCS',subs:['BCS']}, leaf_IRDX:{type:'leaf',title:'IRD X (Extrusions)',subs:['IRD X']},
      leaf_drying:{type:'leaf',title:'Drying — Checklist',subs:['IRD','STS','Powder']}
    }
  };

  function build(host){
    host.innerHTML='';
    const root=h('div',{id:'fbRoot'});

    // Header
    root.appendChild(h('div',{class:'panel'},[
      h('h2',{text:'Root Cause Analyzer – Fishbone Wizard',style:'margin:0 0 10px'}),
      h('p',{class:'help',text:'Pick an issue → branch through targeted Q&A → run checks → get a smart diagnosis.'})
    ]));

    // Issue selector
    const selector=h('div',{class:'panel',style:'margin-top:10px'},[
      h('h3',{text:'Choose main issue',style:'margin:0 0 10px'}),
      h('div',{class:'issue-grid'},[
        issueCard('SetOff','Drying / Coating','setoff'),
        issueCard('Scratches','Surface / Transport','scratches'),
        issueCard('Uniformity','Bands / Streaks / Mottle','uniformity'),
        issueCard('PQ','Print Quality','pq')
      ])
    ]);
    root.appendChild(selector);

    // Progress + Box (hidden until issue chosen)
    const prog=h('div',{class:'panel',style:'margin-top:10px;display:none'},[
      h('div',{class:'progress'},[
        h('div',{class:'step active',id:'fbSt1'},'Issue'),
        h('div',{class:'step',id:'fbSt2'},'Fishbone'),
        h('div',{class:'step',id:'fbSt3'},'Checks'),
        h('div',{class:'step',id:'fbSt4'},'Diagnosis')
      ])
    ]);
    const fbBox=h('div',{class:'panel',id:'fbBox',style:'margin-top:10px;display:none'});
    const actions=h('div',{class:'inline',style:'gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px;display:none'},[
      h('button',{class:'btn ghost',onclick:()=>init()},'Start over')
    ]);

    root.appendChild(prog); root.appendChild(fbBox); root.appendChild(actions);
    host.appendChild(root);

    let ACTIVE={ issue:'', tree:null, path:[], measures:{} };

    function issueCard(title,sub,code){
      return h('div',{class:'issue-card',onclick:()=>start(code)},[
        h('div',{class:'title',text:title}),
        h('div',{class:'sub',text:sub})
      ]);
    }
    function start(code){
      ACTIVE.issue=code;
      const data = (window.RCA_DATA && window.RCA_DATA[code] && window.RCA_DATA[code].tree) || (code==='setoff'?DEFAULT_SETOFF:null);
      ACTIVE.tree = data;
      if(!ACTIVE.tree){ fbBox.style.display='block'; fbBox.innerHTML = `<div class="help">No decision tree for "${code}" yet — please upload data.</div>`; prog.style.display='block'; actions.style.display='flex'; return; }
      ACTIVE.path=['root']; ACTIVE.measures={};
      selector.style.display='none';
      prog.style.display='block'; fbBox.style.display='block'; actions.style.display='flex';
      renderNode('root');
    }
    function init(){ selector.style.display='block'; prog.style.display='none'; fbBox.style.display='none'; actions.style.display='none'; ACTIVE={issue:'',tree:null,path:[],measures:{}}; }

    function renderNode(id){
      const T = ACTIVE.tree;
      const node = (id==='root')?T.root:T.nodes[id];
      if(!node){ fbBox.innerHTML='<div class="help">Invalid node.</div>'; return; }

      const crumbs = h('div',{class:'crumbs'});
      ACTIVE.path.forEach((pid,i)=>{
        const label = (pid==='root')? 'Start' : (T.nodes[pid]?.title || pid);
        crumbs.appendChild(h('div',{class:'crumb',text:(i===0?'Start: ':'')+label}));
      });

      const body = h('div',{class:'qa'});
      if(node.type==='q'){
        $('#fbSt1').classList.remove('active'); $('#fbSt2').classList.add('active');
        body.appendChild(h('h3',{text:node.title}));
        if(node.text) body.appendChild(h('p',{class:'help',text:node.text}));
        node.options.forEach(opt=>{
          body.appendChild(h('div',{class:'opt',onclick:()=>{ ACTIVE.path.push(opt.next); renderNode(opt.next); }},[
            h('div',{text:opt.label}), h('span',{class:'help',text:'→'})
          ]));
        });
      }
      else if(node.type==='ask'){
        $('#fbSt1').classList.remove('active'); $('#fbSt2').classList.add('active');
        const unit=node.unit||''; const sp = node.specFrom ? globalSpec(node.specFrom) : null;
        body.appendChild(h('h3',{text:node.title})); if(node.text) body.appendChild(h('p',{class:'help',text:node.text}));
        const row=h('div',{class:'ask'}); const inp=h('input',{class:'input v13',placeholder:unit||'Value',style:'max-width:160px'});
        let p=pill(sp?null:null); const bar = sp ? miniBar(sp,null) : null;
        row.appendChild(inp); if(unit) row.appendChild(h('span',{class:'help',text:unit})); if(bar) row.appendChild(bar); row.appendChild(p);
        const nextBtn=h('button',{class:'btn',onclick:()=>{
          const v=inp.value.trim(); ACTIVE.measures[id]=v; const n=Number(v);
          const r=node.routes?.find(r=>{ if(r.when==='<' ) return isFinite(n)&&n< r.value; if(r.when==='<=')return isFinite(n)&&n<=r.value; if(r.when==='>')return isFinite(n)&&n> r.value; if(r.when==='>=')return isFinite(n)&&n>=r.value; if(r.when==='==')return String(v)===String(r.value); return false; }) || node.routes?.slice(-1)[0];
          if(r&&r.next){ ACTIVE.path.push(r.next); renderNode(r.next); }
        }},'Continue');
        inp.addEventListener('input', ()=>{ const ok=sp?withinSpec(inp.value,sp):null; const np=pill(ok); p.replaceWith(np); p=np; if(bar&&bar._place) bar._place(inp.value); });
        body.appendChild(row); body.appendChild(h('div',{class:'inline',style:'justify-content:flex-end;margin-top:8px'},[nextBtn]));
      }
      else if(node.type==='leaf'){
        $('#fbSt2').classList.remove('active'); $('#fbSt3').classList.add('active');
        body.appendChild(h('h3',{text:node.title}));
        body.appendChild(h('p',{class:'help',text:'Tick only what you actually checked. Inputs with SPEC show live status.'}));
        const tabs=h('div',{class:'tabs',id:'fbTabs'}); const content=h('div',{id:'fbLeafContent',style:'margin-top:8px'}); body.appendChild(tabs); body.appendChild(content);

        const subs = (node.subs||[]).filter(n=> getSubNodes(n));
        if(!subs.length){
          content.appendChild(h('div',{class:'panel'},[h('div',{class:'help',text:'No data available yet for this leaf.'})]));
        } else {
          subs.forEach((name,i)=>{ tabs.appendChild(tabChip(name,i===0,()=>show(name))); content.appendChild(buildSubPanel(name,getSubNodes(name))); });
          if(subs.length) show(subs[0]);
        }
        body.appendChild(h('div',{class:'inline',style:'gap:8px;justify-content:flex-end;margin-top:10px'},[
          h('button',{class:'btn',onclick:()=>runDiagnosis(subs)},'Run Diagnosis'),
          h('button',{class:'btn ghost',onclick:()=>init()},'Start over')
        ]));

        function tabChip(label,active,onClick){
          const el=h('div',{class:'chip'+(active?' active':''),onclick:()=>{ $$('#fbTabs .chip',body).forEach(c=>c.classList.remove('active')); el.classList.add('active'); onClick(); }},label);
          return el;
        }
        function show(name){ $$('#fbLeafContent .panel',body).forEach(p=>p.style.display='none'); const el=$(`#fbLeafContent .panel[data-name="${CSS.escape(name)}"]`,body); if(el) el.style.display='block'; }
      }

      fbBox.innerHTML=''; fbBox.appendChild(crumbs); fbBox.appendChild(body);
    }

    function buildSubPanel(name, node){
      const wrap=h('div',{class:'panel','data-name':name}); wrap.appendChild(h('h3',{text:name}));
      const rows = Array.isArray(node?.checks)?node.checks:(Array.isArray(node)?node:[]); const labels = rows.map(r=>r?.label||r?.check||'');
      const allIPU = labels.length && labels.every(s=>/^IPU\s+\d+$/i.test(s)); const allEX = labels.length && labels.every(s=>/^Extrusion\s+\d+$/i.test(s));
      if(allIPU || allEX){
        const grid=h('div',{class:'grid compact'});
        labels.forEach((lab,i)=>{
          const specTok=rows[i]?.spec?.[0]; const spec=parseSpec(specTok);
          const card=h('div',{class:'panel',style:'padding:10px'}); card.appendChild(h('div',{class:'title',text:lab}));
          const line=h('div',{class:'inline',style:'gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap'});
          const cb=h('input',{type:'checkbox'}); const input=h('input',{class:'input v13',placeholder:'Value',style:'max-width:120px',disabled:true});
          const bar=spec?miniBar(spec,null):null; let p=pill(spec?null:null); cb.addEventListener('change',()=>{ input.disabled=!cb.checked; });
          input.addEventListener('input',()=>{ const ok=spec?withinSpec(input.value,spec):null; const np=pill(ok); p.replaceWith(np); p=np; if(bar&&bar._place) bar._place(input.value); });
          line.appendChild(cb); line.appendChild(input); if(bar) line.appendChild(bar); line.appendChild(p); card.appendChild(line); grid.appendChild(card);
        });
        wrap.appendChild(grid); return wrap;
      }
      const box=h('div',{class:'grid cols-1',style:'gap:8px;margin-top:6px'});
      rows.forEach((row,idx)=>{
        const label=(row&&typeof row==='object')?(row.label||row.check||`Check ${idx+1}`):String(row||`Check ${idx+1}`); const unit=row?.unit?String(row.unit):'';
        const specTok=row?.spec?.[0]; const spec=parseSpec(specTok);
        const line=h('div',{class:'inline',style:'gap:8px;align-items:center;flex-wrap:wrap'}); const cb=h('input',{type:'checkbox'});
        const input=h('input',{class:'input v13',placeholder:(unit||'Value'),style:'max-width:160px',disabled:true});
        const bar=spec?miniBar(spec,null):null; let p=pill(spec?null:null); line.appendChild(cb); line.appendChild(h('span',{text:label}));
        const iw=h('div',{class:'inline',style:'gap:6px;align-items:center;flex-wrap:wrap'}); iw.appendChild(input); if(unit) iw.appendChild(h('span',{class:'help',text:unit})); if(bar) iw.appendChild(bar); iw.appendChild(p);
        cb.addEventListener('change',()=>{ input.disabled=!cb.checked; }); input.addEventListener('input',()=>{ const ok=spec?withinSpec(input.value,spec):null; const np=pill(ok); p.replaceWith(np); p=np; if(bar&&bar._place) bar._place(input.value); });
        line.appendChild(iw); box.appendChild(line);
      });
      wrap.appendChild(box); return wrap;
    }

    function runDiagnosis(subs){
      const data=collect(subs||[]); const rep=analyze(data); showDiagnosis(rep); $('#fbSt4').classList.add('active');
    }
    function collect(onlySubs){
      const res={subs:{}, totals:{enabled:0,filled:0,out:0}};
      onlySubs.forEach(name=>{
        const pane=$(`#fbLeafContent .panel[data-name="${CSS.escape(name)}"]`); if(!pane) return; const items=[];
        $$('div.inline',pane).forEach(row=>{
          const cb=$('input[type="checkbox"]',row); const en=!!(cb&&cb.checked);
          const label=row.parentElement.querySelector('.title')?.textContent || row.parentElement.querySelector('span')?.textContent || '';
          const inp=$('input.input.v13',row); const val=inp?inp.value.trim():'';
          const statusEl=$('.pill',row); const status=statusEl?(statusEl.classList.contains('bad')?'out':(statusEl.classList.contains('ok')?'ok':'n/a')):'n/a';
          items.push({label,enabled:en,value:val,status});
        });
        res.subs[name]=items;
      });
      Object.values(res.subs).forEach(items=>{ items.forEach(x=>{ if(x.enabled) res.totals.enabled++; if(x.enabled&&x.value) res.totals.filled++; if(x.enabled&&x.value&&x.status==='out') res.totals.out++; }); });
      return res;
    }
    function analyze(data){
      const summary=[]; const bySub={};
      Object.entries(data.subs).forEach(([name,items])=>{
        const en=items.filter(x=>x.enabled).length; const filled=items.filter(x=>x.enabled&&x.value).length; const out=items.filter(x=>x.enabled&&x.value&&x.status==='out').length;
        bySub[name]={en,filled,out}; if(en) summary.push(`${name}: ${out}/${filled} out-of-spec`);
      });
      const rec=[]; const worst=Object.entries(bySub).sort((a,b)=>b[1].out-a[1].out)[0];
      if(worst){ const k=worst[0].toLowerCase();
        if(k.includes('ird x')) rec.push('Adjust IRD X extrusions to target; verify heat profile & transport speed.');
        if(k.includes('ird'))   rec.push('Verify IRD current calibration and IPU balance; check exhaust flow.');
        if(k.includes('sts'))   rec.push('Check STS fans & temperature sensors; run re-calibration if needed.');
        if(k.includes('powder'))rec.push('Verify powder rate & pump pressure; clean nozzles.');
        if(k.includes('ics')||k.includes('bcs')) rec.push('Check coating viscosity/profile and UV/IR lamp performance.');
        if(k.includes('jetting')) rec.push('Purge/clean heads; verify filtration and nozzle health.');
        if(k.includes('transport')||k.includes('tension')) rec.push('Verify web tension, encoders and roller condition; look for periodic marks.');
      }
      if(data.totals.out===0 && data.totals.filled>0) rec.push('All entered values are within spec. Review media/settings; consider raising throughput.');
      return {summary, totals:data.totals, recommendations:rec};
    }
    function showDiagnosis(rep){
      let back=$('#modalBack'), mod=$('#modal'); if(!back||!mod){ back=h('div',{class:'modal-back',id:'modalBack'}); mod=h('div',{class:'modal',id:'modal'}); back.appendChild(mod); document.body.appendChild(back); }
      mod.innerHTML=''; mod.appendChild(h('div',{class:'title',text:'Diagnosis'})); const body=h('div',{style:'margin-top:12px'}); mod.appendChild(body);
      body.appendChild(h('div',{class:'panel'},[
        h('div',{class:'kv'},[h('span',{class:'k',text:'Summary:'}),h('span',{class:'v',text:rep.summary.join(' | ')||'No checks enabled'})]),
        h('div',{class:'kv'},[h('span',{class:'k',text:'Totals:'}),h('span',{class:'v',text:`Enabled ${rep.totals.enabled}, Filled ${rep.totals.filled}, Out-of-spec ${rep.totals.out}`})])
      ]));
      body.appendChild(h('div',{class:'panel',style:'margin-top:10px'},[
        h('h3',{text:'Recommendations'}),
        rep.recommendations.length ? h('ul',{},rep.recommendations.map(r=>h('li',{text:r}))) : h('div',{class:'help',text:'No specific recommendations.'})
      ]));
      body.appendChild(h('div',{class:'inline',style:'gap:8px;justify-content:flex-end;margin-top:10px'},[
        h('button',{class:'btn primary',onclick:saveAsCase},'Save as Case'),
        h('button',{class:'btn small danger',onclick:()=>{ back.style.display='none'; }},'Close')
      ]));
      back.style.display='flex';
      function saveAsCase(){ try{ if(typeof go==='function') go('create'); setTimeout(()=>{ const issue=$('#issueSummary'), sym=$('#symptoms'), sol=$('#solution'); if(issue) issue.value='RCA – '+(rep.summary.join(' | ')||ACTIVE.issue.toUpperCase()); if(sym) sym.value=(rep.recommendations||[]).map(x=>'• '+x).join('\n'); if(sol) sol.value='Apply top recommendations, re-measure, and re-run RCA.'; if(typeof toast==='function') toast('Diagnosis copied to new case','ok'); },80);}catch(e){} const mb=$('#modalBack'); if(mb) mb.style.display='none'; }
    }
  }

  window.initFishbone = function(){ const page=document.getElementById('page-diagnosis'); if(!page) return; page.innerHTML = '<div id="fbHost"></div>'; build($('#fbHost')); };
  const _go=window.go; if(typeof _go==='function'){ window.go=function(route){ const r=_go.apply(this,arguments); if(route==='diagnosis') setTimeout(window.initFishbone,0); return r; }; }
  document.addEventListener('DOMContentLoaded',()=>{ const pg=document.getElementById('page-diagnosis'); if(pg && !pg.classList.contains('hidden')) window.initFishbone(); });

})();
