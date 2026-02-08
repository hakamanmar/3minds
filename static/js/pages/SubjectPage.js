import { api } from '../api.js';
import { i18n } from '../i18n.js';

const SubjectPage = async (params) => {
    let subject = null;
    let lessons = [];
    
    try {
        subject = await api.getSubject(params.id);
        lessons = await fetch(`/api/subjects/${params.id}/lessons`).then(r => r.json());
    } catch (e) {
        console.error(e);
        return `<div class="card" style="padding: 2rem; text-align: center;">
            <h3>${i18n.t('error')}</h3>
            <p>تعذر تحميل المحتوى</p>
            <button class="btn btn-primary" onclick="window.router.navigate('/')">العودة للرئيسية</button>
        </div>`;
    }

    if (!subject || !subject.title) {
        return `<div class="card" style="padding: 2rem; text-align: center;">
            <h3>المادة غير موجودة</h3>
            <button class="btn btn-primary" onclick="window.router.navigate('/')">العودة للرئيسية</button>
        </div>`;
    }

    return `
        <div class="header-section mb-4">
            <button class="btn" onclick="window.router.navigate('/')" style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; border: 1px solid var(--border);">
                <i class="ph ph-arrow-left"></i>
                <span>عودة</span>
            </button>
            <div style="background: linear-gradient(135deg, ${subject.color || '#4f46e5'} 0%, ${subject.color || '#4f46e5'}dd 100%); 
                        padding: 2rem; border-radius: 16px; color: white;">
                <h1 style="color: white; margin: 0;">${subject.title}</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0.5rem 0 0 0;">${subject.code}</p>
                <p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0 0;">${subject.description || ''}</p>
            </div>
        </div>

        <div class="card">
            <h2 style="margin-bottom: 1.5rem;">${i18n.t('materials')}</h2>
            ${lessons.length === 0 ? `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <i class="ph ph-files" style="font-size: 4rem; display: block; margin-bottom: 1rem;"></i>
                    <p>${i18n.t('no_materials')}</p>
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${lessons.map(lesson => `
                        <div class="lesson-item" style="padding: 1.5rem; border: 1px solid var(--border); border-radius: 12px; 
                                                        display: flex; justify-content: space-between; align-items: center;
                                                        transition: all 0.3s ease; cursor: pointer;"
                             onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)';"
                             onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateY(0)';">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <i class="ph ${lesson.type === 'Video' ? 'ph-video' : 'ph-file-pdf'}" 
                                   style="font-size: 2rem; color: ${lesson.type === 'Video' ? '#ef4444' : '#4f46e5'};"></i>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.1rem;">${lesson.title}</h3>
                                    <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                                        ${lesson.type === 'Video' ? 'فيديو' : 'ملف PDF'}
                                    </p>
                                </div>
                            </div>
                            <a href="${lesson.url}" target="_blank" class="btn btn-primary" 
                               style="display: flex; align-items: center; gap: 8px; text-decoration: none;"
                               onclick="event.stopPropagation();">
                                <i class="ph ph-arrow-square-out"></i>
                                <span>فتح</span>
                            </a>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
};

export default SubjectPage;
