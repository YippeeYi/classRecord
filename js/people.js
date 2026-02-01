/************************************************************
 * people.js
 * 人物名单页面
 ************************************************************/

const container = document.getElementById("people-list");

let peopleList = [];
let records = [];

/* ===============================
   启动加载流程
   =============================== */
Promise.all([
    loadAllPeople(),
    loadAllRecords()
]).then(([people, allRecords]) => {
    peopleList = people;
    records = allRecords;
    renderByRole(); // 默认排序
});

/* ===============================
   角色显示名映射
   =============================== */
const roleNameMap = {
    student: "同学",
    teacher: "老师",
    other: "其他"
};

/* ===============================
   按角色分组渲染
   =============================== */
function renderByRole(sortKey = "id", sortOrder = "asc") {
    container.innerHTML = "";

    const groups = { student: [], teacher: [], other: [] };

    peopleList.forEach(p => {
        if (groups[p.role]) groups[p.role].push(p);
        else groups.other.push(p);
    });

    Object.keys(groups).forEach(role => {
        const list = sortPeople(groups[role], sortKey, sortOrder);
        if (!list.length) return;

        const section = document.createElement("section");
        section.innerHTML = `
      <h2>${roleNameMap[role]}</h2>
      <table class="people-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>ID</th>
            <th>别名</th>
            <th>参与</th>
            <th>记录</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((p, i) => `
            <tr data-id="${p.id}">
              <td>${i + 1}</td>
              <td>${p.id}</td>
              <td>${parseContent(p.alias) || "—"}</td>
              <td>${countAsParticipant(p.id)}</td>
              <td>${p.role === "student" ? countAsAuthor(p.id) : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
        container.appendChild(section);
    });

    bindRowClick();
}

/* ===============================
   行点击跳转
   =============================== */
function bindRowClick() {
    document.querySelectorAll(".people-table tbody tr").forEach(tr => {
        tr.onclick = () => {
            location.href = `person.html?id=${tr.dataset.id}`;
        };
    });
}

/* ===============================
   统计
   =============================== */
function countAsAuthor(id) {
    return records.filter(r => r.author === id).length;
}

function countAsParticipant(id) {
    const reg = new RegExp(`\\[\\[${id}\\|.+?\\]\\]`);
    return records.filter(r => r.content && reg.test(r.content)).length;
}

/* ===============================
   排序
   =============================== */
function sortPeople(list, key, order) {
    return [...list].sort((a, b) => {
        const get = p => ({
            id: p.id,
            participation: countAsParticipant(p.id),
            record: p.role === "student" ? countAsAuthor(p.id) : 0
        }[key]);

        const A = get(a), B = get(b);
        return order === "asc" ? A - B : B - A;
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
        renderByRole(key, order);
    });
