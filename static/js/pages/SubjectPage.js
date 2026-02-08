import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const SubjectPage = async ({ id }) => {
    let data;
    try {
        data = await api.getSubject(id);
    } catch (e) {
        return `<h1>${i18n.t('error')}</h1><button onclick="window.router.navigate('/')">${i18n.t('back')}</button>`;
    }

    const { subject, files } = data;
    const user = auth.getUser();
    const isAdmin = user && (user.role === 'admin' || user.role === 'editor');

    return `
        <div style="margin-bottom: 2rem;">
            <button class="btn" onclick="window.router.navigate('/')" style="margin-bottom: 1rem; color: var(--text-muted); padding: 0;">
                <i class="ph ph-arrow-left"></i> ${i18n.t('back')}
            </button>
            
            <div class="glass-panel" style="padding: 2rem; border-left: 6px solid ${subject.color}; display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h1 style="margin-bottom: 0.5rem;">${subject.title}</h1>
                    <p class="code" style="color: ${subject.color}; font-weight: bold;">${subject.code}</p>
                    <p>${subject.description}</p>
                </div>
                
                ${isAdmin ? `
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button id="upload-btn" class="btn btn-primary">
                            <i class="ph ph-upload-simple"></i> ${i18n.t('upload_file')}
                        </button>
                        <button id="rename-subject-btn" class="btn" style="border: 1px solid var(--border);">
                            <i class="ph ph-pencil-simple"></i> ${i18n.t('rename_subject')}
                        </button>
                        <button id="delete-subject-btn" class="btn" style="border: 1px solid var(--border); color: #ef4444;">
                            <i class="ph ph-trash"></i> ${i18n.t('delete_subject')}
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="grid-auto-fit" style="grid-template-columns: 2fr 1fr; gap: 2rem;">
            <div>
                <h2>${i18n.t('materials')}</h2>
                ${files.length === 0 ? `<p class="mt-4">${i18n.t('no_materials')}</p>` : `
                    <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                        ${files.map(file => `
                            <div class="card" style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                                <div style="font-size: 2rem; color: var(--text-muted);">
                                    <i class="ph ${getFileIcon(file.file_type)}"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h3 style="font-size: 1.1rem; margin: 0;">${file.filename}</h3>
                                    <p style="font-size: 0.8rem; margin: 0;">Uploaded ${new Date(file.uploaded_at).toLocaleDateString()}</p>
                                </div>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <a href="/uploads/${file.filepath}" target="_blank" class="btn" style="background: var(--background); padding: 0.5rem 1rem;">
                                        <i class="ph ph-download"></i>
                                    </a>
                                    <button class="btn btn-primary ai-summary-btn" data-id="${file.id}" style="padding: 0.5rem 1rem;">
                                        <i class="ph ph-magic-wand"></i>
                                    </button>
                                    ${isAdmin ? `
                                        <button class="btn rename-file-btn" data-id="${file.id}" data-name="${file.filename}" style="border: 1px solid var(--border); padding: 0.5rem 1rem;">
                                            <i class="ph ph-pencil-simple"></i>
                                        </button>
                                        <button class="btn delete-file-btn" data-id="${file.id}" style="border: 1px solid var(--border); color: #ef4444; padding: 0.5rem 1rem;">
                                            <i class="ph ph-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div id="summary-${file.id}" class="hidden" style="margin-left: 1rem; padding: 1rem; border-left: 2px solid var(--primary); background: var(--surface); border-radius: 0 0 12px 12px;">
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div>
                <div class="card">
                    <h3>${i18n.t('ai_assist')}</h3>
                    <p style="font-size: 0.9rem;">${i18n.t('processing')}</p>
                </div>
            </div>
        </div>
    `;
}

function getFileIcon(type) {
    if (type === 'pdf') return 'ph-file-pdf';
    if (type === 'video') return 'ph-video';
    if (type === 'image') return 'ph-image';
    return 'ph-file';
}

SubjectPage.init = ({ id }) => {
    // Subject Actions
    const renameSubBtn = document.getElementById('rename-subject-btn');
    if (renameSubBtn) {
        renameSubBtn.onclick = async () => {
            const data = await UI.modal(i18n.t('rename_subject'), `<input type="text" name="title" value="" placeholder="${i18n.t('title')}" />`, async (data) => {
                if (!data.title) return false;
                await api.updateSubject(id, data);
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        };
    }

    const deleteSubBtn = document.getElementById('delete-subject-btn');
    if (deleteSubBtn) {
        deleteSubBtn.onclick = async () => {
            const confirm = await UI.modal(i18n.t('delete_subject'), `<p>${i18n.t('confirm_delete')}</p>`, async () => {
                await api.deleteSubject(id);
                UI.toast(i18n.t('success'));
                return true;
            }, i18n.t('delete_subject'));
            if (confirm) window.router.navigate('/');
        };
    }

    // File Upload
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            const content = `<input type="file" name="file" />`;
            const data = await UI.modal(i18n.t('upload_file'), content, async (data) => {
                if (!data.file) return false;
                const formData = new FormData();
                formData.append('file', data.file);
                formData.append('subject_id', id);
                await api.uploadFile(formData);
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        };
    }

    // File Actions (Rename/Delete)
    document.querySelectorAll('.rename-file-btn').forEach(btn => {
        btn.onclick = async () => {
            const fileId = btn.dataset.id;
            const currentName = btn.dataset.name;
            const data = await UI.modal(i18n.t('rename_file'), `<input type="text" name="filename" value="${currentName}" />`, async (data) => {
                if (!data.filename) return false;
                await api.updateFile(fileId, data);
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        };
    });

    document.querySelectorAll('.delete-file-btn').forEach(btn => {
        btn.onclick = async () => {
            const fileId = btn.dataset.id;
            const confirm = await UI.modal(i18n.t('delete_file'), `<p>${i18n.t('confirm_delete')}</p>`, async () => {
                await api.deleteFile(fileId);
                UI.toast(i18n.t('success'));
                return true;
            }, i18n.t('delete_file'));
            if (confirm) window.router.resolve();
        };
    });

    // AI Summary
    document.querySelectorAll('.ai-summary-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileId = e.currentTarget.dataset.id;
            const container = document.getElementById(`summary-${fileId}`);
            if (!container.classList.contains('hidden')) {
                container.classList.add('hidden');
                return;
            }
            container.innerHTML = `<div class="spinner" style="margin: 1rem auto;"></div>`;
            container.classList.remove('hidden');
            try {
                const res = await api.getSummary(fileId);
                container.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div>
                            <h4 style="color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ph ph-text-align-left"></i> Section 1: Simplified Summary
                            </h4>
                            <div style="font-size: 0.95rem; line-height: 1.6;">${res.summary}</div>
                        </div>
                        
                        ${res.concepts ? `
                        <div>
                            <h4 style="color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ph ph-brain"></i> Section 2: Key Concepts Explained
                            </h4>
                            <div style="font-size: 0.95rem; line-height: 1.6;">${res.concepts}</div>
                        </div>
                        ` : ''}

                        <div>
                            <h4 style="color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ph ph-question"></i> Section 3: Possible Exam / Review Questions
                            </h4>
                            <ul style="margin: 0.5rem 0 0 1.2rem; display: flex; flex-direction: column; gap: 0.5rem;">
                                ${res.questions.map(q => `<li>${q}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            } catch (err) {
                container.innerHTML = `<p>${i18n.t('error')}</p>`;
            }
        });
    });
};

export default SubjectPage;
