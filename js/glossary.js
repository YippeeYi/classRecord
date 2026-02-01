/************************************************************
 * glossary.js
 * 班级辞典页面
 * 功能：
 * - 加载全部 glossary（统一走缓存模块）
 * - 按 since / term 排序
 * - 行点击跳转到 glossary.html?id=
 ************************************************************/

const container = document.getElementById("glossary-list");

let glossaryList = [];

/* ===============================
   启动加载流程（统一走缓存模块）
   =============================== */
loadAllGlossary().then(list => {
    glossaryList = list;
    renderGlossary(); // 默认排序
});

/* ===============================
   渲染 glossary 列表
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
      ${list.map((g, index) => `
        <tr data-id="${g.id}">
          <td>${index + 1}</td>
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
        tr.addEventListener("click", () => {
            const id = tr.dataset.id;
            location.href = `term.html?id=${id}`;
        });
    });
}

/* ===============================
   排序函数
   =============================== */
function sortGlossary(list, key, order) {
    const sorted = [...list];

    sorted.forEach(g => {
        g._since = g.since || "";
        g._id = g.id || "";
    });

    sorted.sort((a, b) => {
        let valA, valB;

        switch (key) {
            case "id":
                valA = a._id.toLowerCase();
                valB = b._id.toLowerCase();
                break;
            case "since":
            default:
                valA = a._since;
                valB = b._since;
        }

        if (valA < valB) return order === "asc" ? -1 : 1;
        if (valA > valB) return order === "asc" ? 1 : -1;
        return 0;
    });

    return sorted;
}

/* ===============================
   绑定排序按钮事件
   =============================== */
document.getElementById("sort-btn").addEventListener("click", () => {
    const key = document.getElementById("sort-key").value;
    const order = document.getElementById("sort-order").value;
    renderGlossary(key, order);
});
