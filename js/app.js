/* ============================================================
    LANDA TROUBLESHOOT CONSOLE – CORE APPLICATION ENGINE (V2)
    Handles:
    - Authentication
    - Routing
    - Page Loading
    - Case Storage
    - Global UI Functions
===============================================================*/

/* -------------------------
   GLOBAL STORAGE KEYS
--------------------------*/
const AUTH_KEY = "landaAuth";
const CASES_KEY = "landaCases";


/* -------------------------
   ELEMENT REFERENCES
--------------------------*/
const loginPage = document.getElementById("loginPage");
const appRoot = document.getElementById("appRoot");
const mainView = document.getElementById("mainView");



/* ============================================================
    AUTHENTICATION
===============================================================*/

function showLogin() {
    loginPage.classList.remove("hidden");
    appRoot.classList.add("hidden");
}

function showApp() {
    loginPage.classList.add("hidden");
    appRoot.classList.remove("hidden");
    go("dashboard");
}


/* Perform Login */
function doLogin() {
    const u = document.getElementById("authUser").value.trim();
    const p = document.getElementById("authPass").value.trim();

    if (u === "Expert" && p === "Landa123456") {
        localStorage.setItem(AUTH_KEY, "true");
        showApp();
    } else {
        alert("Invalid username or password.");
    }
}

/* Enable ENTER key */
["authUser", "authPass"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keydown", ev => {
        if (ev.key === "Enter") doLogin();
    });
});

/* Login Button */
document.getElementById("btnLogin").addEventListener("click", doLogin);

/* Logout Button */
document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem(AUTH_KEY);
    showLogin();
});


/* Auto-login if session exists */
if (localStorage.getItem(AUTH_KEY) === "true") {
    showApp();
} else {
    showLogin();
}



/* ============================================================
    SIMPLE ROUTER
===============================================================*/

function go(page) {
    loadPage(page);
}

function loadPage(page) {
    mainView.innerHTML = `<h2>Loading ${page}...</h2>`;

    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => {
            mainView.innerHTML = html;

            // Trigger page-specific JS
            if (page === "dashboard") initDashboard();
            if (page === "cases") initCreateCase();
            if (page === "allcases") initAllCases();
            if (page === "rca") initRCA();
            if (page === "settings") initSettings();
        })
        .catch(() => {
            mainView.innerHTML = `<h2 style="color:#ff6b6b;">Error loading ${page}.html</h2>`;
        });
}



/* ============================================================
    CASE STORAGE ENGINE
===============================================================*/

function getCases() {
    return JSON.parse(localStorage.getItem(CASES_KEY) || "[]");
}

function saveCase(caseObj) {
    const arr = getCases();
    arr.push(caseObj);
    localStorage.setItem(CASES_KEY, JSON.stringify(arr));
}

function updateCase(index, newData) {
    const arr = getCases();
    arr[index] = newData;
    localStorage.setItem(CASES_KEY, JSON.stringify(arr));
}



/* ============================================================
    DASHBOARD PAGE
===============================================================*/
function initDashboard() {

    const arr = getCases();

    const totalEl = document.getElementById("kpiTotalCases");
    const regionEl = document.getElementById("kpiRegions");
    const pressEl = document.getElementById("kpiPressTypes");

    if (totalEl) totalEl.textContent = arr.length;

    if (regionEl) {
        const regions = new Set(arr.map(c => c.region || "N/A"));
        regionEl.textContent = regions.size;
    }

    if (pressEl) {
        const types = new Set(arr.map(c => c.pressType || "N/A"));
        pressEl.textContent = types.size;
    }
}



/* ============================================================
    CREATE CASE PAGE
===============================================================*/
function initCreateCase() {

    const btn = document.getElementById("btnSaveCase");
    if (!btn) return;

    btn.onclick = () => {
        const caseObj = {
            title: document.getElementById("caseTitle")?.value || "",
            pressType: document.getElementById("pressType")?.value || "",
            pressName: document.getElementById("pressName")?.value || "",
            system: document.getElementById("system_select")?.value || "",
            date: new Date().toISOString(),
            attachments: [],
            troubleshooting: []
        };

        saveCase(caseObj);
        alert("Case saved successfully!");
        go("allcases");
    };
}



/* ============================================================
    ALL CASES PAGE
===============================================================*/
function initAllCases() {
    const arr = getCases();
    const list = document.getElementById("casesTableBody");

    if (!list) return;

    list.innerHTML = "";

    arr.forEach((c, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${c.title || "-"}</td>
            <td>${c.pressType || "-"}</td>
            <td>${c.pressName || "-"}</td>
            <td>${new Date(c.date).toLocaleString()}</td>
            <td><button onclick="viewCase(${i})" class="table-btn">View</button></td>
        `;
        list.appendChild(row);
    });
}

function viewCase(index) {
    const arr = getCases();
    const c = arr[index];

    alert(
        `CASE DETAILS:\n\n` +
        `Title: ${c.title}\n` +
        `Press: ${c.pressType} – ${c.pressName}\n` +
        `System: ${c.system}\n` +
        `Date: ${new Date(c.date).toLocaleString()}`
    );
}



/* ============================================================
    RCA PAGE (placeholder, real engine coming)
===============================================================*/
function initRCA() {
    mainView.innerHTML += `<p style="opacity:0.7;margin-top:10px;">RCA Wizard coming fully loaded next.</p>`;
}



/* ============================================================
    SETTINGS PAGE
===============================================================*/
function initSettings() {
    mainView.innerHTML += `<p style="opacity:0.7;margin-top:10px;">Settings panel coming next.</p>`;
}
