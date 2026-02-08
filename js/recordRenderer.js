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
        // 术语标记 {{termId|显示文本}}
        .replace(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g,
            (_, id, label) =>
                `<span class="term-tag" data-id="${id}">${label}</span>`
        )
        // 人物标记 [[id|显示名]]
        .replace(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g,
            (_, id, label) =>
                `<span class="person-tag" data-id="${id}" title="${id}">${label}</span>`
        )
        // 黑幕 ((显示内容))
        .replace(/\(\((.+?)\)\)/g,
            (_, c) =>
                `<span class="redacted"><span class="redacted-mask""></span><span class="redacted-content">${c}</span></span>`
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
   筛选控件（年/月/日）
   =============================== */
function filterRecordsByDate(records, { year, month, day }) {
    const hasYear = Boolean(year);
    const hasMonth = Boolean(month);
    const hasDay = Boolean(day);

    if (!hasYear && !hasMonth && !hasDay) {
        return records.slice();
    }

    return records.filter(record => {
        if (!record.date) return false;
        const [rYear, rMonth, rDay] = record.date.split("-");
        if (hasYear && rYear !== year) return false;
        if (hasMonth && rMonth !== month) return false;
        if (hasDay && rDay !== day) return false;
        return true;
    });
}

function normalizeNumberInput(value, length) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isNaN(numeric)) return "";
    return String(numeric).padStart(length, "0");
}

function renderRecordFilter({ container, onFilterChange, initial = {} }) {
    if (!container) return;

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "record-filter";

    wrapper.innerHTML = `
        <div class="filter-field">
            <label for="filter-year">年</label>
            <input id="filter-year" type="number" inputmode="numeric" placeholder="YYYY" min="1900" max="2100">
        </div>
        <div class="filter-field">
            <label for="filter-month">月</label>
            <input id="filter-month" type="number" inputmode="numeric" placeholder="MM" min="1" max="12">
        </div>
        <div class="filter-field">
            <label for="filter-day">日</label>
            <input id="filter-day" type="number" inputmode="numeric" placeholder="DD" min="1" max="31">
        </div>
        <div class="filter-actions">
            <button type="button" class="apply">筛选</button>
            <button type="button" class="secondary clear">清空</button>
        </div>
        <div class="filter-status">支持任意组合筛选，例如仅填年或年月。</div>
    `;

    container.appendChild(wrapper);

    const yearInput = wrapper.querySelector("#filter-year");
    const monthInput = wrapper.querySelector("#filter-month");
    const dayInput = wrapper.querySelector("#filter-day");
    const status = wrapper.querySelector(".filter-status");
    const applyButton = wrapper.querySelector(".apply");
    const clearButton = wrapper.querySelector(".clear");

    yearInput.value = initial.year || "";
    monthInput.value = initial.month || "";
    dayInput.value = initial.day || "";

    const applyFilter = () => {
        const criteria = {
            year: normalizeNumberInput(yearInput.value, 4),
            month: normalizeNumberInput(monthInput.value, 2),
            day: normalizeNumberInput(dayInput.value, 2)
        };

        if (!criteria.year && yearInput.value.trim()) {
            yearInput.value = "";
        } else if (criteria.year) {
            yearInput.value = criteria.year;
        }
        if (!criteria.month && monthInput.value.trim()) {
            monthInput.value = "";
        } else if (criteria.month) {
            monthInput.value = criteria.month;
        }
        if (!criteria.day && dayInput.value.trim()) {
            dayInput.value = "";
        } else if (criteria.day) {
            dayInput.value = criteria.day;
        }

        const summary = [
            criteria.year ? `${criteria.year}年` : "",
            criteria.month ? `${criteria.month}月` : "",
            criteria.day ? `${criteria.day}日` : ""
        ].filter(Boolean).join("");
        status.textContent = summary ? `当前筛选：${summary}` : "未设置筛选条件，显示全部记录。";

        if (typeof onFilterChange === "function") {
            onFilterChange(criteria);
        }
    };

    const clearFilter = () => {
        yearInput.value = "";
        monthInput.value = "";
        dayInput.value = "";
        status.textContent = "未设置筛选条件，显示全部记录。";
        if (typeof onFilterChange === "function") {
            onFilterChange({ year: "", month: "", day: "" });
        }
    };

    applyButton.addEventListener("click", applyFilter);
    clearButton.addEventListener("click", clearFilter);

    [yearInput, monthInput, dayInput].forEach(input => {
        input.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                applyFilter();
            }
        });
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
let tooltipTimer = null;
let tooltipRemoveTimer = null; // 移除 tooltip 的定时器
let lastMouseX = 0;
let lastMouseY = 0;
let isHoveringTooltip = false;
let isHoveringTerm = false;

