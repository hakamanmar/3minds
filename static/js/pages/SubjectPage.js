import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const SubjectPage = async (params) => { // Changed deconstruction to match router params
    const id = params.id;
    let data;
    try {
        data = await api.getSubject(id);
        if (!data || !data.subject) throw new Error("Subject not found");
    } catch (e) {
        console.error(e);
        return `<div class="card error-card" style="padding: 2rem; text-align: center;">
            <h3>${i18n.t('error')}</h3>
            <p>تعذر تحميل المادة الدراسية</p>
            <button class="btn btn-primary" onclick="window.router.navigate('/')">${i18n.t('back')}</button>
        </div>`;
    }

    const { subject, lessons } = data; // Changed 'files' to 'lessons' based on API response structure
    const user = auth.getUser();
    const isAdmin = user && (user.role === 'admin' || user.role === 'editor');

    return `
        <div style="margin-bottom: 2rem;">
            <button class="btn" onclick="window.router.navigate('/')" style="margin-bottom: 1rem; color: var(--text-muted); padding: 0; background: none; border: none; cursor: pointer;">
                <i class="ph ph-arrow-right"></i> ${i18n.t('back')}
            </button>
            
            <div class="glass-panel" style="padding: 2rem; border-right: 6px solid ${subject.color || '#4f46e5'}; display: flex; justify-content: space-between; align-items: start; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div>
                    <h1 style="margin-bottom: 0.5rem; color: var(--text-main);">${subject.title}</h1>
                    <p class="code" style="color: ${subject.color || '#4f46e5'}; font-weight: bold; font-family: monospace; font-size: 1.1em;">${subject.code}</p>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">${subject.description || ''}</p>
                </div>
            </div>
        </div>

        <div>
            <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-files"></i> ${i18n.t('materials')}
            </h2>
            
            ${!lessons || lessons.length === 0 ? 
                `<div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="ph ph-folder-open" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    <p>${i18n.t('no_materials')}</p>
                </div>` : 
                `<div class="grid-auto-fit" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${lessons.map(lesson => `
                        <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.2s;">
                            <div style="display: flex; align-items: flex-start; gap: 1rem;">
                                <div style="font-size: 2.5rem; color: ${subject.color || '#4f46e5'};">
                                    <i class="ph ${getLessonIcon(lesson.type)}"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h3 style="font-size: 1.1rem; margin: 0 0 0.5rem 0; line-height: 1.4;">${lesson.title}</h3>
                                    <span class="badge" style="background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 0.8rem;">${lesson.type}</span>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <a href="${lesson.url}" target="_blank" class="btn btn-primary" style="flex: 1; text-align: center; text-decoration: none; justify-content: center;">
                                    <i class="ph ph-eye"></i> عرض
                                </a>
                                ${isAdmin ? `
                                    <button class="btn delete-lesson-btn" data-id="${lesson.id}" style="background: #fee2e2; color: #ef4444; border: 1px solid #fee2e2;">
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

function getLessonIcon(type) {
    if (type === 'Video') return 'ph-video';
    if (type === 'PDF') return 'ph-file-pdf';
    return 'ph-link';
}

SubjectPage.init = () => {
    // Delete Lesson Listener
    document.querySelectorAll('.delete-lesson-btn').forEach(btn => {
        btn.onclick = async () => {
            if(confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
                await api.deleteLesson(btn.dataset.id);
                location.reload();
            }
        };
    });
};

export default SubjectPage;
