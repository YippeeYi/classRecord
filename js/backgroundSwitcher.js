(function () {
    const storageKey = "classRecordBackgroundId";
    const options = Array.isArray(window.BACKGROUND_OPTIONS) ? window.BACKGROUND_OPTIONS : [];

    if (!options.length || !document.body) {
        return;
    }

    const root = document.documentElement;
    const fallbackId = options[0].id;
    const storage = {
        get() {
            try {
                return window.localStorage.getItem(storageKey);
            } catch (error) {
                return null;
            }
        },
        set(value) {
            try {
                window.localStorage.setItem(storageKey, value);
            } catch (error) {
                // Ignore storage failures and keep the selected background for this session.
            }
        }
    };

    const normalizeOption = (option) => ({
        id: option.id,
        label: option.label || option.id,
        meta: option.meta || "Custom background",
        image: option.image || "",
        preview: option.preview || (option.image ? `url("${option.image}")` : "linear-gradient(145deg, #fffdf8, #f3ece1 56%, #ece5d9)")
    });

    const normalizedOptions = options.map(normalizeOption);
    const normalizedById = new Map(normalizedOptions.map((option) => [option.id, option]));

    let currentId = storage.get();
    if (!normalizedById.has(currentId)) {
        currentId = fallbackId;
    }

    const switcher = document.createElement("section");
    switcher.className = "background-switcher";
    switcher.setAttribute("aria-label", "Background switcher");

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "btn-action background-switcher-toggle";
    toggleButton.textContent = "BG";
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.setAttribute("aria-controls", "background-switcher-panel");

    const panel = document.createElement("div");
    panel.className = "background-switcher-panel";
    panel.id = "background-switcher-panel";
    panel.hidden = true;

    const optionButtons = new Map();

    const applyBackground = (id) => {
        const option = normalizedById.get(id) || normalizedOptions[0];
        root.style.setProperty("--page-bg-image", option.image ? `url("${option.image}")` : "none");
        root.dataset.backgroundId = option.id;
        currentId = option.id;
        storage.set(option.id);

        optionButtons.forEach((button, optionId) => {
            const active = optionId === option.id;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    };

    const setPanelOpen = (open) => {
        panel.hidden = !open;
        toggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    };

    normalizedOptions.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-action background-option";
        button.style.setProperty("--option-preview", option.preview);
        button.setAttribute("aria-pressed", "false");
        button.innerHTML = `
            <span class="background-option-label">${option.label}</span>
            <span class="background-option-meta">${option.meta}</span>
        `;
        button.addEventListener("click", () => {
            applyBackground(option.id);
            setPanelOpen(false);
        });
        optionButtons.set(option.id, button);
        panel.appendChild(button);
    });

    toggleButton.addEventListener("click", () => {
        setPanelOpen(panel.hidden);
    });

    document.addEventListener("click", (event) => {
        if (!switcher.contains(event.target)) {
            setPanelOpen(false);
        }
    });

    switcher.appendChild(toggleButton);
    switcher.appendChild(panel);
    document.body.insertAdjacentElement("afterbegin", switcher);

    applyBackground(currentId);
})();