const TOOLTIP_DELAY = 200;
const TOOLTIP_REMOVE_DELAY = 300; // 延迟时间，在鼠标移开后延迟移除 tooltip

// 加载 glossary
async function ensureGlossary() {
    if (!glossaryCache) {
        const list = await loadAllGlossary();
        glossaryCache = {};
        list.forEach(t => glossaryCache[t.id] = t);
    }
}

/* ---------- 记录鼠标位置 ---------- */
document.addEventListener("mousemove", e => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

/* ---------- mouseover：延迟显示 tooltip ---------- */
document.addEventListener("mouseover", e => {
    const tag = e.target.closest(".term-tag");
    if (!tag) return;

    const termId = tag.dataset.id;
    isHoveringTerm = true;

    if (tooltipTimer) clearTimeout(tooltipTimer);

    tooltipTimer = setTimeout(async () => {
        await ensureGlossary();

        const term = glossaryCache[termId];
        if (!term) return;

        // 已存在同一个 tooltip 不重复创建
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
        activeTooltip.addEventListener("mouseenter", () => {
            isHoveringTooltip = true;
            if (tooltipRemoveTimer) {
                clearTimeout(tooltipRemoveTimer);
                tooltipRemoveTimer = null;
            }
        });
        activeTooltip.addEventListener("mouseleave", () => {
            isHoveringTooltip = false;
            scheduleTooltipRemoval();
        });

        // 计算位置（基于鼠标）
        const tooltipRect = activeTooltip.getBoundingClientRect();
        const padding = 12;

        let left = lastMouseX + 14;
        let top = lastMouseY + 14;

        // 屏幕边缘避让
        if (left + tooltipRect.width > window.innerWidth) {
            left = lastMouseX - tooltipRect.width - padding;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = lastMouseY - tooltipRect.height - padding;
        }

        activeTooltip.style.position = "absolute";
        activeTooltip.style.left = left + window.scrollX + "px";
        activeTooltip.style.top = top + window.scrollY + "px";

        // 渐入
        requestAnimationFrame(() => {
            activeTooltip.classList.remove("hidden");
            activeTooltip.classList.add("show");
        });
    }, TOOLTIP_DELAY);
});

/* ---------- mouseout：延迟移除 tooltip ---------- */
document.addEventListener("mouseout", e => {
    if (e.target.closest(".term-tag")) {
        isHoveringTerm = false;
    }
    // 取消尚未触发的延迟显示
    if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
    }

    if (!activeTooltip) return;

    const to = e.relatedTarget;

    // 只要进入 term-tag 或 tooltip，都不清除
    if (
        to &&
        (to.closest(".term-tag") || to.closest(".term-tooltip"))
    ) {
        return;
    }

    scheduleTooltipRemoval();
});

function scheduleTooltipRemoval() {
    if (tooltipRemoveTimer) {
        clearTimeout(tooltipRemoveTimer);
    }

    tooltipRemoveTimer = setTimeout(() => {
        const el = document.elementFromPoint(lastMouseX, lastMouseY);
        const hovering =
            isHoveringTerm ||
            isHoveringTooltip ||
            (el &&
                (el.closest(".term-tag") ||
                    el.closest(".term-tooltip")));

        if (hovering) {
            return;
        }

        removeTooltip();
    }, TOOLTIP_REMOVE_DELAY);
}

/* ---------- 移除 tooltip ---------- */
function removeTooltip(immediate = false) {
    if (!activeTooltip) return;

    activeTooltip.classList.remove("show");

    const el = activeTooltip;
    activeTooltip = null;
    activeTermId = null;
    isHoveringTooltip = false;
    isHoveringTerm = false;

    if (immediate) {
        el.remove();
    } else {
        setTimeout(() => el.remove(), 150);
    }
}

/* ---------- 点击 tooltip：跳转 ---------- */
document.addEventListener("click", e => {
    const tooltip = e.target.closest(".term-tooltip");
    if (!tooltip || !activeTermId) return;

    location.href = `term.html?id=${activeTermId}`;
    removeTooltip(true);
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

/* ===============================
   刷新缓存按钮（记录页面）
   =============================== */
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("refresh-cache-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const ok = confirm("将清空所有本地缓存并重新加载数据，是否继续？");
        if (!ok) return;

        // 来自 cacheLoader.js 的全局方法
        clearCache();

        location.reload();
    });
});
