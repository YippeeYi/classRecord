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
const btnParticipated = document.getElementById("btn-participated");
const btnAuthored = document.getElementById("btn-authored");

// 页面状态：记录列表
let allRecords = [];
let participatedRecords = [];
let authoredRecords = [];

/* ===============================
   页面初始化
   =============================== */
Promise.all([
    loadAllPeople(),   // 从缓存/Store获取人物
    loadAllRecords()   // 从缓存/Store获取记录
]).then(([people, records]) => {

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

    // 排序
    sortRecords(participatedRecords);
    sortRecords(authoredRecords);

    // 默认显示参与事件
    renderRecordList(participatedRecords, recordContainer);
});

/* ===============================
   按钮切换
   =============================== */
btnParticipated.onclick = () => {
    renderRecordList(participatedRecords, recordContainer);
};

btnAuthored.onclick = () => {
    renderRecordList(authoredRecords, recordContainer);
};
