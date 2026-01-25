/************************************************************
 * recordRenderer.js
 * 功能：
 * - 统一解析记录文本
 * - 统一排序
 * - 统一渲染记录列表
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
        // 术语标记 {{termId|显示文本}}
        .replace(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g,
            (_, id, label) =>
                `<span class="term-tag" data-id="${id}">${label}</span>`
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

/* ===============================
   排序规则
   =============================== */
function sortRecords(records) {
    records.sort((a, b) => {
        return b.id.localeCompare(a.id);
    });
}

/* ===============================
   渲染记录列表
   =============================== */
function renderRecordList(records, container) {
    // 检查是否已初始化
    records.forEach(record => {
        if (!record.id) {
            console.warn(
                "发现未初始化（未带 id）的记录：",
                record
            );
        }
    });

    container.innerHTML = "";

    records.forEach(record => {
        let timeText = "";
        if (record.time) timeText = "📌 " + record.time + " |";

        const importance = record.importance || "normal";

        const div = document.createElement("div");

        div.className = `record importance-${importance}`;

        div.innerHTML = `
            <div class="meta">
                <span>
                    #${record.id} |
                    📅 ${record.date} |
                    ${timeText}
                    ✍ ${parseContent(`[[${record.author}|${record.author}]]`)}
                </span>
                <span class="icon-group">
                    ${record.image ? `<span class="image-toggle">📷</span>` : ""}
                    ${record.attachments?.length ? `<span class="attach-toggle">📎</span>` : ""}
                </span>
            </div>

            <div class="content">
                ${formatContent(record.content)}
            </div>

            ${record.image ? `
                <div class="image-wrapper" style="display:none">
                    <img src="${record.image}">
                </div>
            ` : ""}

            ${record.attachments?.length ? `
                <div class="attachments-wrapper" style="display:none">
                    <ul>
                        ${record.attachments.map(a =>
            `<li><a href="${a.file}" target="_blank">${a.name}</a></li>`
        ).join("")}
                    </ul>
                </div>
            ` : ""}
        `;

        bindToggle(div);
        container.appendChild(div);
    });
}

/* ===============================
   图片 / 附件切换
   =============================== */
function bindToggle(recordDiv) {
    const imgBtn = recordDiv.querySelector(".image-toggle");
    const imgWrap = recordDiv.querySelector(".image-wrapper");

    if (imgBtn && imgWrap) {
        imgBtn.onclick = () => {
            const open = imgWrap.style.display === "block";
            imgWrap.style.display = open ? "none" : "block";
            imgBtn.textContent = open ? "📷" : "❌";
        };
    }

    const attBtn = recordDiv.querySelector(".attach-toggle");
    const attWrap = recordDiv.querySelector(".attachments-wrapper");

    if (attBtn && attWrap) {
        attBtn.onclick = () => {
            const open = attWrap.style.display === "block";
            attWrap.style.display = open ? "none" : "block";
            attBtn.textContent = open ? "📎" : "❌";
        };
    }
}

/* ===============================
   术语 Tooltip
   =============================== */

let glossaryCache = null;
let activeTooltip = null;
let activeTermId = null;

async function ensureGlossary() {
    if (!glossaryCache) {
        const list = await loadAllGlossary();
        glossaryCache = {};
        list.forEach(t => glossaryCache[t.id] = t);
    }
}

/* ---------- 显示 Tooltip ---------- */
document.addEventListener("mouseover", async e => {
    const tag = e.target.closest(".term-tag");
    if (!tag) return;

    await ensureGlossary();

    const termId = tag.dataset.id;
    const term = glossaryCache[termId];
    if (!term) return;

    // 如果已经是同一个术语，不重复创建
    if (activeTooltip && activeTermId === termId) return;

    removeTooltip(true);

    activeTermId = termId;
    activeTooltip = document.createElement("div");
    activeTooltip.className = "term-tooltip hidden";
    activeTooltip.innerHTML = `
        <div class="term-tooltip-content">
            ${formatContent(term.definition)}
        </div>
        <div class="term-tooltip-hint">
            点击查看完整术语页面
        </div>
    `;

    document.body.appendChild(activeTooltip);

    // 渐入
    requestAnimationFrame(() => {
        activeTooltip.classList.remove("hidden");
        activeTooltip.classList.add("show");
    });
});

/* ---------- 跟随鼠标 + 智能避让 ---------- */
document.addEventListener("mousemove", e => {
    if (!activeTooltip) return;

    const padding = 12;
    const rect = activeTooltip.getBoundingClientRect();

    let left = e.clientX + 14;
    let top = e.clientY + 14;

    if (left + rect.width > window.innerWidth) {
        left = e.clientX - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight) {
        top = e.clientY - rect.height - padding;
    }

    activeTooltip.style.left = left + "px";
    activeTooltip.style.top = top + "px";
});

/* ---------- 隐藏 Tooltip（渐出） ---------- */
document.addEventListener("mouseout", e => {
    if (!activeTooltip) return;

    const to = e.relatedTarget;
    if (
        to &&
        (to.closest(".term-tag") || to.closest(".term-tooltip"))
    ) {
        return;
    }

    removeTooltip();
});

function removeTooltip(immediate = false) {
    if (!activeTooltip) return;

    activeTooltip.classList.remove("show");

    const el = activeTooltip;
    activeTooltip = null;
    activeTermId = null;

    if (immediate) {
        el.remove();
    } else {
        setTimeout(() => el.remove(), 150);
    }
}

/* ===============================
   Tooltip 点击跳转
   =============================== */
document.addEventListener("click", e => {
    const tooltip = e.target.closest(".term-tooltip");
    if (tooltip && activeTermId) {
        location.href = `term.html?id=${activeTermId}`;
    }
});

/* ===============================
   人物点击跳转
   =============================== */
document.addEventListener("click", e => {
    const tag = e.target.closest(".person-tag");
    if (tag) {
        location.href = `person.html?id=${tag.dataset.id}`;
    }
});
