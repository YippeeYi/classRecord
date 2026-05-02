function bindToggle(recordDiv) {
    const imageButton = recordDiv.querySelector(".image-toggle");
    const imageWrap = recordDiv.querySelector(".image-wrapper");
    if (imageButton && imageWrap) {
        imageButton.onclick = () => {
            const open = imageWrap.style.display === "block";
            imageWrap.style.display = open ? "none" : "block";
            imageButton.textContent = open ? "📷" : "❌";
        };
    }

    const attachmentButton = recordDiv.querySelector(".attach-toggle");
    const attachmentWrap = recordDiv.querySelector(".attachments-wrapper");
    if (attachmentButton && attachmentWrap) {
        attachmentButton.onclick = () => {
            const open = attachmentWrap.style.display === "block";
            attachmentWrap.style.display = open ? "none" : "block";
            attachmentButton.textContent = open ? "📎" : "❌";
        };
    }
}

let glossaryCache = null;
let activeTooltip = null;
let activeTermId = null;
let tooltipTimer = null;
let tooltipRemoveTimer = null;
let lastMouseX = 0;
let lastMouseY = 0;
let isHoveringTooltip = false;
let isHoveringTerm = false;
const TOOLTIP_DELAY = 200;
const TOOLTIP_REMOVE_DELAY = 300;

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function updateTooltipHorizontalPosition() {
    if (!activeTooltip) return;
    const tooltipRect = activeTooltip.getBoundingClientRect();
    const padding = 12;
    const left = clamp(lastMouseX - tooltipRect.width / 2, padding, window.innerWidth - tooltipRect.width - padding);
    activeTooltip.style.left = `${left + window.scrollX}px`;
}

async function ensureGlossary() {
    if (!glossaryCache) {
        const list = await loadAllGlossary();
        glossaryCache = {};
        list.forEach((term) => {
            glossaryCache[term.id] = term;
        });
    }
}

document.addEventListener("mousemove", (event) => {
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
});

document.addEventListener("mouseover", (event) => {
    const tag = event.target.closest(".term-tag");
    if (!tag) return;

    const termId = tag.dataset.id;
    isHoveringTerm = true;
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(async () => {
        await ensureGlossary();
        const term = glossaryCache[termId];
        if (!term) return;
        if (activeTooltip && activeTermId === termId) return;
        removeTooltip(true);

        activeTermId = termId;
        activeTooltip = document.createElement("div");
        activeTooltip.className = "term-tooltip hidden";
        activeTooltip.innerHTML = `
            <div class="term-tooltip-content">${formatContent(term.definition)}</div>
            <div class="term-tooltip-hint">点击查看完整术语页面</div>
        `;
        document.body.appendChild(activeTooltip);
        activeTooltip.addEventListener("mouseenter", () => {
            isHoveringTooltip = true;
            clearTimeout(tooltipRemoveTimer);
        });
        activeTooltip.addEventListener("mouseleave", () => {
            isHoveringTooltip = false;
            scheduleTooltipRemoval();
        });

        const tooltipRect = activeTooltip.getBoundingClientRect();
        const tagRect = tag.getBoundingClientRect();
        const padding = 12;
        const verticalGap = 10;
        let top = tagRect.bottom + verticalGap;
        if (top + tooltipRect.height > window.innerHeight - padding) {
            top = tagRect.top - tooltipRect.height - verticalGap;
        }
        top = clamp(Number.isFinite(top) ? top : lastMouseY + verticalGap, padding, window.innerHeight - tooltipRect.height - padding);

        activeTooltip.style.position = "absolute";
        activeTooltip.style.top = `${top + window.scrollY}px`;
        updateTooltipHorizontalPosition();
        requestAnimationFrame(() => {
            activeTooltip.classList.remove("hidden");
            activeTooltip.classList.add("show");
        });
    }, TOOLTIP_DELAY);
});

document.addEventListener("mouseout", (event) => {
    if (event.target.closest(".term-tag")) isHoveringTerm = false;
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
    if (!activeTooltip) return;
    const to = event.relatedTarget;
    if (to && (to.closest(".term-tag") || to.closest(".term-tooltip"))) return;
    scheduleTooltipRemoval();
});

function scheduleTooltipRemoval() {
    clearTimeout(tooltipRemoveTimer);
    tooltipRemoveTimer = setTimeout(() => {
        const element = document.elementFromPoint(lastMouseX, lastMouseY);
        const hovering = isHoveringTerm || isHoveringTooltip || (element && (element.closest(".term-tag") || element.closest(".term-tooltip")));
        if (!hovering) removeTooltip();
    }, TOOLTIP_REMOVE_DELAY);
}

function removeTooltip(immediate = false) {
    if (!activeTooltip) return;
    activeTooltip.classList.remove("show");
    const element = activeTooltip;
    activeTooltip = null;
    activeTermId = null;
    isHoveringTooltip = false;
    isHoveringTerm = false;
    if (immediate) {
        element.remove();
    } else {
        setTimeout(() => element.remove(), 150);
    }
}

document.addEventListener("click", (event) => {
    const tooltip = event.target.closest(".term-tooltip");
    if (tooltip && activeTermId) {
        const href = `term.html?id=${activeTermId}`;
        if (typeof window.navigateTo === "function") window.navigateTo(href);
        else location.href = href;
        removeTooltip(true);
        return;
    }

    const tag = event.target.closest(".person-tag");
    if (tag) {
        const href = `person.html?id=${tag.dataset.id}`;
        if (typeof window.navigateTo === "function") window.navigateTo(href);
        else location.href = href;
    }
});
