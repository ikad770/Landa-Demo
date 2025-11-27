// js/rca.js
// Root Cause Analyzer – IRD Wizard (SetOff) – Modal Experience

(function(){
  const ISSUE_SET_OFF = "SetOff";
  const BRANCH_IRD = "IRD";

  // --- IRD steps (POC based on your Visio – qualitative, not numeric enforcing yet) ---
  // אפשר להרחיב בהמשך לשאר המערכות לפי אותו פורמט
  const IRD_STEPS = [
    {
      id: "intro",
      kind: "info",
      title: "IRD Diagnostic Flow",
      sub: "We’ll guide you through a short IRD checklist to better understand the SetOff condition.",
      note: "Answer based on the current job and real machine readings. You can always go back or restart."
    },
    {
      id: "station",
      kind: "choice",
      title: "Which IRD / IPU section is relevant?",
      sub: "Choose the main IRD/IPU zone where the defect is most visible.",
      choices: [
        { id: "IRD1", label: "IRD 1 / IPU 1" },
        { id: "IRD2", label: "IRD 2 / IPU 2" },
        { id: "IRD3", label: "IRD 3 / IPU 3" },
        { id: "IRD4", label: "IRD 4 / IPU 4" },
        { id: "IRD5", label: "IRD 5 / IPU 5" },
        { id: "IRD6", label: "IRD 6 / IPU 6" },
        { id: "IRD7", label: "IRD 7 / IPU 7" }
      ],
      note: "If the issue is spread across several IRD zones, start with the dominant one."
    },
    {
      id: "vacuum",
      kind: "range",
      title: "Vacuum / Pressure check",
      sub: "Enter the measured values for the selected IRD / IPU section.",
      fields: [
        {
          id: "vacuumLevel",
          label: "IRD vacuum level",
          unit: "mbar",
          hint: "Use the service tool / HMI vacuum reading.",
          specText: "Target vacuum should be within the recommended IRD range for this press."
        },
        {
          id: "ipuPressure",
          label: "IPU air pressure",
          unit: "bar",
          hint: "Measured on the relevant IPU gauge / sensor.",
          specText: "Compare with the spec value in the SetOff checklist."
        }
      ],
      note: "We’re not enforcing numeric specs here yet – the goal is to capture what you actually see."
    },
    {
      id: "temp",
      kind: "range",
      title: "Blanket / IRD temperature",
      sub: "Capture the key temperatures related to the IRD drying efficiency.",
      fields: [
        {
          id: "blanketTemp",
          label: "Blanket surface temperature",
          unit: "°C",
          hint: "Use the diagnostic or thermal camera if available.",
          specText: "Check against the recommended blanket temperature window."
        },
        {
          id: "irdBodyTemp",
          label: "IRD housing / body temperature",
          unit: "°C",
          hint: "Approximate reading or diagnostic sensor value.",
          specText: "Large deviations may indicate cooling / airflow issues."
        }
      ],
      note: "Extreme low temps usually mean under-drying; too high may trigger other quality issues."
    },
    {
      id: "slits",
      kind: "boolean",
      title: "IR slits & calibration",
      sub: "Confirm that the IRD slits and calibration are in a healthy state.",
      question: "Is the IRD slits calibration and mechanical condition verified?",
      yesLabel: "Yes – verified / calibrated",
      noLabel: "No – not verified / suspect issue",
      note: "If you’re not sure, treat it as “Not verified” and plan a calibration/inspection."
    },
    {
      id: "flow",
      kind: "boolean",
      title: "Airflow & extraction",
      sub: "SetOff is highly sensitive to air movement and extraction above the sheet.",
      question: "Is the IRD airflow / extraction behaving as expected?",
      yesLabel: "Yes – airflow looks correct",
      noLabel: "No – airflow / extraction is suspect",
      note: "Listen to fans, check filters, and verify ducts are not blocked."
    },
    {
      id: "summary",
      kind: "summary",
      title: "IRD summary & guidance",
      sub: "Review the collected information and suggested focus areas."
    }
  ];

  const state = {
    activeIssue: ISSUE_SET_OFF,
    branch: BRANCH_IRD,
    currentIndex: 0,
    answers: {}
  };

  let backdrop, modal, bodyEl, progressBar, footerHint;

  // --- DOM helpers ---
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function createModalDOM(){
    if(qs(".rca-backdrop")) return;

    backdrop = document.createElement("div");
    backdrop.className = "rca-backdrop";
    backdrop.innerHTML = `
      <div class="rca-modal" role="dialog" aria-modal="true" aria-label="Root Cause Analyzer – IRD">
        <div class="rca-modal-header">
          <div class="rca-modal-title-wrap">
            <div class="rca-modal-title">Root Cause Analyzer</div>
            <div class="rca-modal-sub">Issue: <span id="rcaIssueLabel">${ISSUE_SET_OFF}</span> · Branch: <span id="rcaBranchLabel">${BRANCH_IRD}</span></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="rca-chip">Interactive IRD Wizard</div>
            <button class="btn small danger" type="button" id="rcaCloseBtn">Close</button>
          </div>
        </div>
        <div class="rca-progress">
          <div class="rca-progress-bar" id="rcaProgressBar"></div>
        </div>
        <div class="rca-modal-body">
          <div id="rcaStepHost"></div>
        </div>
        <div class="rca-modal-footer">
          <div class="rca-footer-left">
            <button class="btn small" type="button" id="rcaBackBtn">← Back</button>
            <button class="btn small ghost" type="button" id="rcaRestartBtn">Restart</button>
          </div>
          <div class="rca-footer-right">
            <span class="rca-footer-hint" id="rcaFooterHint">You can move back anytime – nothing is lost.</span>
            <button class="btn small primary" type="button" id="rcaNextBtn">Next</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    modal = qs(".rca-modal", backdrop);
    bodyEl = qs("#rcaStepHost", backdrop);
    progressBar = qs("#rcaProgressBar", backdrop);
    footerHint = qs("#rcaFooterHint", backdrop);

    qs("#rcaCloseBtn", backdrop).addEventListener("click", closeWizard);
    qs("#rcaBackBtn", backdrop).addEventListener("click", goBack);
    qs("#rcaRestartBtn", backdrop).addEventListener("click", restartWizard);
    qs("#rcaNextBtn", backdrop).addEventListener("click", handleNext);

    backdrop.addEventListener("click", (e)=>{
      if(e.target === backdrop){ closeWizard(); }
    });

    document.addEventListener("keydown", (e)=>{
      if(!document.body.classList.contains("rca-open")) return;
      if(e.key === "Escape"){ closeWizard(); }
    });
  }

  function openWizard(){
    if(!backdrop) createModalDOM();
    state.currentIndex = 0;
    state.answers = {};
    renderStep();
    document.body.classList.add("rca-open");
  }

  function closeWizard(){
    document.body.classList.remove("rca-open");
  }

  function restartWizard(){
    state.currentIndex = 0;
    state.answers = {};
    renderStep();
    footerHint.textContent = "Wizard restarted – start again from the top.";
  }

  function goBack(){
    if(state.currentIndex === 0) return;
    state.currentIndex -= 1;
    renderStep();
    footerHint.textContent = "You moved back – you can adjust any answer.";
  }

  function handleNext(){
    const step = IRD_STEPS[state.currentIndex];
    // Save current step values into state.answers
    persistFromUI(step);

    if(step.kind === "summary"){
      closeWizard();
      return;
    }

    state.currentIndex = Math.min(state.currentIndex + 1, IRD_STEPS.length - 1);
    renderStep();
  }

  function persistFromUI(step){
    if(!step) return;
    const store = state.answers;

    if(step.kind === "choice"){
      const active = qs(".rca-pill.active", bodyEl);
      if(active){
        store[step.id] = { choiceId: active.dataset.id, label: active.textContent.trim() };
      }
    } else if(step.kind === "range"){
      const res = {};
      step.fields.forEach(f=>{
        const inp = qs(`.rca-input[data-id="${f.id}"]`, bodyEl);
        const status = qs(`.rca-pill[data-status][data-id="${f.id}"].active`, bodyEl);
        res[f.id] = {
          value: inp && inp.value ? inp.value.trim() : "",
          status: status ? status.dataset.status : "unknown"
        };
      });
      store[step.id] = res;
    } else if(step.kind === "boolean"){
      const active = qs(".rca-pill.active", bodyEl);
      if(active){
        store[step.id] = { value: active.dataset.value === "yes" ? true : false };
      }
    }
  }

  function renderStep(){
    const step = IRD_STEPS[state.currentIndex];
    if(!step || !bodyEl) return;

    const total = IRD_STEPS.length;
    const ratio = total > 1 ? (state.currentIndex) / (total - 1) : 0;
    if(progressBar){
      progressBar.style.transform = `scaleX(${0.12 + ratio * 0.88})`;
    }

    let html = `<div class="rca-step">`;

    html += `<div class="rca-step-title">${step.title}</div>`;
    if(step.sub){
      html += `<div class="rca-step-sub">${step.sub}</div>`;
    }

    if(step.kind === "info"){
      html += `
        <div class="rca-summary-card" style="margin-top:8px">
          <p class="rca-summary-bullet">
            • This flow is focused on the IRD part of the SetOff problem.<br>
            • We will capture vacuum, temperature, calibration and airflow indications.<br>
            • At the end you’ll get a concise summary of where to focus.
          </p>
        </div>
      `;
    }

    if(step.kind === "choice"){
      html += `<div class="rca-pill-row">`;
      const saved = state.answers[step.id];
      const currentChoiceId = saved && saved.choiceId;
      step.choices.forEach(ch=>{
        const isActive = currentChoiceId === ch.id;
        html += `
          <button type="button" class="rca-pill${isActive ? " active":""}" data-id="${ch.id}">
            ${ch.label}
          </button>
        `;
      });
      html += `</div>`;
    }

    if(step.kind === "range"){
      html += `<div class="rca-field-group">`;
      const saved = state.answers[step.id] || {};
      step.fields.forEach(f=>{
        const prev = saved[f.id] || {};
        html += `
          <div class="rca-field">
            <label>${f.label}</label>
            <input type="number" step="any" class="rca-input" data-id="${f.id}" value="${prev.value || ""}">
            <span class="rca-unit">${f.unit||""}</span>
            <div class="rca-toggle-row">
              <button type="button" class="rca-pill rca-pill-status ${prev.status==="ok"?"active":""}" data-id="${f.id}" data-status="ok">Within spec</button>
              <button type="button" class="rca-pill rca-pill-status ${prev.status==="warn"?"active":""}" data-id="${f.id}" data-status="warn">Borderline</button>
              <button type="button" class="rca-pill rca-pill-status ${prev.status==="bad"?"active":""}" data-id="${f.id}" data-status="bad">Out of spec</button>
            </div>
          </div>
          <div class="rca-note">${f.hint || ""}${f.specText ? "<br><b>Spec:</b> " + f.specText : ""}</div>
        `;
      });
      html += `</div>`;
    }

    if(step.kind === "boolean"){
      const saved = state.answers[step.id] || {};
      const val = typeof saved.value === "boolean" ? saved.value : null;
      html += `
        <div class="rca-pill-row">
          <button type="button" class="rca-pill ${val===true?"active":""}" data-value="yes">${step.yesLabel || "Yes"}</button>
          <button type="button" class="rca-pill ${val===false?"active":""}" data-value="no">${step.noLabel || "No"}</button>
        </div>
      `;
      if(step.note){
        html += `<div class="rca-note">${step.note}</div>`;
      }
    }

    if(step.kind === "summary"){
      const summary = buildSummary();
      html += `
        <div class="rca-summary-grid">
          ${summary.blocks.join("")}
        </div>
        <div class="rca-note" style="margin-top:10px">${summary.hint}</div>
      `;
      if(footerHint){
        footerHint.textContent = "Review the summary. Close the wizard when you’re done.";
      }
    }else if(step.note && step.kind !== "boolean" && step.kind !== "range"){
      html += `<div class="rca-note">${step.note}</div>`;
    }

    html += `</div>`;
    bodyEl.innerHTML = html;

    // interactions inside this step
    if(step.kind === "choice"){
      qsa(".rca-pill", bodyEl).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          qsa(".rca-pill", bodyEl).forEach(b=>b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
      footerHint.textContent = "Pick the dominant IRD / IPU zone involved in the SetOff.";
    }

    if(step.kind === "range"){
      qsa(".rca-pill-status", bodyEl).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const id = btn.dataset.id;
          qsa(`.rca-pill-status[data-id="${id}"]`, bodyEl).forEach(b=>b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
      footerHint.textContent = "Fill the readings as measured – then tag them as within spec / borderline / out of spec.";
    }

    if(step.kind === "boolean"){
      qsa(".rca-pill", bodyEl).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          qsa(".rca-pill", bodyEl).forEach(b=>b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
      footerHint.textContent = "Mark the most honest answer – this is for diagnosis, not for auditing.";
    }

    if(step.kind === "info"){
      footerHint.textContent = "When you’re ready, move to the next step to start the IRD guided flow.";
    }
  }

  function buildSummary(){
    const ans = state.answers;
    const blocks = [];
    let focusZones = [];
    let airflowSuspect = false;
    let calibrationSuspect = false;

    // Station
    if(ans.station && ans.station.label){
      blocks.push(`
        <div class="rca-summary-card">
          <h4>Focus zone</h4>
          <p class="rca-summary-bullet">Selected IRD / IPU: <b>${ans.station.label}</b></p>
        </div>
      `);
      focusZones.push(ans.station.label);
    }

    // Vacuum / pressure
    if(ans.vacuum){
      const v = ans.vacuum;
      const anyBad = Object.values(v).some(x=>x.status === "bad");
      const anyWarn = Object.values(v).some(x=>x.status === "warn");
      let badgeClass = "rca-badge-ok";
      let badgeLabel = "Looks within spec";
      if(anyBad){ badgeClass="rca-badge-bad"; badgeLabel="Out of spec"; }
      else if(anyWarn){ badgeClass="rca-badge-warn"; badgeLabel="Borderline"; }

      const items = Object.entries(v)
        .filter(([_,obj])=>obj.value)
        .map(([key,obj])=>`• ${key}: ${obj.value} (${obj.status||"unknown"})`)
        .join("<br>");

      blocks.push(`
        <div class="rca-summary-card">
          <h4>Vacuum / pressure</h4>
          <p><span class="rca-badge-status ${badgeClass}">${badgeLabel}</span></p>
          <p class="rca-summary-bullet">${items || "No values entered."}</p>
        </div>
      `);
    }

    // Temperature
    if(ans.temp){
      const t = ans.temp;
      const anyBad = Object.values(t).some(x=>x.status === "bad");
      const anyWarn = Object.values(t).some(x=>x.status === "warn");
      let badgeClass = "rca-badge-ok";
      let badgeLabel = "Within window";
      if(anyBad){ badgeClass="rca-badge-bad"; badgeLabel="Out of window"; }
      else if(anyWarn){ badgeClass="rca-badge-warn"; badgeLabel="Borderline"; }

      const items = Object.entries(t)
        .filter(([_,obj])=>obj.value)
        .map(([key,obj])=>`• ${key}: ${obj.value} (${obj.status||"unknown"})`)
        .join("<br>");

      blocks.push(`
        <div class="rca-summary-card">
          <h4>Temperature</h4>
          <p><span class="rca-badge-status ${badgeClass}">${badgeLabel}</span></p>
          <p class="rca-summary-bullet">${items || "No values entered."}</p>
        </div>
      `);
    }

    // Slits calibration
    if(typeof (ans.slits && ans.slits.value) === "boolean"){
      calibrationSuspect = ans.slits.value === false;
      blocks.push(`
        <div class="rca-summary-card">
          <h4>Slits / calibration</h4>
          <p class="rca-summary-bullet">${
            ans.slits.value
              ? "Slits and calibration were reported as verified."
              : "Slits / calibration were NOT verified – plan inspection / calibration."
          }</p>
        </div>
      `);
    }

    // Airflow
    if(typeof (ans.flow && ans.flow.value) === "boolean"){
      airflowSuspect = ans.flow.value === false;
      blocks.push(`
        <div class="rca-summary-card">
          <h4>Airflow / extraction</h4>
          <p class="rca-summary-bullet">${
            ans.flow.value
              ? "Airflow / extraction reported as behaving correctly."
              : "Airflow / extraction reported as suspect – verify fans, filters and ducts."
          }</p>
        </div>
      `);
    }

    let hint = "Use this summary as a starting point for deeper troubleshooting.";
    const reasons = [];
    if(airflowSuspect) reasons.push("airflow / extraction");
    if(calibrationSuspect) reasons.push("IR slits calibration / mechanics");
    if(ans.vacuum && Object.values(ans.vacuum).some(x=>x.status === "bad")) reasons.push("vacuum / pressure regulation");
    if(ans.temp && Object.values(ans.temp).some(x=>x.status === "bad")) reasons.push("temperature / heating balance");

    if(reasons.length){
      hint = "Main suspected contributors: " + reasons.join(", ") + ".";
    }

    return { blocks, hint };
  }

  function injectLauncher(){
    const diagPage = document.getElementById("page-diagnosis");
    if(!diagPage) return;
    if(qs("#rcaLaunchPanel", diagPage)) return;

    const panel = document.createElement("div");
    panel.className = "panel rca-launch-panel";
    panel.id = "rcaLaunchPanel";
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div class="title">Root Cause Analyzer – SetOff / IRD</div>
          <div class="help">
            Start an interactive IRD-focused questionnaire to quickly narrow down SetOff-related root causes.
          </div>
        </div>
        <button class="btn primary small" type="button" id="rcaLaunchBtn">Open IRD Wizard</button>
      </div>
    `;
    diagPage.prepend(panel);

    qs("#rcaLaunchBtn", panel).addEventListener("click", ()=>{
      state.activeIssue = ISSUE_SET_OFF;
      state.branch = BRANCH_IRD;
      openWizard();
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    injectLauncher();
    createModalDOM();
  });
})();
