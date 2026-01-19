/************************************************************
 * people.js
 * 功能：
 * - 加载人物（分文件）
 * - 加载全部记录
 * - 自动统计：
 *   参与记录数 / 记录数
 * - 按角色（同学 / 老师 / 其他）分组渲染人物名单
 ************************************************************/

const container = document.getElementById("people-list");

let peopleList = [];
let records = [];

/* ===============================
   启动加载流程（统一走缓存模块）
   =============================== */
Promise.all([
    loadPeopleWithCache(),
    loadRecordsWithCache()
])
    .then(([people, recordList]) => {
        peopleList = people;
        records = recordList;
        renderByRole();
    })
    .catch(err => {
        console.error(err);
        container.innerHTML = "<p>人物加载失败</p>";
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
function renderByRole(sortKey = "alias", sortOrder = "asc") {
    container.innerHTML = "";

    const groups = { student: [], teacher: [], other: [] };

    // 分组
    peopleList.forEach(p => {
        if (groups[p.role]) groups[p.role].push(p);
        else groups.other.push(p);
    });

    Object.keys(groups).forEach(role => {
        let list = groups[role];
        if (list.length === 0) return;

        // 对每个组单独排序
        list = sortPeople(list, sortKey, sortOrder);

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
          ${list.map((person, index) => {
            const recordCount = person.role === "student" ? countAsAuthor(person.id) : "—";
            const participationCount = countAsParticipant(person.id);

            return `
              <tr data-id="${person.id}">
                <td>${index + 1}</td>
                <td>${person.id}</td>
                <td>${parseContent(person.alias) || "—"}</td>
                <td>${participationCount}</td>
                <td>${recordCount}</td>
              </tr>`;
        }).join("")}
        </tbody>
      </table>`;
        container.appendChild(section);
    });

    bindRowClick();
}


/* ===============================
   行点击跳转
   =============================== */
function bindRowClick() {
    document.querySelectorAll(".people-table tbody tr").forEach(tr => {
        tr.addEventListener("click", () => {
            const id = tr.dataset.id;
            location.href = `person.html?id=${id}`;
        });
    });
}

/* ===============================
   统计：作为记录人
   =============================== */
function countAsAuthor(personId) {
    return records.filter(r => r.author === personId).length;
}

/* ===============================
   统计：作为参与者
   =============================== */
function countAsParticipant(personId) {
    const pattern = new RegExp(`\\[\\[${personId}\\|.+?\\]\\]`);
    return records.filter(r =>
        r.content && pattern.test(r.content)
    ).length;
}

/* ===============================
   排序函数
   =============================== */
function sortPeople(list, key, order) {
    const sorted = [...list]; // 复制数组，避免原地修改

    sorted.forEach(person => {
        // 统计事件数
        person._participation = countAsParticipant(person.id);
        person._record = person.role === "student" ? countAsAuthor(person.id) : 0;
        person._id = person.id || ""; // 空值兜底
    });

    sorted.sort((a, b) => {
        let valA, valB;

        switch (key) {
            case "id":
                valA = a._id.toLowerCase();
                valB = b._id.toLowerCase();
                break;
            case "participation":
                valA = a._participation;
                valB = b._participation;
                break;
            case "record":
                valA = a._record;
                valB = b._record;
                break;
            default:
                valA = 0;
                valB = 0;
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

    // 对原本分组后的列表做排序
    renderByRole(key, order);
});
