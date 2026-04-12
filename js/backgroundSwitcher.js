(function () {
    const storageKey = "classRecordBackgroundId";
    const paletteStorageKey = "classRecordBackgroundPaletteCache.v1";
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
    const paletteCache = {
        getAll() {
            try {
                const raw = window.localStorage.getItem(paletteStorageKey);
                return raw ? JSON.parse(raw) : {};
            } catch (error) {
                return {};
            }
        },
        set(image, palette) {
            if (!image || !palette) {
                return;
            }

            try {
                const next = this.getAll();
                next[image] = palette;
                window.localStorage.setItem(paletteStorageKey, JSON.stringify(next));
            } catch (error) {
                // Ignore storage failures and continue without palette persistence.
            }
        },
        get(image) {
            const cache = this.getAll();
            return image ? cache[image] || null : null;
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
    let activeThemeToken = 0;

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
    toggleButton.textContent = "🖌️";
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.setAttribute("aria-controls", "background-switcher-panel");

    const panel = document.createElement("div");
    panel.className = "background-switcher-panel";
    panel.id = "background-switcher-panel";
    panel.hidden = true;

    const optionButtons = new Map();

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const toRgbString = (rgb) => `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    const toHex = (rgb) =>
        `#${[rgb.r, rgb.g, rgb.b]
            .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
            .join("")}`;

    const rgbToHsl = ({ r, g, b }) => {
        const red = r / 255;
        const green = g / 255;
        const blue = b / 255;
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const lightness = (max + min) / 2;

        if (max === min) {
            return { h: 0, s: 0, l: lightness };
        }

        const delta = max - min;
        const saturation = lightness > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);

        let hue = 0;
        if (max === red) {
            hue = (green - blue) / delta + (green < blue ? 6 : 0);
        } else if (max === green) {
            hue = (blue - red) / delta + 2;
        } else {
            hue = (red - green) / delta + 4;
        }

        return { h: hue / 6, s: saturation, l: lightness };
    };

    const hueToRgb = (p, q, t) => {
        let next = t;
        if (next < 0) next += 1;
        if (next > 1) next -= 1;
        if (next < 1 / 6) return p + (q - p) * 6 * next;
        if (next < 1 / 2) return q;
        if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
        return p;
    };

    const hslToRgb = ({ h, s, l }) => {
        if (s === 0) {
            const gray = Math.round(l * 255);
            return { r: gray, g: gray, b: gray };
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        return {
            r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
            g: Math.round(hueToRgb(p, q, h) * 255),
            b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255)
        };
    };

    const luminance = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    const applyDefaultTheme = () => {
        [
            "--theme-accent",
            "--theme-accent-strong",
            "--theme-surface",
            "--theme-surface-strong",
            "--theme-rgb",
            "--page-bg-base",
            "--page-bg-overlay",
            "--control-bg",
            "--control-hover-bg",
            "--control-border",
            "--panel-border",
            "--panel-bg",
            "--nav-bg",
            "--nav-border",
            "--control-gradient",
            "--control-gradient-hover",
            "--control-active-gradient",
            "--control-active-glow",
            "--control-shadow",
            "--control-shadow-hover",
            "--control-shadow-pressed",
            "--focus-ring",
            "--control-text",
            "--control-active-text",
            "--accent-dark"
        ].forEach((name) => root.style.removeProperty(name));
    };

    const applyPaletteTheme = (palette) => {
        if (!palette) {
            applyDefaultTheme();
            return;
        }

        root.style.setProperty("--theme-accent", palette.accent);
        root.style.setProperty("--theme-accent-strong", palette.accentStrong);
        root.style.setProperty("--theme-surface", palette.surface);
        root.style.setProperty("--theme-surface-strong", palette.surfaceStrong);
        root.style.setProperty("--theme-rgb", palette.rgb);
        root.style.setProperty("--page-bg-base", palette.pageBase);
        root.style.setProperty("--page-bg-overlay", palette.pageOverlay);
        root.style.setProperty("--control-bg", palette.controlBg);
        root.style.setProperty("--control-hover-bg", palette.controlHoverBg);
        root.style.setProperty("--control-border", palette.controlBorder);
        root.style.setProperty("--panel-border", palette.panelBorder);
        root.style.setProperty("--panel-bg", palette.panelBg);
        root.style.setProperty("--nav-bg", palette.navBg);
        root.style.setProperty("--nav-border", palette.navBorder);
        root.style.setProperty("--control-gradient", palette.controlGradient);
        root.style.setProperty("--control-gradient-hover", palette.controlGradientHover);
        root.style.setProperty("--control-active-gradient", palette.controlActiveGradient);
        root.style.setProperty("--control-active-glow", palette.controlActiveGlow);
        root.style.setProperty("--control-shadow", palette.controlShadow);
        root.style.setProperty("--control-shadow-hover", palette.controlShadowHover);
        root.style.setProperty("--control-shadow-pressed", palette.controlShadowPressed);
        root.style.setProperty("--focus-ring", palette.focusRing);
        root.style.setProperty("--control-text", palette.controlText);
        root.style.setProperty("--control-active-text", palette.controlActiveText);
        root.style.setProperty("--accent-dark", palette.accentStrong);
    };

    const buildPalette = (dominantRgb) => {
        const dominant = rgbToHsl(dominantRgb);
        const hue = dominant.h;
        const saturation = clamp(dominant.s, 0.24, 0.72);
        const accentStrong = hslToRgb({
            h: hue,
            s: clamp(saturation * 1.05, 0.28, 0.78),
            l: clamp(dominant.l * 0.58, 0.22, 0.36)
        });
        const accent = hslToRgb({
            h: hue,
            s: clamp(saturation * 0.96, 0.24, 0.68),
            l: clamp(dominant.l * 0.82, 0.34, 0.5)
        });
        const surface = hslToRgb({
            h: hue,
            s: clamp(saturation * 0.3, 0.08, 0.26),
            l: 0.95
        });
        const surfaceStrong = hslToRgb({
            h: hue,
            s: clamp(saturation * 0.38, 0.1, 0.32),
            l: 0.9
        });
        const overlayTop = hslToRgb({
            h: hue,
            s: clamp(saturation * 0.45, 0.12, 0.32),
            l: 0.965
        });
        const overlayBottom = hslToRgb({
            h: hue,
            s: clamp(saturation * 0.36, 0.1, 0.28),
            l: 0.88
        });

        const controlText = luminance(surfaceStrong) > 0.72 ? "#1a1a1c" : "#f8f7f4";
        const controlActiveText = luminance(accentStrong) > 0.56 ? "#1a1a1c" : "#f8f7f4";

        return {
            accent: toHex(accent),
            accentStrong: toHex(accentStrong),
            surface: toHex(surface),
            surfaceStrong: toHex(surfaceStrong),
            rgb: toRgbString(accent),
            pageBase: `radial-gradient(circle at 20% -10%, rgba(${toRgbString(overlayTop)}, 0.98) 0%, rgba(${toRgbString(surface)}, 0.96) 42%, rgba(${toRgbString(overlayBottom)}, 0.98) 100%)`,
            pageOverlay: `linear-gradient(180deg, rgba(${toRgbString(overlayTop)}, 0.22), rgba(${toRgbString(overlayBottom)}, 0.62))`,
            controlBg: `rgba(${toRgbString(surface)}, 0.9)`,
            controlHoverBg: `rgba(${toRgbString(surfaceStrong)}, 0.96)`,
            controlBorder: `rgba(${toRgbString(accentStrong)}, 0.26)`,
            panelBorder: `2px solid rgba(${toRgbString(accentStrong)}, 0.2)`,
            panelBg: `rgba(${toRgbString(surface)}, 0.9)`,
            navBg: `rgba(${toRgbString(surface)}, 0.76)`,
            navBorder: `rgba(${toRgbString(accentStrong)}, 0.14)`,
            controlGradient: `linear-gradient(130deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0) 35%), linear-gradient(145deg, rgba(${toRgbString(surface)}, 0.98), rgba(${toRgbString(surfaceStrong)}, 0.98) 56%, rgba(${toRgbString(overlayBottom)}, 0.96))`,
            controlGradientHover: `linear-gradient(130deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 38%), linear-gradient(145deg, rgba(${toRgbString(surface)}, 1), rgba(${toRgbString(surfaceStrong)}, 1) 48%, rgba(${toRgbString(overlayBottom)}, 0.98))`,
            controlActiveGradient: `linear-gradient(125deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 42%), linear-gradient(135deg, rgba(${toRgbString(accentStrong)}, 1), rgba(${toRgbString(accent)}, 1) 58%, rgba(${toRgbString(accent)}, 0.88))`,
            controlActiveGlow: `0 0 0 1px rgba(${toRgbString(accentStrong)}, 0.2), 0 12px 26px rgba(${toRgbString(accentStrong)}, 0.3)`,
            controlShadow: `0 8px 18px rgba(${toRgbString(accentStrong)}, 0.14)`,
            controlShadowHover: `0 12px 24px rgba(${toRgbString(accentStrong)}, 0.22)`,
            controlShadowPressed: `0 4px 10px rgba(${toRgbString(accentStrong)}, 0.2)`,
            focusRing: `0 0 0 2px rgba(${toRgbString(surface)}, 0.95), 0 0 0 4px rgba(${toRgbString(accent)}, 0.46), 0 12px 24px rgba(${toRgbString(accentStrong)}, 0.22)`,
            controlText,
            controlActiveText
        };
    };

    const bucketSafeDivide = (value, divisor) => (divisor ? value / divisor : value);

    const extractPaletteFromImage = async (imageSrc) => {
        if (!imageSrc) {
            return null;
        }

        const cached = paletteCache.get(imageSrc);
        if (cached) {
            return cached;
        }

        const image = new Image();
        image.decoding = "async";
        image.crossOrigin = "anonymous";

        const loadPromise = new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });

        image.src = imageSrc;
        await loadPromise;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
            return null;
        }

        const sampleWidth = 48;
        const sampleHeight = Math.max(1, Math.round(sampleWidth * (image.naturalHeight / image.naturalWidth || 1)));
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

        const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
        const bins = new Map();
        let fallback = null;
        let fallbackWeight = -1;

        for (let y = 0; y < sampleHeight; y += 1) {
            for (let x = 0; x < sampleWidth; x += 1) {
                const offset = (y * sampleWidth + x) * 4;
                const alpha = data[offset + 3];
                if (alpha < 160) {
                    continue;
                }

                const rgb = {
                    r: data[offset],
                    g: data[offset + 1],
                    b: data[offset + 2]
                };
                const hsl = rgbToHsl(rgb);
                const lightness = hsl.l;
                const saturation = hsl.s;

                if ((lightness > 0.96 && saturation < 0.08) || (lightness < 0.08 && saturation < 0.16)) {
                    continue;
                }

                const centerX = (x + 0.5) / sampleWidth - 0.5;
                const centerY = (y + 0.5) / sampleHeight - 0.5;
                const distance = Math.sqrt(centerX * centerX + centerY * centerY);
                const centerBias = clamp(1.35 - distance * 1.8, 0.55, 1.35);
                const vividness = 0.8 + saturation * 1.8;
                const tonalBias = lightness > 0.18 && lightness < 0.78 ? 1.15 : 0.86;
                const weight = centerBias * vividness * tonalBias;

                const key = [
                    Math.round(rgb.r / 24),
                    Math.round(rgb.g / 24),
                    Math.round(rgb.b / 24)
                ].join("-");

                const bucket = bins.get(key) || { weight: 0, r: 0, g: 0, b: 0 };
                bucket.weight += weight;
                bucket.r += rgb.r * weight;
                bucket.g += rgb.g * weight;
                bucket.b += rgb.b * weight;
                bins.set(key, bucket);

                const fallbackScore = weight * (0.9 + saturation) * (lightness > 0.16 && lightness < 0.74 ? 1.15 : 1);
                if (fallbackScore > fallbackWeight) {
                    fallbackWeight = fallbackScore;
                    fallback = rgb;
                }
            }
        }

        let best = null;
        bins.forEach((bucket) => {
            if (!best || bucket.weight > best.weight) {
                best = bucket;
            }
        });

        const dominant = best
            ? {
                r: Math.round(bucketSafeDivide(best.r, best.weight)),
                g: Math.round(bucketSafeDivide(best.g, best.weight)),
                b: Math.round(bucketSafeDivide(best.b, best.weight))
            }
            : fallback;

        if (!dominant) {
            return null;
        }

        const palette = buildPalette(dominant);
        paletteCache.set(imageSrc, palette);
        return palette;
    };

    const syncThemeForOption = async (option, token) => {
        if (!option.image) {
            if (token === activeThemeToken) {
                applyDefaultTheme();
            }
            return;
        }

        try {
            const palette = await extractPaletteFromImage(option.image);
            if (token === activeThemeToken) {
                applyPaletteTheme(palette);
            }
        } catch (error) {
            if (token === activeThemeToken) {
                applyDefaultTheme();
            }
        }
    };

    const applyBackground = (id) => {
        const option = normalizedById.get(id) || normalizedOptions[0];
        root.style.setProperty("--page-bg-image", option.image ? `url("${option.image}")` : "none");
        root.dataset.backgroundId = option.id;
        currentId = option.id;
        storage.set(option.id);
        activeThemeToken += 1;

        optionButtons.forEach((button, optionId) => {
            const active = optionId === option.id;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });

        syncThemeForOption(option, activeThemeToken);
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
