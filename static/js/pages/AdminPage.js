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

    // دوال الحذف والتعديل
    window.deleteAnnouncement = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا التبليغ؟')) {
            await api.deleteAnnouncement(id);
            location.reload(); 
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
        if (data) location.reload();
    };

    return `
        <div class="header-section mb-4" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1>${i18n.t('admin_panel')}</h1>
                <p>System Architecture & Cybersecurity Controls</p>
            </div>
            <button class="btn" onclick="window.router.navigate('/')" style="display: flex; align-items: center; gap: 8px; border: 1px solid var(--border);">
                <span>🏠 الصفحة الرئيسية</span>
            </button>
        </div>

        <div class="grid-auto-fit" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
            
            <!-- قسم التبليغات -->
            <div class="card" style="grid-column: span 2;">
                <div class="flex-between mb-4">
                    <h3>📢 التبليغات والإعلانات</h3>
                    <button id="add-announcement-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 8px;">
                        <span>➕ تبليغ جديد</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    ${announcements.length === 0 ? '<p style="color: var(--text-muted); text-align: center;">لا توجد تبليغات</p>' : ''}
                    ${announcements.map(a => `
                        <div style="padding: 1rem; border: 1px dashed var(--primary); border-radius: 8px; background: rgba(79, 70, 229, 0.05); display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <p style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-main); font-weight: 500;">${a.content}</p>
                                <span style="font-size: 0.85rem; color: var(--text-muted);">
                                    🕒 ${a.created_at || 'الآن'}
                                </span>
                            </div>
                            <!-- أزرار الحذف والتعديل (واضحة جداً) -->
                            <div style="display: flex; gap: 10px; margin-right: 15px;">
                                <button type="button" 
                                        onmousedown="window.editAnnouncement('${a.id}', '${a.content.replace(/'/g, "\\'")}')" 
                                        style="background: #e0e7ff; border: 1px solid #6366f1; border-radius: 5px; cursor: pointer; color: #4338ca; padding: 5px 10px; font-size: 1rem;" 
                                        title="تعديل">
                                    ✏️ تعديل
                                </button>
                                <button type="button" 
                                        onmousedown="window.deleteAnnouncement('${a.id}')" 
                                        style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 5px; cursor: pointer; color: #b91c1c; padding: 5px 10px; font-size: 1rem;" 
                                        title="حذف">
                                    🗑️ حذف
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- بقية الأقسام (المواد) -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>${i18n.t('subjects')}</h3>
                    <button id="add-subject-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                        <span>➕ إضافة مادة</span>
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${subjects.map(s => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 10px;">
                            <div class="flex-between">
                                <strong>${s.title} (${s.code})</strong>
                                <div>
                                    <button class="btn edit-subject-btn" data-id="${s.id}" data-title="${s.title}" data-code="${s.code}" data-desc="${s.description||''}" data-color="${s.color||'#4f46e5'}" style="margin-left:5px;">✏️</button>
                                    <button class="btn delete-subject-btn" data-id="${s.id}" style="color: #ef4444;">🗑️</button>
                                </div>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn add-lesson-btn" data-id="${s.id}" style="width: 100%; border: 1px dashed var(--primary); text-align: center;">
                                    ➕ أضف درس
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- الطلاب -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>${i18n.t('manage_students')}</h3>
                    <button id="add-student-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                        <span>➕ إضافة طالب</span>
                    </button>
                </div>
                 <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${users.filter(u => u.role === 'student').map(u => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                            <div class="flex-between">
                                <strong>${u.email}</strong>
                                <span class="badge" style="background: ${u.device_id ? '#10b981' : '#f59e0b'}; color: white;">${u.device_id ? 'Linked' : 'Pending'}</span>
                            </div>
                            <div style="margin-top: 1rem;">
                                <button class="btn reset-device-btn" data-id="${u.id}" style="border: 1px solid var(--border);">🔄 Reset Device</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

AdminPage.init = () => {
    // Add Announcement
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
};

export default AdminPage;
