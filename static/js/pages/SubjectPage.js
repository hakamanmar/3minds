/* SubjectPage.js - Robust Data Handling */
import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const SubjectPage = async (params) => {
    const id = params.id;
    let data;
    try {
        data = await api.getSubject(id);
        console.log("Subject Data:", data); // Debug log to see what arrives
        if (!data) throw new Error("No data returned");
    } catch (e) {
        console.error(e);
        return `<div class="card error-card" style="padding: 2rem; text-align: center;">
            <h3>${i18n.t('error')}</h3>
            <p>تعذر تحميل المادة الدراسية (ID: ${id})</p>
            <button class="btn btn-primary" onclick="window.router.navigate('/')">${i18n.t('back')}</button>
        </div>`;
    }

    // Handle data structure safely (support both formats)
    const subject = data.subject || data; // Some APIs return flat object
    const items = data.lessons || data.files || []; // Accept both 'lessons' or 'files' array

    const user = auth.getUser();
    const isAdmin = user && (user.role === 'admin' || user.role === 'editor');

    return `
        <div style="margin-bottom: 2rem;">
            <button class="btn" onclick="window.router.navigate('/')" style="margin-bottom: 1rem; color: var(--text-muted); padding: 0; background: none; border: none; cursor: pointer;">
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
                                    <i class="ph ${getIcon(item.type || item.file_type)}"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h3 style="font-size: 1.1rem; margin: 0 0 0.5rem 0; line-height: 1.4;">${item.title || item.filename}</h3>
                                    <span class="badge" style="background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 0.8rem;">${item.type || 'File'}</span>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <a href="${item.url || `/uploads/${item.filepath}`}" target="_blank" class="btn btn-primary" style="flex: 1; text-align: center; text-decoration: none; justify-content: center;">
                                    <i class="ph ph-eye"></i> عرض
                                </a>
                                ${isAdmin ? `
                                    <button class="btn delete-btn" data-id="${item.id}" style="background: #fee2e2; color: #ef4444; border: 1px solid #fee2e2;">
                                        <i class="ph ph-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>`
            }
        </div>
    `;
};

function getIcon(type) {
    if (!type) return 'ph-file';
    type = type.toLowerCase();
    if (type.includes('video')) return 'ph-video';
    if (type.includes('pdf')) return 'ph-file-pdf';
    return 'ph-link';
}

SubjectPage.init = () => {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async () => {
            if(confirm('حذف الدرس؟')) {
                // Try both endpoints (lesson or file) just to be safe, or stick to api.deleteLesson
                try {
                    await api.deleteLesson(btn.dataset.id); 
                } catch {
                    await api.deleteFile(btn.dataset.id);
                }
                location.reload();
            }
        };
    });
};

export default SubjectPage;
