/************************************************************
 * recordRenderer.js
 * 功能：
 * - 统一解析记录文本
 * - 统一加载记录
 * - 统一排序与渲染记录列表
 * - 主页面 & 个人页面共用
 ************************************************************/

/* ===============================
   内容解析
   =============================== */
function parseContent(text) {
    if (!text) return "";

    return text
        // 黑幕 [[REDACT|显示内容]]
        .replace(/\[\[REDACT\|(.+?)\]\]/g, (_, c) =>
            `<span class="redacted">${c}</span>`
        )
        // 人物标记 [[id|显示名]]
        .replace(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g,
            (_, id, label) =>
                `<span class="person-tag" data-id="${id}">${label}</span>`
        )
        // 上标 ^内容^
        .replace(/\^(.+?)\^/g, (_, t) => `<sup>${t}</sup>`)
        // 下标 _内容_
        .replace(/_(.+?)_/g, (_, t) => `<sub>${t}</sub>`);
}

/* ===============================
   段落格式化
   =============================== */
function formatContent(text) {
    return text
        .split("\n\n")
        .map(p => parseContent(p).replace(/\n/g, "<br>"))
        .join("");
}

/**
 * 加载记录
 * @param {Function} processRecord 处理每条记录的函数
 * @returns {Promise} 返回包含所有记录的 Promise
 */
function loadRecords(processRecord) {
    return fetch("data/record/records_index.json")
        .then(res => res.json())
        .then(files =>
            Promise.all(
                files.map((f, index) =>
                    fetch(`data/record/${f}`)
                        .then(r => r.json())
                        .then(record => processRecord(record, index))
                )
            )
        );
}

let sortAscending = true; // 默认正序

/**
 * 渲染记录列表
 * @param {Array} records - 记录数组
 * @param {HTMLElement} container - 渲染容器
 */
function renderRecordList(records, container) {
    container.innerHTML = "";

    // 按 id 排序
    const sorted = [...records].sort((a, b) => {
        const numA = parseInt(a.id.slice(1)); // R001 -> 1
        const numB = parseInt(b.id.slice(1));
        return sortAscending ? numA - numB : numB - numA;
    });

    sorted.forEach(record => {
        let timeText = "";
        if (record.time) timeText = "📌 " + record.time + " |";

        const div = document.createElement("div");
        div.className = "record";

        div.innerHTML = `
      <div class="meta">
        <span>📅 ${record.date} ${timeText} | ✍ ${parseContent(`[[${record.author}|${record.author}]]`)}</span>
        <span class="icon-group">
          ${record.image ? `<span class="image-toggle" title="查看原始记录">📷</span>` : ""}
          ${record.attachments && record.attachments.length > 0 ? `<span class="attach-toggle" title="查看附件">📎</span>` : ""}
        </span>
      </div>
      <div class="content">${formatContent(record.content)}</div>
      ${record.image ? `<div class="image-wrapper" style="display:none"><img src="${record.image}" alt="纸笔原始记录"></div>` : ""}
      ${record.attachments && record.attachments.length > 0 ? `<div class="attachments-wrapper" style="display:none"><strong>附件：</strong><ul>${record.attachments.map(att => `<li><a href="${att.file}" target="_blank">${att.name}</a></li>`).join("")}</ul></div>` : ""}
    `;

        // 图片切换
        const imgBtn = div.querySelector(".image-toggle");
        const imgWrap = div.querySelector(".image-wrapper");
        if (imgBtn && imgWrap) {
            imgBtn.addEventListener("click", () => {
                const open = imgWrap.style.display === "block";
                imgWrap.style.display = open ? "none" : "block";
                imgBtn.textContent = open ? "📷" : "❌";
            });
        }

        // 附件切换
        const attBtn = div.querySelector(".attach-toggle");
        const attWrap = div.querySelector(".attachments-wrapper");
        if (attBtn && attWrap) {
            attBtn.addEventListener("click", () => {
                const open = attWrap.style.display === "block";
                attWrap.style.display = open ? "none" : "block";
                attBtn.textContent = open ? "📎" : "❌";
            });
        }

        container.appendChild(div);
    });
}

/**
 * 切换排序顺序
 */
function toggleSort() {
    sortAscending = !sortAscending;
}

/* ===============================
   人物点击跳转
   =============================== */
document.addEventListener("click", e => {
    const tag = e.target.closest(".person-tag");
    if (tag) {
        location.href = `person.html?id=${tag.dataset.id}`;
    }
});
