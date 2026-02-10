import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';

const SubjectPage = async (params) => {
    const id = params.id;
    let subject = { title: "Loading...", color: "#ccc" };
    let items = [];

    try {
        const response = await api.getSubject(id);
        if (response) {
            subject = response.subject || response;
            items = response.lessons || response.files || [];
        }
    } catch (e) {
        console.error("Error:", e);
        // حتى لو صار خطأ، نعرض واجهة فارغة بدل واجهة الخطأ
        subject = { title: "Error Loading Subject", description: "Try refreshing the page.", color: "#ef4444", code: "ERR" };
    }

    const user = auth.getUser();
    const isAdmin = user && (user.role === 'admin' || user.role === 'editor');

    return `
        <div style="margin-bottom: 2rem;">
            <button class="btn" onclick="window.router.navigate('/')" style="margin-bottom: 1rem; color: var(--text-muted); padding: 0; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> ${i18n.t('back')}
            </button>
            
            <div class="glass-panel" style="padding: 2rem; border-right: 6px solid ${subject.color || '#4f46e5'}; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h1 style="margin-bottom: 0.5rem; color: var(--text-main);">${subject.title || 'Untitled'}</h1>
                <p class="code" style="color: ${subject.color || '#4f46e5'}; font-weight: bold; font-family: monospace; font-size: 1.1em;">${subject.code || ''}</p>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">${subject.description || ''}</p>
            </div>
        </div>

        <div>
            <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-files"></i> ${i18n.t('materials')}
            </h2>
            
            ${items.length === 0 ? 
                `<div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="ph ph-folder-open" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    <p>${i18n.t('no_materials')}</p>
                </div>` : 
                `<div class="grid-auto-fit" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${items.map(item => `
                        <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: flex; align-items: flex-start; gap: 1rem;">
                                <div style="font-size: 2.5rem; color: ${subject.color || '#4f46e5'};">
                                    <i class="ph ${item.type && item.type.includes('Video') ? 'ph-video' : 'ph-file-pdf'}"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h3 style="font-size: 1.1rem; margin: 0 0 0.5rem 0; line-height: 1.4;">${item.title || item.filename}</h3>
                                    <span class="badge" style="background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 0.8rem;">${item.type || 'File'}</span>
                                </div>
                            </div>
                            <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <a href="${item.url || '#'}" target="_blank" class="btn btn-primary" style="width: 100%; text-align: center; text-decoration: none; display: flex; justified-content: center; gap: 5px;">
                                    <i class="ph ph-eye"></i> عرض
                                </a>
                                ${isAdmin ? `<button class="btn del-btn" data-id="${item.id}" style="width:100%; margin-top:5px; background:#fee2e2; color:#ef4444; border:none;">حذف</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>`
            }
        </div>
    `;
};

SubjectPage.init = () => {
    document.querySelectorAll('.del-btn').forEach(b => {
        b.onclick = async () => { if(confirm('Delete?')) { await api.deleteLesson(b.dataset.id); location.reload(); } }
    });
};

export default SubjectPage;
