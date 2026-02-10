/* ui.js - Updated Logo Size */
import { auth } from './api.js';
import { i18n } from './i18n.js';

export const UI = {
    renderNavbar(user) {
        return `
            <div class="header-content" style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem 0;">
                <div class="logo" onclick="window.router.navigate('/')" style="cursor: pointer; display: flex; align-items: center; gap: 15px;">
                    <!-- كبرت الارتفاع الى 80px -->
                    <img src="/static/5213008082009529582_121.jpg" alt="3Minds" style="height: 80px; object-fit: contain;">
                    <span style="font-weight: 800; font-size: 1.8rem; color: #4f46e5; letter-spacing: -0.5px;">3Minds</span>
                </div>
                
                <div class="nav-links" style="display: flex; align-items: center; gap: 1rem;">
                    ${user ? `
                        <span style="font-size: 0.9rem; color: var(--text-muted); display: none;">${user.email}</span>
                        ${user.role === 'admin' ? 
                            `<button class="btn" onclick="window.router.navigate('/admin')" style="background: var(--bg-card); border: 1px solid var(--border);">${i18n.t('admin_panel')}</button>` : ''
                        }
                        <button class="btn btn-primary" onclick="window.auth.logout()">${i18n.t('logout')}</button>
                    ` : ''}
                    <button class="btn btn-ghost" onclick="window.toggleLang()" style="font-family: inherit;">
                        ${localStorage.getItem('lang') === 'en' ? 'عربي' : 'English'}
                    </button>
                </div>
            </div>
        `;
    },
    // ... (باقي الكود مثل المودال والتوست يبقى نفسه)
    modal(title, content, onConfirm) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="close-modal"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body">${content}</div>
                    <div class="modal-footer">
                        <button class="btn close-modal-btn">${i18n.t('cancel')}</button>
                        <button class="btn btn-primary confirm-modal-btn">${i18n.t('save')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const close = () => { modal.remove(); resolve(null); };
            modal.querySelector('.close-modal').onclick = close;
            modal.querySelector('.close-modal-btn').onclick = close;
            const cb = modal.querySelector('.confirm-modal-btn');
            if (cb) cb.onclick = async () => {
                const b = cb; const ot = b.innerText; b.innerText='...'; b.disabled=true;
                const r = await onConfirm();
                if(r) { modal.remove(); resolve(r); } else { b.innerText=ot; b.disabled=false; }
            };
        });
    },
    toast(message, type = 'success') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.style.cssText = `position:fixed;bottom:20px;right:20px;padding:1rem 1.5rem;background:${type==='error'?'#ef4444':'#10b981'};color:white;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-weight:500;animation:slideIn 0.3s ease-out forwards;`;
        t.innerText = message;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};
