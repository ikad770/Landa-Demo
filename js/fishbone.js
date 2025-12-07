// Very light RCA renderer – uses RCA_DATA[issueKey]

(function () {
  if (window.__LANDA_FISHBONE__) return;
  window.__LANDA_FISHBONE__ = true;

  const h = (t, a = {}, c = []) => {
    const e = document.createElement(t);
    for (const [k, v] of Object.entries(a)) {
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on") && typeof v === "function")
        e.addEventListener(k.substring(2), v);
      else e.setAttribute(k, v);
    }
    (Array.isArray(c) ? c : [c]).forEach((n) => {
      if (n == null) return;
      if (typeof n === "string") e.appendChild(document.createTextNode(n));
      else e.appendChild(n);
    });
    return e;
  };

  function renderFishbone(root, issueKey) {
    root.innerHTML = "";
    const data = (window.RCA_DATA || {})[issueKey || "SetOff"];
    if (!data) {
      root.textContent = "No RCA data configured.";
      return;
    }

    let path = [];
    let current = data;

    const elProgress = h("div", { class: "progress" });
    const elCrumbs = h("div", { class: "crumbs" });
    const elQA = h("div", { class: "qa" });
    const elResult = h("div", { class: "panel-lite" });

    function updateProgress() {
      elProgress.innerHTML = "";
      data.steps.forEach((s, i) => {
        elProgress.appendChild(
          h("div", { class: "step" + (i < path.length ? " active" : ""), text: `${i + 1}. ${s}` })
        );
      });
    }

    function updateCrumbs() {
      elCrumbs.innerHTML = "";
      path.forEach((p) => elCrumbs.appendChild(h("span", { class: "crumb", text: p.label })));
    }

    function updateQA() {
      elQA.innerHTML = "";
      if (current.question) {
        elQA.appendChild(h("div", { class: "q", text: current.question }));
      }
      if (current.options) {
        current.options.forEach((opt) => {
          elQA.appendChild(
            h(
              "button",
              {
                class: "opt",
                onclick: () => {
                  path.push({ label: opt.label });
                  if (opt.next) current = opt.next;
                  updateProgress();
                  updateCrumbs();
                  updateQA();
                }
              },
              [
                h("span", { text: opt.label }),
                opt.weight
                  ? h("span", {
                      style: "font-size:11px;color:var(--muted)",
                      text: opt.weight + "★"
                    })
                  : null
              ]
            )
          );
        });
      }
      if (current.result) {
        elResult.innerHTML = "";
        elResult.appendChild(
          h("h4", { text: current.result.title || "Recommended actions" })
        );
        elResult.appendChild(
          h("p", { text: current.result.description || "" })
        );
        if (current.result.checklist) {
          const ul = h("ul");
          current.result.checklist.forEach((item) =>
            ul.appendChild(h("li", { text: item }))
          );
          elResult.appendChild(ul);
        }
      } else {
        elResult.innerHTML = "";
      }
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
