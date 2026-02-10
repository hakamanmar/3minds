import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const AdminPage = async () => {
    let subjects = [];
    let users = [];
    let announcements = [];
    try {
        subjects = await api.getSubjects();
        users = await api.getUsers();
        announcements = await api.getAnnouncements();
    } catch (e) {
        console.error(e);
        return `<div class="card error-card" style="padding: 2rem; text-align: center; color: #ef4444;">
            <h3>${i18n.t('error')}</h3>
            <p>${e.message || 'Check Server Logs'}</p>
        </div>`;
    }

    // Bind delete function globally to fix any "click" issues
    window.deleteAnnouncement = async (id) => {
        if (confirm('هل أنت متأكد من حذف التبليغ؟')) {
            await api.deleteAnnouncement(id);
            window.router.resolve(); // Refresh page
        }
    };

    window.editAnnouncement = async (id, content) => {
        const html = `<textarea id="edit-ann-content" style="height: 100px;">${content}</textarea>`;
        const data = await UI.modal('تعديل التبليغ', html, async () => {
            const newText = document.getElementById('edit-ann-content').value;
            if (!newText) return false;
            await api.updateAnnouncement(id, newText);
            UI.toast('تم التعديل');
            return true;
        });
        if (data) window.router.resolve();
    };

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
            
            <!-- Announcements Management -->
            <div class="card" style="grid-column: span 2;">
                <div class="flex-between mb-4">
                    <h3>📢 التبليغات والإعلانات</h3>
                    <button id="add-announcement-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-plus"></i>
                        <span>تبليغ جديد</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${announcements.length === 0 ? '<p style="color: var(--text-muted); text-align: center;">لا توجد تبليغات</p>' : ''}
                    ${announcements.map(a => `
                        <div style="padding: 1rem; border: 1px dashed var(--primary); border-radius: 8px; background: rgba(79, 70, 229, 0.05); display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <p style="margin: 0 0 0.5rem 0; font-size: 1rem; color: var(--text-main); font-weight: 500;">${a.content}</p>
                                <span style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                                    <i class="ph ph-clock"></i> ${a.created_at}
                                </span>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn" onclick="window.editAnnouncement('${a.id}', '${a.content.replace(/'/g, "\\'")}')" style="color: var(--primary); border: none;">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                                <button class="btn" onclick="window.deleteAnnouncement('${a.id}')" style="color: #ef4444; border: none;">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Subject Management -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>${i18n.t('subjects')}</h3>
                    <button id="add-subject-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-plus"></i> <span>إضافة مادة</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${subjects.map(s => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 10px;">
                            <div class="flex-between">
                                <strong>${s.title} (${s.code})</strong>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn edit-subject-btn" data-id="${s.id}" data-title="${s.title}" data-code="${s.code}" data-desc="${s.description||''}" data-color="${s.color||'#4f46e5'}" style="color: var(--primary); border: 1px solid var(--border);">
                                        <i class="ph ph-pencil-simple"></i>
                                    </button>
                                    <button class="btn delete-subject-btn" data-id="${s.id}" style="color: #ef4444; border: 1px solid #ef4444;"><i class="ph ph-trash"></i></button>
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

            <!-- Student Management -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>${i18n.t('manage_students')}</h3>
                    <button id="add-student-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-user-plus"></i> <span>إضافة طالب</span>
                    </button>
                </div>
                <!-- ... users list ... -->
                 <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${users.filter(u => u.role === 'student').map(u => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                            <div class="flex-between">
                                <strong>${u.email}</strong>
                                <span class="badge" style="background: ${u.device_id ? '#10b981' : '#f59e0b'}; color: white;">${u.device_id ? 'Linked' : 'Pending'}</span>
                            </div>
                            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                <button class="btn reset-device-btn" data-id="${u.id}" style="font-size: 0.8rem; border: 1px solid var(--border);">${i18n.t('reset_device')}</button>
                                <button class="btn force-reset-pw" data-id="${u.id}" style="font-size: 0.8rem; border: 1px solid var(--border);">${i18n.t('force_reset')}</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

AdminPage.init = () => {
    // Only bind "Add" buttons here, delete/edit are bound globally in the render function
    const addAnnBtn = document.getElementById('add-announcement-btn');
    if (addAnnBtn) {
        addAnnBtn.onclick = async () => {
            const content = `<textarea id="ann-content" placeholder="اكتب نص التبليغ هنا..." style="height: 100px;"></textarea>`;
            const data = await UI.modal('إضافة تبليغ جديد', content, async () => {
                const text = document.getElementById('ann-content').value;
                if (!text) return false;
                await api.addAnnouncement(text);
                UI.toast('تم النشر');
                return true;
            });
            if (data) window.router.resolve();
        };
    }

    // Keep other button bindings (Subjects, Students, Lessons)...
    // (Copy pasting the same logic for other buttons as before for brevity, OR use the previous logic)
    // ...
    // Subject Logic
    document.querySelectorAll('.edit-subject-btn').forEach(btn => {
        btn.onclick = async () => {
            const { id, title, code, desc, color } = btn.dataset;
            const content = `
                <input type="text" id="edit-sub-title" value="${title}" class="mb-4" />
                <input type="text" id="edit-sub-code" value="${code}" class="mb-4" />
                <textarea id="edit-sub-desc" class="mb-4">${desc}</textarea>
                <input type="color" id="edit-sub-color" value="${color}" style="height: 50px;" />
            `;
            const data = await UI.modal('تعديل المادة', content, async () => {
                const t = document.getElementById('edit-sub-title').value;
                const c = document.getElementById('edit-sub-code').value;
                const d = document.getElementById('edit-sub-desc').value;
                const col = document.getElementById('edit-sub-color').value;
                if (!t) return false;
                await api.updateSubject(id, { title: t, code: c, description: d, color: col });
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        };
    });

    document.querySelectorAll('.delete-subject-btn').forEach(btn => {
        btn.onclick = async () => {
            if (confirm(i18n.t('confirm_delete'))) {
                await api.deleteSubject(btn.dataset.id);
                window.router.resolve();
            }
        };
    });

    if (document.getElementById('add-subject-btn')) {
        document.getElementById('add-subject-btn').onclick = async () => {
             const content = `<input type="text" id="new-sub-title" placeholder="${i18n.t('title')}" class="mb-4" /><input type="text" id="new-sub-code" placeholder="${i18n.t('code')}" class="mb-4" /><textarea id="new-sub-desc" placeholder="${i18n.t('description')}" class="mb-4"></textarea><input type="color" id="new-sub-color" value="#4f46e5" style="height: 50px;" />`;
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
    
    // Lesson & Student Logic (Existing code remains same)
    document.querySelectorAll('.add-lesson-btn').forEach(btn => {
        btn.onclick = async () => {
            const subjectId = btn.dataset.id;
            const content = `<input type="text" id="lesson-title" placeholder="عنوان الدرس" class="mb-4" /><input type="text" id="lesson-url" placeholder="رابط الملف/الفيديو" class="mb-4" /><select id="lesson-type" class="mb-4"><option value="PDF">ملف</option><option value="Video">فيديو</option></select>`;
            const data = await UI.modal('إضافة درس', content, async () => {
                const title = document.getElementById('lesson-title').value;
                const url = document.getElementById('lesson-url').value;
                const type = document.getElementById('lesson-type').value;
                if (!title || !url) return false;
                await fetch('/api/admin/add-lesson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_id: subjectId, title, url, type }) });
                return true;
            });
            if (data) { UI.toast('تمت الإضافة'); window.router.resolve(); }
        };
    });

    if (document.getElementById('add-student-btn')) {
        document.getElementById('add-student-btn').onclick = async () => {
             const content = `<input type="text" id="new-std-email" placeholder="student.id" class="mb-4" /><input type="password" id="new-std-pass" placeholder="Password" />`;
             const data = await UI.modal(i18n.t('manage_students'), content, async () => {
                const e = document.getElementById('new-std-email').value;
                const p = document.getElementById('new-std-pass').value;
                if(!e || !p) return false;
                await api.addStudent(e, p);
                UI.toast('Success');
                return true;
            });
            if (data) window.router.resolve();
        };
    }

    document.querySelectorAll('.reset-device-btn').forEach(btn => {
        btn.onclick = async () => { if(confirm('Reset Device?')) { await api.resetDevice(btn.dataset.id); window.router.resolve(); } };
    });
    
    document.querySelectorAll('.force-reset-pw').forEach(btn => {
         btn.onclick = async () => {
            const content = `<input type="password" id="force-new-pw" required />`;
            await UI.modal('Reset Pass', content, async () => {
                const p = document.getElementById('force-new-pw').value;
                if(!p) return false;
                await api.changePassword(btn.dataset.id, p);
                return true;
            });
        };
    });
};

export default AdminPage;
