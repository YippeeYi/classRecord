/************************************************************
 * glossary.js
 * 班级辞典页面
 ************************************************************/

const container = document.getElementById("glossary-list");
let glossaryList = [];
let currentSortKey = "since";
let currentSortOrder = "asc";

/* ===============================
   加载数据
   =============================== */
const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => loadAllGlossary())
  .then(list => {
    glossaryList = list;
    renderGlossary(currentSortKey, currentSortOrder);
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
   绑定排序按钮
   =============================== */
const sortControls = document.querySelector(".sort-controls");
const keyTrigger = sortControls.querySelector(".dropdown-trigger");
const keyLabel = keyTrigger.querySelector(".dropdown-label");
const orderToggle = sortControls.querySelector(".sort-order-toggle");

const sortKeyText = {
  since: "按起源时间",
  id: "按词条名称"
};

function updateSortControls() {
  keyTrigger.dataset.value = currentSortKey;
  keyLabel.textContent = sortKeyText[currentSortKey] || "按起源时间";

  orderToggle.dataset.value = currentSortOrder;
  orderToggle.textContent = currentSortOrder === "asc" ? "升序" : "降序";

  sortControls.querySelectorAll(".sort-option").forEach(option => {
    option.classList.toggle("is-active", option.dataset.value === currentSortKey);
  });
}

sortControls.addEventListener("click", event => {
  const option = event.target.closest(".sort-option");
  if (option) {
    currentSortKey = option.dataset.value || "since";
    updateSortControls();
    renderGlossary(currentSortKey, currentSortOrder);
    return;
  }

  if (event.target.closest(".sort-order-toggle")) {
    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
    updateSortControls();
    renderGlossary(currentSortKey, currentSortOrder);
  }
});

updateSortControls();
