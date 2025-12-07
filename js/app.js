// Core app logic: auth, routing, dashboard, create-case, particles, helpers

const AUTH_KEY = "landa_auth_v2";
const CASES_KEY = "landa_cases_v2";

const toastRoot = document.getElementById("toast-root");
function toast(msg, type = "ok") {
  if (!toastRoot) return;
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

// particles background
(function () {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  const stars = Array.from({ length: 160 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.5 + 0.4,
    v: Math.random() * 0.3 + 0.1
  }));
  function draw() {
    ctx.clearRect(0, 0, w, h);
    stars.forEach((s) => {
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.001 * s.v) * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// data: press map (subset – אפשר להרחיב)
const PRESS_MAP = {
  Simplex: {
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
    S35: "Wynalda",
    S08: "ZRP"
  },
  Duplex: {
    D04: "Bluetree",
    D06: "GP",
    D07: "BluePrint",
    D09: "BJU",
    D10: "Virtual",
    D11: "De Jong",
    D12: "MM",
    D13: "Quad",
    D14: "Advantage",
    D15: "BPI",
    D16: "Superior",
    D18: "De Jong",
    D19: "Abeka",
    D20: "MM",
    D21: "M13",
    D22: "Mapprint",
    D23: "Bluetree",
    D24: "NS 40-105",
    D25: "Wirtz",
    D26: "Advantage",
    D27: "Quantum",
    D28: "Publication",
    D29: "Marketing",
    D30: "Neff",
    D31: "Komori",
    D33: "Geiger"
  }
};

// systems hierarchy (דוגמא – אפשר להרחיב)
const SYSTEM_TREE = {
  Feeder: {
    "Sheet Infeed": ["Pickup", "Alignment"],
    Vacuum: ["Pump", "Sensors"]
  },
  "Print Engine": {
    "Ink Delivery": ["Pumps", "Filters"],
    Imaging: ["Drums", "Heads"]
  },
  IRD: {
    "Mass Balance": ["Flow", "Return"],
    Temperature: ["Sensors", "Control"]
  },
  Coater: {
    "Varnish Unit": ["Pump", "Blade"],
    Dryer: ["IR", "Air"]
  }
};

// parts (דוגמא – תוכל להוסיף עוד)
const PARTS_HW = [
  { code: "P-1001", name: "IRD Pump" },
  { code: "P-1002", name: "Feeder Sensor" },
  { code: "P-1003", name: "Ink Temp Sensor" },
  { code: "P-2001", name: "Coater Varnish Pump" }
];

// cases storage
function getCases() {
  try {
    return JSON.parse(localStorage.getItem(CASES_KEY) || "[]");
  } catch (_) {
    return [];
  }
}
function saveCases(arr) {
  localStorage.setItem(CASES_KEY, JSON.stringify(arr));
}
function genId() {
  return "C-" + Date.now().toString(36).toUpperCase();
}

// routing
const pages = ["dashboard", "create", "cases", "rca", "settings"];
function showPage(route) {
  pages.forEach((p) => {
    const el = document.getElementById("page-" + p);
    if (el) el.classList.toggle("hidden", p !== route);
  });
  document.querySelectorAll(".side-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.route === route);
  });

  if (route === "dashboard") {
    renderKPIs();
    renderDashboardLists();
  } else if (route === "cases") {
    window.renderCasesPage && window.renderCasesPage();
  } else if (route === "rca") {
    window.renderRCAPage && window.renderRCAPage();
  }
}

// auth
const loginPage = document.getElementById("loginPage");
const appRoot = document.getElementById("appRoot");
function showApp() {
  loginPage.classList.add("hidden");
  appRoot.classList.remove("hidden");
  showPage("dashboard");
  renderKPIs();
  renderDashboardLists();
}
function showLogin() {
  appRoot.classList.add("hidden");
  loginPage.classList.remove("hidden");
}

function doLogin() {
  const u = document.getElementById("authUser").value.trim();
  const p = document.getElementById("authPass").value.trim();
  if (u === "Expert" && p === "Landa123456") {
    localStorage.setItem(AUTH_KEY, "true");
    toast("Welcome, " + u, "ok");
    showApp();
  } else {
    toast("Invalid credentials", "err");
  }
}

// init events
document.getElementById("btnLogin").addEventListener("click", (e) => {
  e.preventDefault();
  doLogin();
});
["authUser", "authPass"].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      doLogin();
    }
  });
});
document.getElementById("btnLogout").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem(AUTH_KEY);
  toast("Logged out", "ok");
  showLogin();
});

