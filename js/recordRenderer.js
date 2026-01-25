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

let glossaryCache = null;   // 全局术语缓存
let activeTooltip = null;    // 当前 tooltip DOM
let activeTermId = null;     // 当前术语 ID
let tooltipTimer = null;     // 延迟显示定时器
let tooltipPinned = false;   // tooltip 是否固定
const TOOLTIP_DELAY = 200;   // 延迟显示时间（ms）

// 确保 glossary 已加载
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

    const termId = tag.dataset.id;

    // 防抖：先清除上次定时器
    if (tooltipTimer) clearTimeout(tooltipTimer);

    tooltipTimer = setTimeout(async () => {
        await ensureGlossary();

        const term = glossaryCache[termId];
        if (!term) return;

        // 已存在且是同一个 tooltip，不重复创建
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
                点击固定 / 再次点击进入详情
            </div>
        `;

        document.body.appendChild(activeTooltip);

        // 渐入
        requestAnimationFrame(() => {
            activeTooltip.classList.remove("hidden");
            activeTooltip.classList.add("show");
        });

    }, TOOLTIP_DELAY);
});

/* ---------- 鼠标移动：tooltip 跟随（固定时不移动） ---------- */
document.addEventListener("mousemove", e => {
    if (!activeTooltip || tooltipPinned) return;

    const padding = 12;
    const rect = activeTooltip.getBoundingClientRect();

    let left = e.clientX + 14;
    let top = e.clientY + 14;

    // 屏幕右/下边缘避让
    if (left + rect.width > window.innerWidth) {
        left = e.clientX - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight) {
        top = e.clientY - rect.height - padding;
    }

    activeTooltip.style.left = left + "px";
    activeTooltip.style.top = top + "px";
});

/* ---------- 鼠标移出：隐藏 tooltip（防抖 & 渐出） ---------- */
document.addEventListener("mouseout", e => {
    // 移出 term-tag 或 tooltip 之外，取消延迟显示
    if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
    }

    if (!activeTooltip) return;

    const to = e.relatedTarget;
    if (to && (to.closest(".term-tag") || to.closest(".term-tooltip"))) return;

    removeTooltip();
});

// 隐藏 tooltip 方法
function removeTooltip(immediate = false) {
    if (!activeTooltip) return;

    tooltipPinned = false;

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

/* ---------- 点击 tooltip：固定 / 再次点击跳转 ---------- */
document.addEventListener("click", e => {
    const tooltip = e.target.closest(".term-tooltip");
    if (!tooltip || !activeTermId) return;

    // 第一次点击：固定 tooltip
    if (!tooltipPinned) {
        tooltipPinned = true;

        const rect = tooltip.getBoundingClientRect();
        tooltip.style.position = "absolute";
        tooltip.style.left = rect.left + window.scrollX + "px";
        tooltip.style.top = rect.top + window.scrollY + "px";

        return; // 点击后只固定，不跳转
    }

    // 已固定 → 第二次点击跳转详情页
    location.href = `term.html?id=${activeTermId}`;
});

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
