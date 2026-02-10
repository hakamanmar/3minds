/* ui.js - Updated for Responsiveness */
import { auth } from './api.js';
import { i18n } from './i18n.js';

export const UI = {
    renderNavbar(user) {
        return `
            <div class="header-content" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="logo" onclick="window.router.navigate('/')" style="cursor: pointer; display: flex; align-items: center; gap: 15px;">
                    <img src="/static/5213008082009529582_121.jpg" alt="3Minds" style="height: 95px; object-fit: contain;">
                    <span style="font-weight: 800; font-size: 2rem; color: #4f46e5; letter-spacing: -0.5px;">3Minds</span>
                </div>
                
                <div class="nav-links" style="display: flex; align-items: center; gap: 1rem;">
                    ${user ? `
                        ${user.role === 'admin' ? 
                            `<button class="btn" onclick="window.router.navigate('/admin')" style="background: var(--bg-card); border: 1px solid var(--border); padding: 8px 15px;">${i18n.t('admin_panel')}</button>` : ''
                        }
                        <button class="btn btn-primary" onclick="window.auth.logout()" style="padding: 8px 15px;">${i18n.t('logout')}</button>
                    ` : ''}
                    <button class="btn btn-ghost" onclick="window.toggleLang()" style="font-family: inherit; font-size: 0.9rem;">
                        ${localStorage.getItem('lang') === 'en' ? 'عربي' : 'EN'}
                    </button>
                </div>
            </div>
        `;
    },
    // ... (باقي كود Modal و Toast يبقى نفسه)
    modal(t,c,f){return new Promise(r=>{const m=document.createElement('div');m.className='modal-overlay';m.innerHTML=`<div class="modal"><div class="modal-header"><h3>${t}</h3><button class="close-modal"><i class="ph ph-x"></i></button></div><div class="modal-body">${c}</div><div class="modal-footer"><button class="btn close-modal-btn">إلغاء</button><button class="btn btn-primary confirm-modal-btn">حفظ</button></div></div>`;document.body.appendChild(m);const cl=()=>{m.remove();r(null)};m.querySelector('.close-modal').onclick=cl;m.querySelector('.close-modal-btn').onclick=cl;const cb=m.querySelector('.confirm-modal-btn');if(cb)cb.onclick=async()=>{const b=cb,ot=b.innerText;b.innerText='...';b.disabled=true;const res=await f();if(res){m.remove();r(res)}else{b.innerText=ot;b.disabled=false}}})},
    toast(m,t='success'){const x=document.createElement('div');x.className=`toast toast-${t}`;x.style.cssText=`position:fixed;bottom:20px;right:20px;padding:1rem 1.5rem;background:${t==='error'?'#ef4444':'#10b981'};color:white;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-weight:500;animation:slideIn 0.3s ease-out forwards;`;x.innerText=m;document.body.appendChild(x);setTimeout(()=>x.remove(),3000)}
};
