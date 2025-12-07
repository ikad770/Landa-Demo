// All cases page + modal view

(function () {
  if (window.__LANDA_CASES__) return;
  window.__LANDA_CASES__ = true;

  function esc(s) {
    return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function openModal(caseObj) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";

    const attachHtml = (caseObj.attachments || [])
      .map((a) => `<li>${esc(a.name)} (${a.size || 0} bytes)</li>`)
      .join("");

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:600">Case ${esc(caseObj.id)}</div>
          <div style="font-size:11px;color:var(--muted)">${esc(caseObj.pressName || "")}</div>
        </div>
        <button class="btn small ghost" type="button" id="modalClose">Close</button>
      </div>

      <div class="grid grid-3" style="margin-bottom:8px">
        <div class="field"><label>Press Type</label><div>${esc(caseObj.pressType || "")}</div></div>
        <div class="field"><label>Region</label><div>${esc(caseObj.region || "")}</div></div>
        <div class="field"><label>Date</label><div>${esc(caseObj.date || "")}</div></div>
        <div class="field"><label>System</label><div>${esc(caseObj.system || "")}</div></div>
        <div class="field"><label>Sub System</label><div>${esc(caseObj.subSystem || "")}</div></div>
        <div class="field"><label>Area</label><div>${esc(caseObj.area || "")}</div></div>
        <div class="field"><label>Type</label><div>${esc(caseObj.type || "")}</div></div>
        <div class="field"><label>Part</label><div>${esc(caseObj.part || "")}</div></div>
      </div>

      <div class="field">
        <label>Title</label>
        <div style="font-size:12px">${esc(caseObj.title || "")}</div>
      </div>

      <div class="field">
        <label>Summary</label>
        <div style="font-size:12px;white-space:pre-wrap">${esc(caseObj.summary || "")}</div>
      </div>

      <div class="field">
        <label>Resolution</label>
        <div style="font-size:12px;white-space:pre-wrap">${esc(caseObj.resolution || "")}</div>
      </div>

      <div class="field">
        <label>Troubleshooting Steps</label>
        <ul style="font-size:12px;margin-left:16px">
          ${(caseObj.steps || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>None</li>"}
        </ul>
      </div>

      <div class="field">
        <label>Attachments</label>
        <ul style="font-size:12px;margin-left:16px">
          ${attachHtml || "<li>None</li>"}
        </ul>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.id === "modalClose") {
        backdrop.remove();
      }
    });
  }

  function getCases() {
    try {
      return JSON.parse(localStorage.getItem("landa_cases_v2") || "[]");
    } catch (_) {
      return [];
    }
  }

  function renderCasesPage() {
    const wrap = document.getElementById("casesTableWrap");
    const cnt = document.getElementById("casesCount");
    if (!wrap) return;

    const arr = getCases();
    if (cnt) cnt.textContent = String(arr.length);

    if (!arr.length) {
      wrap.innerHTML = `<p style="font-size:12px;color:var(--muted)">No cases yet.</p>`;
      return;
    }

    let html =
      '<div class="table-wrap"><table><thead><tr><th>#</th><th>Case Title</th><th>Press</th><th>Region</th><th>Date</th><th></th></tr></thead><tbody>';
    html += arr
      .map(
        (c, i) => `<tr data-id="${esc(c.id)}">
      <td>${i + 1}</td>
      <td>${esc(c.title || "")}</td>
      <td>${esc(c.pressName || "")}</td>
      <td>${esc(c.region || "")}</td>
      <td>${esc(c.date || "")}</td>
      <td><button type="button" class="btn-table">View</button></td>
    </tr>`
      )
      .join("");
    html += "</tbody></table></div>";
    wrap.innerHTML = html;

    wrap.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON" || e.target.tagName === "TD") {
          const id = tr.getAttribute("data-id");
          const obj = getCases().find((c) => c.id === id);
          if (obj) openModal(obj);
        }
      });
    });
  }

  window.renderCasesPage = renderCasesPage;
})();
