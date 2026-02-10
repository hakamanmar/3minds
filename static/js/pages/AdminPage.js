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

    return `
    <div id="admin-container">
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
                        <i class="ph ph-plus"></i> <span>تبليغ جديد</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${announcements.length === 0 ? '<p style="color: var(--text-muted); text-align: center;">لا توجد تبليغات</p>' : ''}
                    ${announcements.map(a => `
                        <div style="padding: 0.8rem; border: 1px dashed var(--primary); border-radius: 8px; background: rgba(79, 70, 229, 0.05); display: flex; justify-content: space-between; align-items: center;">
                            <p style="margin: 0; width: 80%;">${a.content}</p>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn edit-ann-btn" data-id="${a.id}" data-content="${a.content}" style="color: var(--primary); border: none;">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                                <button class="btn delete-ann-btn" data-id="${a.id}" style="color: #ef4444; border: none;">
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
                <!-- ... Subjects List ... -->
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
    </div>
    `;
};

AdminPage.init = () => {
    const container = document.getElementById('admin-container');
    if (!container) return;

    // Smart Click Listener (Event Delegation)
    container.addEventListener('click', async (e) => {
        const target = e.target;

        // 1. DELETE ANNOUNCEMENT
        if (target.closest('.delete-ann-btn')) {
            const btn = target.closest('.delete-ann-btn');
            if (confirm('هل أنت متأكد من حذف التبليغ؟')) {
                await api.deleteAnnouncement(btn.dataset.id);
                window.router.resolve();
            }
        }

        // 2. EDIT ANNOUNCEMENT
        if (target.closest('.edit-ann-btn')) {
            const btn = target.closest('.edit-ann-btn');
            const { id, content } = btn.dataset;
            const html = `<textarea id="edit-ann-content" style="height: 100px;">${content}</textarea>`;
            
            const data = await UI.modal('تعديل التبليغ', html, async () => {
                const newText = document.getElementById('edit-ann-content').value;
                if (!newText) return false;
                await api.updateAnnouncement(id, newText);
                UI.toast('تم التعديل');
                return true;
            });
            if (data) window.router.resolve();
        }

        // 3. DELETE SUBJECT
        if (target.closest('.delete-subject-btn')) {
            const btn = target.closest('.delete-subject-btn');
            if (confirm(i18n.t('confirm_delete'))) {
                await api.deleteSubject(btn.dataset.id);
                window.router.resolve();
            }
        }

        // 4. ADD ANNOUNCEMENT BUTTON
        if (target.closest('#add-announcement-btn')) {
            const content = `<textarea id="ann-content" placeholder="اكتب نص التبليغ هنا..." style="height: 100px;"></textarea>`;
            const data = await UI.modal('إضافة تبليغ جديد', content, async () => {
                const text = document.getElementById('ann-content').value;
                if (!text) return false;
                await api.addAnnouncement(text);
                UI.toast('تم النشر');
                return true;
            });
            if (data) window.router.resolve();
        }

        // 5. ADD SUBJECT BUTTON
        if (target.closest('#add-subject-btn')) {
             const content = `
                <input type="text" name="title" id="new-sub-title" placeholder="${i18n.t('title')}" class="mb-4" />
                <input type="text" name="code" id="new-sub-code" placeholder="${i18n.t('code')}" class="mb-4" />
                <textarea name="description" id="new-sub-desc" placeholder="${i18n.t('description')}" class="mb-4"></textarea>
                <label style="display:block; margin-bottom:0.5rem;">Pick Color:</label>
                <input type="color" name="color" id="new-sub-color" value="#4f46e5" style="height: 50px;" />
            `;
            const data = await UI.modal(i18n.t('add_subject'), content, async () => {
                const t = document.getElementById('new-sub-title').value;
                const c = document.getElementById('new-sub-code').value;
                const d = document.getElementById('new-sub-desc').value;
                const col = document.getElementById('new-sub-color').value;
                if (!t || !c) return false;
                await api.addSubject({ title: t, code: c, description: d, color: col });
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        }

        // 6. ADD STUDENT BUTTON
        if (target.closest('#add-student-btn')) {
             const content = `<input type="text" id="new-std-email" placeholder="student.id" class="mb-4" /><input type="password" id="new-std-pass" placeholder="Password" />`;
             const data = await UI.modal(i18n.t('manage_students'), content, async () => {
                const e = document.getElementById('new-std-email').value;
                const p = document.getElementById('new-std-pass').value;
                if (!e || !p) return false;
                const res = await api.addStudent(e, p);
                if(res.success) { UI.toast('Success'); return true; } 
                else { UI.toast('Error', 'error'); return false; }
             });
             if (data) window.router.resolve();
        }

        // 7. EDIT SUBJECT
        if (target.closest('.edit-subject-btn')) {
            const btn = target.closest('.edit-subject-btn');
            const { id, title, code, desc, color } = btn.dataset;
            const content = `
                <input type="text" id="edit-sub-title" value="${title}" class="mb-4" />
                <input type="text" id="edit-sub-code" value="${code}" class="mb-4" />
                <textarea id="edit-sub-desc" class="mb-4">${desc}</textarea>
                <input type="color" id="edit-sub-color" value="${color}" style="height: 50px;" />
            `;
            const data = await UI.modal('Edit Subject', content, async () => {
                const t = document.getElementById('edit-sub-title').value;
                const c = document.getElementById('edit-sub-code').value;
                const d = document.getElementById('edit-sub-desc').value;
                const col = document.getElementById('edit-sub-color').value;
                if(!t) return false;
                await api.updateSubject(id, {title:t, code:c, description:d, color:col});
                return true;
            });
            if(data) window.router.resolve();
        }
        
        // 8. ADD LESSON
        if (target.closest('.add-lesson-btn')) {
            const btn = target.closest('.add-lesson-btn');
            const subjectId = btn.dataset.id;
            const content = `
                <input type="text" id="lesson-title" placeholder="عنوان الدرس" class="mb-4" />
                <input type="text" id="lesson-url" placeholder="رابط الملف/الفيديو" class="mb-4" />
                <select id="lesson-type" class="mb-4" style="width:100%"><option value="PDF">ملف</option><option value="Video">فيديو</option></select>
            `;
            const data = await UI.modal('Add Lesson', content, async () => {
                const t = document.getElementById('lesson-title').value;
                const u = document.getElementById('lesson-url').value;
                const type = document.getElementById('lesson-type').value;
                if (!t || !u) return false;
                await fetch('/api/admin/add-lesson', {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({subject_id: subjectId, title: t, url: u, type})
                });
                return true;
            });
            if(data) window.router.resolve();
        }

        // 9. RESET DEVICE
        if (target.closest('.reset-device-btn')) {
            const btn = target.closest('.reset-device-btn');
            if(confirm('Reset Device?')) {
                await api.resetDevice(btn.dataset.id);
                window.router.resolve();
            }
        }
        
        // 10. FORCE RESET PASS
        if (target.closest('.force-reset-pw')) {
            const btn = target.closest('.force-reset-pw');
            const content = `<input type="password" id="force-new-pw" required />`;
            await UI.modal('Reset Pass', content, async () => {
                const p = document.getElementById('force-new-pw').value;
                if(!p) return false;
                await api.changePassword(btn.dataset.id, p);
                return true;
            });
        }
    });
};

export default AdminPage;
