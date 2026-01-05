/************************************************************
 * people.js
 * 功能：
 * - 加载人物（分文件）
 * - 加载全部记录
 * - 自动统计：
 *   参与记录数 / 记录数
 * - 渲染人物名单表格
 ************************************************************/

const tbody = document.getElementById("people-body");

let peopleList = [];
let records = [];

/* ===============================
   加载人物
   =============================== */
fetch("data/people/people_index.json")
    .then(res => res.json())
    .then(files =>
        Promise.all(files.map(f =>
            fetch(`data/people/${f}`).then(r => r.json())
        ))
    )
    .then(people => {
        peopleList = people;
        return loadRecords();
    })
    .then(() => {
        renderTable();
    })
    .catch(err => {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4">加载失败</td></tr>`;
    });

/* ===============================
   加载记录
   =============================== */
function loadRecords() {
    return fetch("data/record/records_index.json")
        .then(res => res.json())
        .then(files =>
            Promise.all(files.map(f =>
                fetch(`data/record/${f}`).then(r => r.json())
            ))
        )
        .then(list => {
            records = list;
        });
}

/* ===============================
   渲染人物表格
   =============================== */
function renderTable() {

    tbody.innerHTML = "";

    peopleList.forEach((person, index) => {

        const recordCount = countAsAuthor(person.id);
        const participationCount = countAsParticipant(person.id);

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${person.id}</td>
            <td>${person.alias || "—"}</td>
            <td>${participationCount}</td>
            <td>${recordCount}</td>
        `;

        tr.addEventListener("click", () => {
            location.href = `person.html?id=${person.id}`;
        });

        tbody.appendChild(tr);
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
    return records.filter(r => {
        if (!r.content) return false;
        const pattern = new RegExp(`\\[\\[${personId}\\|.+?\\]\\]`);
        return pattern.test(r.content);
    }).length;
}
