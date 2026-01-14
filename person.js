/************************************************************
 * person.js
 * 人物个人页面
 ************************************************************/

const params = new URLSearchParams(location.search);
const personId = params.get("id");
const container = document.getElementById("record-list");

let allRecords = [];
let participatedRecords = [];
let authoredRecords = [];

// 加载人物信息
fetch(`data/people/${personId}.json`)
    .then(res => res.json())
    .then(person => {
        document.getElementById("person-id").textContent = person.id;
        document.getElementById("person-alias").innerHTML = `<strong>${parseContent(person.alias || "—")}</strong>`;
        document.getElementById("person-bio").innerHTML = `<strong>${formatContent(person.bio || "—")}</strong>`;
    });

// 加载记录
fetch("data/record/records_index.json")
    .then(res => res.json())
    .then(files =>
        Promise.all(
            files.map((f, index) =>
                fetch(`data/record/${f}`)
                    .then(r => r.json())
                    .then(record => {
                        record.id = `R${String(index + 1).padStart(3, "0")}`;
                        return record;
                    })
            )
        )
    )
    .then(list => {
        allRecords = list;
        participatedRecords = allRecords.filter(r => r.content && new RegExp(`\\[\\[${personId}\\|.+?\\]\\]`).test(r.content));
        authoredRecords = allRecords.filter(r => r.author === personId);

        renderRecordList(participatedRecords, container);
    });

// 按钮切换
document.getElementById("btn-participated").onclick = () => renderRecordList(participatedRecords, container);
document.getElementById("btn-authored").onclick = () => renderRecordList(authoredRecords, container);

// 排序按钮
document.getElementById("toggle-sort-btn").onclick = () => {
    toggleSort();
    // 重新渲染当前显示的记录
    const current = document.getElementById("btn-participated").classList.contains("active")
        ? participatedRecords
        : authoredRecords;
    renderRecordList(current, container);
};