document.querySelectorAll(".side-item,[data-route]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const r = btn.dataset.route;
    if (r) showPage(r);
  });
});

// auto-auth
if (localStorage.getItem(AUTH_KEY) === "true") {
  showApp();
} else {
  showLogin();
}

// KPI & dashboard
function renderKPIs() {
  const arr = getCases();
  const total = arr.length;
  const withFiles = arr.filter((c) => (c.attachments || []).length).length;
  const regions = new Set(arr.map((c) => c.region || "")).size - (arr.some((c) => !c.region) ? 1 : 0);
  const last = arr.length ? new Date(arr[arr.length - 1].createdAt).toLocaleString() : "—";

  const byType = document.getElementById("kpi-total");
  if (byType) byType.textContent = total;
  const f = document.getElementById("kpi-files");
  if (f) f.textContent = withFiles;
  const r = document.getElementById("kpi-regions");
  if (r) r.textContent = Math.max(regions, 0);
  const l = document.getElementById("kpi-last");
  if (l) l.textContent = last || "—";
}

function makePillCloud(rootId, dataMap) {
  const el = document.getElementById(rootId);
  if (!el) return;
  const entries = Object.entries(dataMap).filter(([, v]) => v > 0);
  if (!entries.length) {
    el.innerHTML = '<span class="pill">No data yet</span>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([k, v]) =>
        `<span class="pill">${k}<span style="opacity:.7;margin-left:6px">${v}</span></span>`
    )
    .join("");
}

function renderDashboardLists() {
  const arr = getCases();
  // type
  const byType = {};
  arr.forEach((c) => {
    const t = c.pressType || "Unknown";
    byType[t] = (byType[t] || 0) + 1;
  });
  makePillCloud("dash-type", byType);

  // region
  const byRegion = {};
  arr.forEach((c) => {
    const t = c.region || "Unknown";
    byRegion[t] = (byRegion[t] || 0) + 1;
  });
  makePillCloud("dash-region", byRegion);

  // recent table
  const root = document.getElementById("dash-recent");
  if (!root) return;
  if (!arr.length) {
    root.innerHTML = `<p style="font-size:12px;color:var(--muted)">No cases yet.</p>`;
    return;
  }
  const recent = arr.slice(-6).reverse();
  let html =
    '<div class="table-wrap"><table><thead><tr><th>ID</th><th>Press</th><th>System</th><th>Type</th><th>Title</th></tr></thead><tbody>';
  html += recent
    .map(
      (c) => `<tr>
    <td>${c.id}</td>
    <td>${c.pressName || ""}</td>
    <td>${c.system || ""}</td>
    <td>${c.type || ""}</td>
    <td>${(c.title || "").slice(0, 40)}</td>
  </tr>`
    )
    .join("");
  html += "</tbody></table></div>";
  root.innerHTML = html;
}

