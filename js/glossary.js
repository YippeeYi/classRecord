/************************************************************
 * glossary.js
 * 班级辞典页面
 ************************************************************/

const container = document.getElementById("glossary-list");
let glossaryList = [];

/* ===============================
   加载数据
   =============================== */
loadAllGlossary().then(list => {
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
   绑定排序按钮
   =============================== */
document.querySelector(".sort-controls .sort-btn")
    .addEventListener("click", () => {
        const wrap = document.querySelector(".sort-controls");
        const key = wrap.querySelector(".sort-key").value;
        const order = wrap.querySelector(".sort-order").value;
        renderGlossary(key, order);
    });
