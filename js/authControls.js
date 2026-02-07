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
        if (typeof window.clearAccessKey === 'function') {
            window.clearAccessKey();
        }
        window.location.replace('auth.html');
    });
})();
