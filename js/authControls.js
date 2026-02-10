/************************************************************
 * authControls.js
 * 顶部操作按钮：移除访问密钥
 ************************************************************/

(() => {
    const clearBtn = document.getElementById('clear-access-btn');
    if (!clearBtn) {
        return;
    }

    clearBtn.addEventListener('click', () => {
        const confirmed = window.confirm('确定要移除已保存的访问密钥吗？');
        if (!confirmed) {
            return;
        }
        if (typeof window.clearAccessKey === 'function') {
            window.clearAccessKey();
        }
        if (typeof window.clearCache === 'function') {
            window.clearCache();
        }
        window.location.replace('auth.html');
    });
})();
