/************************************************************
 * person.js
 * 人物个人页面（使用 CacheLoader + Store）
 ************************************************************/

const params = new URLSearchParams(location.search);
const personId = params.get("id");

if (!personId) {
    alert("未指定人物 ID");
    throw new Error("personId missing");
}

const recordContainer = document.getElementById("record-list");
const filterContainer = document.getElementById("record-filter");

const switchButtons = document.querySelectorAll(".switch-btn");

// 页面状态
let allRecords = [];
let participatedRecords = [];
let authoredRecords = [];
let currentFilter = { year: "", month: "", day: "" };

function getActiveRecords() {
    const active = document.querySelector(".switch-btn.active");
    if (active?.dataset.type === "authored") {
        return authoredRecords;
    }
    return participatedRecords;
}

function renderFilteredRecords() {
    const activeRecords = getActiveRecords();
    const filtered = filterRecordsByDate(activeRecords, currentFilter);
    sortRecords(filtered);
    renderRecordList(filtered, recordContainer);
}

/* ===============================
   页面初始化
   =============================== */
const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => Promise.all([
    loadAllPeople(),
    loadAllRecords()
])).then(([people, records]) => {

    allRecords = records;

    // === 渲染人物信息 ===
    const person = people.find(p => p.id === personId);
    if (!person) {
        alert("人物不存在");
        return;
    }

    document.getElementById("person-id").textContent = person.id;
    document.getElementById("person-alias").innerHTML =
        `<strong>${parseContent(person.alias || "—")}</strong>`;
    document.getElementById("person-bio").innerHTML =
        `<strong>${formatContent(person.bio || "—")}</strong>`;

    // === 拆分记录 ===
    participatedRecords = allRecords.filter(r =>
        r.content &&
        new RegExp(`\\[\\[${personId}\\|.+?\\]\\]`).test(r.content)
    );

    authoredRecords = allRecords.filter(r =>
        r.author === personId
    );

    sortRecords(participatedRecords);
    sortRecords(authoredRecords);

    // 默认显示：参与事件
    renderRecordList(participatedRecords, recordContainer);

    renderRecordFilter({
        container: filterContainer,
        onFilterChange: criteria => {
            currentFilter = criteria;
            renderFilteredRecords();
        }
    });
});

/* ===============================
   按钮切换
   =============================== */
switchButtons.forEach(btn => {
    btn.addEventListener("click", () => {

        // ① 切换 active 状态
        switchButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // ② 根据 data-type 决定渲染内容
        const type = btn.dataset.type;

        if (type === "participated") {
            renderFilteredRecords();
        } else if (type === "authored") {
            renderFilteredRecords();
        }
    });
});