// CREATE CASE FORM
(function () {
  const fPressType = document.getElementById("fPressType");
  const fPressName = document.getElementById("fPressName");
  const fSystem = document.getElementById("fSystem");
  const fSubSystem = document.getElementById("fSubSystem");
  const fArea = document.getElementById("fArea");
  const fType = document.getElementById("fType");
  const fPart = document.getElementById("fPart");
  const fRegion = document.getElementById("fRegion");
  const fDate = document.getElementById("fDate");
  const fTitle = document.getElementById("fTitle");
  const fSummary = document.getElementById("fSummary");
  const fResolution = document.getElementById("fResolution");
  const fFiles = document.getElementById("fFiles");
  const filesList = document.getElementById("filesList");
  const stepsWrap = document.getElementById("stepsWrap");
  const btnAddStep = document.getElementById("btnAddStep");
  const form = document.getElementById("caseForm");
  if (!form) return;

  // default date = today
  fDate.value = new Date().toISOString().slice(0, 10);

  function populatePressNames() {
    fPressName.innerHTML = "";
    const type = fPressType.value;
    if (!type || !PRESS_MAP[type]) {
      const opt = document.createElement("option");
      opt.textContent = "Select press type first…";
      opt.value = "";
      fPressName.appendChild(opt);
      return;
    }
    const map = PRESS_MAP[type];
    Object.keys(map).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${code} – ${map[code]}`;
      fPressName.appendChild(opt);
    });
  }

  function populateSystems() {
    fSystem.innerHTML = '<option value="">Select…</option>';
    Object.keys(SYSTEM_TREE).forEach((sys) => {
      const o = document.createElement("option");
      o.value = sys;
      o.textContent = sys;
      fSystem.appendChild(o);
    });
  }
  function populateSubSystems() {
    fSubSystem.innerHTML = '<option value="">Select…</option>';
    fArea.innerHTML = '<option value="">Select subsystem first…</option>';
    const sys = fSystem.value;
    if (!sys || !SYSTEM_TREE[sys]) return;
    Object.keys(SYSTEM_TREE[sys]).forEach((sub) => {
      const o = document.createElement("option");
      o.value = sub;
      o.textContent = sub;
      fSubSystem.appendChild(o);
    });
  }
  function populateAreas() {
    fArea.innerHTML = '<option value="">Select…</option>';
    const sys = fSystem.value;
    const sub = fSubSystem.value;
    if (!sys || !sub || !SYSTEM_TREE[sys] || !SYSTEM_TREE[sys][sub]) return;
    SYSTEM_TREE[sys][sub].forEach((a) => {
      const o = document.createElement("option");
      o.value = a;
      o.textContent = a;
      fArea.appendChild(o);
    });
  }
  function populateParts() {
    fPart.innerHTML = "";
    if (fType.value !== "HW") return;
    PARTS_HW.forEach((p) => {
      const o = document.createElement("option");
      o.value = p.code;
      o.textContent = `${p.code} – ${p.name}`;
      fPart.appendChild(o);
    });
  }

  fPressType.addEventListener("change", populatePressNames);
  fSystem.addEventListener("change", () => {
    populateSubSystems();
    populateAreas();
  });
  fSubSystem.addEventListener("change", populateAreas);
  fType.addEventListener("change", populateParts);

  populatePressNames();
  populateSystems();

  // attachments
  fFiles.addEventListener("change", () => {
    filesList.innerHTML = "";
    Array.from(fFiles.files || []).forEach((file, idx) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>${file.name}</span><button type="button" data-i="${idx}">×</button>`;
      filesList.appendChild(chip);
    });
  });
  filesList.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    const i = +e.target.dataset.i;
    const files = Array.from(fFiles.files);
    files.splice(i, 1);
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    fFiles.files = dt.files;
    fFiles.dispatchEvent(new Event("change"));
  });

  // troubleshooting steps
  function addStep(initial = "") {
    const idx = stepsWrap.children.length + 1;
    const wrapper = document.createElement("div");
    wrapper.className = "step-chip";
    wrapper.innerHTML = `
      <span>Step ${idx}</span>
      <textarea rows="2" class="input">${initial}</textarea>
      <button type="button" class="btn ghost small">×</button>
    `;
    stepsWrap.appendChild(wrapper);
  }
  btnAddStep.addEventListener("click", () => addStep());
  stepsWrap.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    e.target.parentElement.remove();
  });

  // submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!fTitle.value.trim()) {
      toast("Please enter case title", "err");
      return;
    }
    const cases = getCases();
    const attachments = Array.from(fFiles.files || []).map((f) => ({
      name: f.name,
      size: f.size
    }));
    const steps = Array.from(stepsWrap.querySelectorAll("textarea"))
      .map((t) => t.value.trim())
      .filter(Boolean);

    const payload = {
      id: genId(),
      pressType: fPressType.value || "",
      pressName: fPressName.value
        ? `${fPressName.value} – ${(PRESS_MAP[fPressType.value] || {})[fPressName.value] || ""}`
        : "",
      region: fRegion.value || "",
      system: fSystem.value || "",
      subSystem: fSubSystem.value || "",
      area: fArea.value || "",
      type: fType.value || "",
      part: fType.value === "HW" ? fPart.value || "" : "",
      date: fDate.value || "",
      title: fTitle.value || "",
      summary: fSummary.value || "",
      resolution: fResolution.value || "",
      steps,
      attachments,
      createdAt: new Date().toISOString()
    };

    cases.push(payload);
    saveCases(cases);
    toast("Case saved", "ok");
    form.reset();
    stepsWrap.innerHTML = "";
    filesList.innerHTML = "";
    populatePressNames();
    populateSystems();
    fDate.value = new Date().toISOString().slice(0, 10);
    renderKPIs();
    renderDashboardLists();
  });
})();
