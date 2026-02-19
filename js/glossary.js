/************************************************************
 * glossary.js
 * 班级辞典页面
 ************************************************************/

const container = document.getElementById("glossary-list");
let glossaryList = [];

/* ===============================
   加载数据
   =============================== */
const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => loadAllGlossary())
  .then(list => {
    glossaryList = list;
    renderGlossary();
  });

/* ===============================
   渲染列表
   =============================== */
function renderGlossary(sortKey = "since", sortOrder = "asc") {
  container.innerHTML = "";

  const list = sortGlossary(glossaryList, sortKey, sortOrder);

  const table = document.createElement("table");
  table.className = "glossary-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>序号</th>
        <th>ID</th>
        <th>词条</th>
        <th>起源</th>
      </tr>
    </thead>
    <tbody>
      ${list.map((g, i) => `
        <tr data-id="${g.id}">
          <td>${i + 1}</td>
          <td>${g.id}</td>
          <td>${formatContent(g.term)}</td>
          <td>${g.since || "—"}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  container.appendChild(table);
  bindRowClick();
}

/* ===============================
   行点击跳转
   =============================== */
function bindRowClick() {
  document.querySelectorAll(".glossary-table tbody tr").forEach(tr => {
    tr.onclick = () => {
      location.href = `term.html?id=${tr.dataset.id}`;
    };
  });
}

/* ===============================
   排序
   =============================== */
function sortGlossary(list, key, order) {
  return [...list].sort((a, b) => {
    const A = a[key] || "";
    const B = b[key] || "";
    return order === "asc"
      ? A.localeCompare(B)
      : B.localeCompare(A);
  });
}

/* ===============================
   绑定排序控件
   =============================== */
const sortWrap = document.querySelector(".sort-controls");
const sortState = { key: "since", order: "asc" };
const orderToggle = sortWrap.querySelector(".sort-order-toggle");
const applyButton = sortWrap.querySelector(".sort-apply-btn");

function applyCurrentSort() {
  renderGlossary(sortState.key, sortState.order);
}

function closeSortPanels(exceptOptions = null) {
  sortWrap.querySelectorAll(".filter-options").forEach(panel => {
    if (panel !== exceptOptions) panel.classList.remove("is-open");
  });
}

function initSortField(fieldElement, stateKey) {
  const trigger = fieldElement.querySelector(".filter-dropdown-trigger");
  const panel = fieldElement.querySelector(".filter-options");
  const label = trigger.querySelector(".selected-label");
  const options = panel.querySelectorAll(".filter-option");

  trigger.addEventListener("click", () => {
    const willOpen = !panel.classList.contains("is-open");
    closeSortPanels(willOpen ? panel : null);
    panel.classList.toggle("is-open", willOpen);
  });

  options.forEach(option => {
    option.addEventListener("click", () => {
      options.forEach(item => item.classList.remove("is-active"));
      option.classList.add("is-active");
      sortState[stateKey] = option.dataset.value;
      label.textContent = option.textContent.trim();
      panel.classList.remove("is-open");
      applyCurrentSort();
    });
  });
}

function syncOrderToggleLabel() {
  orderToggle.textContent = sortState.order === "asc" ? "升序" : "降序";
  orderToggle.dataset.order = sortState.order;
}

initSortField(sortWrap.querySelector('[data-sort-field="key"]'), "key");
syncOrderToggleLabel();

orderToggle.addEventListener("click", () => {
  sortState.order = sortState.order === "asc" ? "desc" : "asc";
  syncOrderToggleLabel();
  applyCurrentSort();
});

applyButton.addEventListener("click", applyCurrentSort);

document.addEventListener("click", event => {
  if (!sortWrap.contains(event.target)) {
    closeSortPanels();
  }
});
