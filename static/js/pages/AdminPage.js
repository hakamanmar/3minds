import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const AdminPage = async () => {
    let subjects = [];
    let users = [];
    try {
        subjects = await api.getSubjects();
        users = await api.getUsers();
    } catch (e) {
        console.error(e);
        return `<div class="card error-card" style="padding: 2rem; text-align: center; color: #ef4444;">
            <i class="ph ph-warning-circle" style="font-size: 3rem; display: block; margin-bottom: 1rem;"></i>
            <h3>${i18n.t('error')}</h3>
            <p>${e.message || 'Check Server Logs'}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
        </div>`;
    }

    return `
        <div class="header-section mb-4" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1>${i18n.t('admin_panel')}</h1>
                <p>System Architecture & Cybersecurity Controls</p>
            </div>
            <button class="btn" onclick="window.router.navigate('/')" style="display: flex; align-items: center; gap: 8px; border: 1px solid var(--border);">
                <i class="ph ph-house"></i>
                <span>الصفحة الرئيسية</span>
            </button>
        </div>

        <div class="grid-auto-fit" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
            <!-- Subject Management -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>${i18n.t('subjects')}</h3>
                    <button id="add-subject-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-plus"></i>
                        <span>إضافة مادة</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${subjects.length === 0 ? '<p style="color: var(--text-muted); text-align: center;">لا توجد مواد</p>' : ''}
                    ${subjects.map(s => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 10px;">
                            <div class="flex-between">
                                <strong>${s.title} (${s.code})</strong>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn edit-subject-btn" 
                                            data-id="${s.id}" 
                                            data-title="${s.title}"
                                            data-code="${s.code}"
                                            data-desc="${s.description || ''}"
                                            data-color="${s.color || '#4f46e5'}"
                                            style="color: var(--primary); border: 1px solid var(--border);">
                                        <i class="ph ph-pencil-simple"></i>
                                    </button>
                                    <button class="btn delete-subject-btn" data-id="${s.id}" style="color: #ef4444; border: 1px solid #ef4444;">
                                        <i class="ph ph-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn add-lesson-btn" data-id="${s.id}" style="color:var(--primary); font-size: 0.9rem; display: flex; align-items: center; gap: 4px; border: 1px dashed var(--primary); width: 100%; justify-content: center;">
                                    <i class="ph ph-plus"></i> أضف درس أو ملف
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Student & Device Management -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>${i18n.t('manage_students')}</h3>
                    <button id="add-student-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-user-plus"></i>
                        <span>إضافة طالب</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${users.filter(u => u.role === 'student').length === 0 ? '<p style="color: var(--text-muted); text-align: center;">لا يوجد طلاب</p>' : ''}
                    ${users.filter(u => u.role === 'student').map(u => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                            <div class="flex-between">
                                <strong>${u.email}</strong>
                                <span class="badge" style="background: ${u.device_id ? '#10b981' : '#f59e0b'}; color: white;">
                                    ${u.device_id ? 'Linked' : 'Pending'}
                                </span>
                            </div>
                            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                <button class="btn reset-device-btn" data-id="${u.id}" style="font-size: 0.8rem; border: 1px solid var(--border);">
                                    ${i18n.t('reset_device')}
                                </button>
                                <button class="btn force-reset-pw" data-id="${u.id}" style="font-size: 0.8rem; border: 1px solid var(--border);">
                                    ${i18n.t('force_reset')}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

AdminPage.init = () => {
    // Edit Subject (تعديل المادة)
    document.querySelectorAll('.edit-subject-btn').forEach(btn => {
        btn.onclick = async () => {
            const { id, title, code, desc, color } = btn.dataset;
            const content = `
                <input type="text" id="edit-sub-title" value="${title}" placeholder="${i18n.t('title')}" class="mb-4" />
                <input type="text" id="edit-sub-code" value="${code}" placeholder="${i18n.t('code')}" class="mb-4" />
                <textarea id="edit-sub-desc" placeholder="${i18n.t('description')}" class="mb-4">${desc}</textarea>
                <label style="display:block; margin-bottom:0.5rem;">لون المادة:</label>
                <input type="color" id="edit-sub-color" value="${color}" style="height: 50px;" />
            `;
            
            const data = await UI.modal('تعديل المادة', content, async () => {
                const newTitle = document.getElementById('edit-sub-title').value;
                const newCode = document.getElementById('edit-sub-code').value;
                const newDesc = document.getElementById('edit-sub-desc').value;
                const newColor = document.getElementById('edit-sub-color').value;

                if (!newTitle || !newCode) return false;
                
                try {
                    await api.updateSubject(id, { 
                        title: newTitle, 
                        code: newCode, 
                        description: newDesc, 
                        color: newColor 
                    });
                    UI.toast(i18n.t('success'));
                    return true;
                } catch(e) {
                    UI.toast(i18n.t('error'), 'error');
                    return false;
                }
            });
            if (data) window.router.resolve();
        };
    });

    // Add Lesson
    document.querySelectorAll('.add-lesson-btn').forEach(btn => {
        btn.onclick = async () => {
            const subjectId = btn.dataset.id;
            const content = `
                <input type="text" id="lesson-title" placeholder="عنوان الدرس" class="mb-4" />
                <input type="text" id="lesson-url" placeholder="رابط الملف/الفيديو" class="mb-4" />
                <select id="lesson-type" class="mb-4" style="width:100%; padding:0.8rem;">
                    <option value="PDF">ملف (PDF)</option>
                    <option value="Video">فيديو</option>
                </select>
            `;
            const data = await UI.modal('إضافة درس', content, async () => {
                const title = document.getElementById('lesson-title').value;
                const url = document.getElementById('lesson-url').value;
                const type = document.getElementById('lesson-type').value;
                if (!title || !url) return false;
                
                await fetch('/api/admin/add-lesson', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject_id: subjectId, title, url, type })
                });
                return true;
            });
            if (data) {
                UI.toast('تمت الإضافة');
                window.router.resolve();
            }
        };
    });

    // Add Subject
    const addSubjectBtn = document.getElementById('add-subject-btn');
    if (addSubjectBtn) {
        addSubjectBtn.onclick = async () => {
            const content = `
                <input type="text" name="title" id="new-sub-title" placeholder="${i18n.t('title')}" class="mb-4" />
                <input type="text" name="code" id="new-sub-code" placeholder="${i18n.t('code')}" class="mb-4" />
                <textarea name="description" id="new-sub-desc" placeholder="${i18n.t('description')}" class="mb-4"></textarea>
                <label style="display:block; margin-bottom:0.5rem;">Pick Subject Color:</label>
                <input type="color" name="color" id="new-sub-color" value="#4f46e5" style="height: 50px;" />
            `;
            const data = await UI.modal(i18n.t('add_subject'), content, async () => {
                const title = document.getElementById('new-sub-title').value;
                const code = document.getElementById('new-sub-code').value;
                const description = document.getElementById('new-sub-desc').value;
                const color = document.getElementById('new-sub-color').value;

                if (!title || !code) return false;
                await api.addSubject({ title, code, description, color });
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        };
    }

    // Add Student
    const addStudentHandler = async () => {
        const content = `
            <input type="text" name="email" id="new-std-email" placeholder="student.id" class="mb-4" />
            <input type="password" name="password" id="new-std-pass" placeholder="Temporary Password" />
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Identifiers only (e.g. user001)</p>
        `;
        const data = await UI.modal(i18n.t('manage_students'), content, async (data) => {
            const email = document.getElementById('new-std-email').value;
            const password = document.getElementById('new-std-pass').value;
            if (!email || !password) return false;

            const res = await api.addStudent(email, password);
            if (res.success) {
                UI.toast(i18n.t('success'));
                return true;
            } else {
                UI.toast(res.error || i18n.t('error'), 'error');
                return false;
            }
        });
        if (data) window.router.resolve();
    };
    
    if (document.getElementById('add-student-btn')) {
        document.getElementById('add-student-btn').onclick = addStudentHandler;
    }

    // Reset Device
    document.querySelectorAll('.reset-device-btn').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            if (confirm(i18n.t('confirm_delete'))) {
                await api.resetDevice(id);
                UI.toast(i18n.t('success'));
                window.router.resolve();
            }
        };
    });

    // Subject Deletion
    document.querySelectorAll('.delete-subject-btn').forEach(btn => {
        btn.onclick = async () => {
            if (confirm(i18n.t('confirm_delete'))) {
                await api.deleteSubject(btn.dataset.id);
                window.router.resolve();
            }
        };
    });

    // Force Password Reset
    document.querySelectorAll('.force-reset-pw').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const content = `<input type="password" id="force-new-pw" placeholder="New Temporary Password" required />`;
            const data = await UI.modal(i18n.t('change_pw_title'), content, async () => {
                const newPw = document.getElementById('force-new-pw').value;
                if (!newPw) return false;
                await api.changePassword(id, newPw);
                UI.toast(i18n.t('success'));
                return true;
            });
        };
    });
};

export default AdminPage;
