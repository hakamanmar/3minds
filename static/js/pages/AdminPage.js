import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const AdminPage = async () => {
    const subjects = await api.getSubjects();
    const users = await api.getUsers();

    return `
        <div class="header-section mb-4">
            <h1>لوحة الممثلين (الأدمن)</h1>
            <p>إدارة المواد، الطلاب، والملفات السحابية</p>
        </div>

        <div class="grid-auto-fit" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
            <!-- إدارة المواد -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>المواد الدراسية</h3>
                    <button id="add-subject-btn" class="btn btn-primary" style="padding: 0.5rem;">
                        <i class="ph ph-plus"></i> إضافة مادة
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${subjects.map(s => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 10px;">
                            <div class="flex-between">
                                <strong>${s.title} (${s.code})</strong>
                                <button class="btn add-lesson-btn" data-id="${s.id}" style="color:var(--primary);">
                                    <i class="ph ph-file-plus"></i> أضف ملف
                                </button>
                            </div>
                            <button class="btn delete-subject-btn mt-2" data-id="${s.id}" style="color: #ef4444; font-size: 0.8rem;">
                                <i class="ph ph-trash"></i> حذف المادة
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- إدارة الطلاب -->
            <div class="card">
                <div class="flex-between mb-4">
                    <h3>إدارة الطلاب</h3>
                    <button id="add-student-btn" class="btn btn-primary" style="padding: 0.5rem;">
                        <i class="ph ph-user-plus"></i> إضافة طالب
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${users.filter(u => u.role === 'student').map(u => `
                        <div style="padding: 0.8rem; border: 1px solid var(--border); border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
                            <span>${u.email}</span>
                            <button class="btn reset-device-btn" data-id="${u.id}" style="font-size: 0.7rem; border:1px solid #ccc;">تصفير الجهاز</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

AdminPage.init = () => {
    // إضافة درس/ملف جديد
    document.querySelectorAll('.add-lesson-btn').forEach(btn => {
        btn.onclick = async () => {
            const subjectId = btn.dataset.id;
            const content = `
                <input type="text" id="lesson-title" placeholder="عنوان الدرس (مثلاً: المحاضرة الأولى)" class="mb-4" />
                <input type="text" id="lesson-url" placeholder="رابط الملف (Google Drive أو غيره)" class="mb-4" />
                <select id="lesson-type" class="mb-4" style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);">
                    <option value="PDF">كتاب / ملزمة (PDF)</option>
                    <option value="Video">فيديو (YouTube/Drive)</option>
                </select>
            `;
            const data = await UI.modal('إضافة درس جديد', content, async () => {
                const title = document.getElementById('lesson-title').value;
                const url = document.getElementById('lesson-url').value;
                const type = document.getElementById('lesson-type').value;
                if (!title || !url) return false;
                await api.addLesson({ subject_id: subjectId, title, url, type });
                return true;
            });
            if (data) UI.toast('تمت الإضافة بنجاح');
        };
    });

    // إضافة مادة
    document.getElementById('add-subject-btn').onclick = async () => {
        const content = `
            <input type="text" id="new-sub-title" placeholder="اسم المادة" class="mb-4" />
            <input type="text" id="new-sub-code" placeholder="رمز المادة" class="mb-4" />
        `;
        const data = await UI.modal('إضافة مادة', content, async () => {
            const title = document.getElementById('new-sub-title').value;
            const code = document.getElementById('new-sub-code').value;
            if (title && code) {
                await api.addSubject({ title, code, description: '', color: '#4f46e5' });
                return true;
            }
            return false;
        });
        if (data) window.router.resolve();
    };

    // إضافة طالب
    document.getElementById('add-student-btn').onclick = async () => {
        const content = `
            <input type="text" id="std-email" placeholder="إيميل الطالب" class="mb-4" />
            <input type="password" id="std-pass" placeholder="كلمة السر المؤقتة" />
        `;
        const data = await UI.modal('إضافة طالب', content, async () => {
            const email = document.getElementById('std-email').value;
            const pass = document.getElementById('std-pass').value;
            if (email && pass) {
                await api.addStudent(email, pass);
                return true;
            }
            return false;
        });
        if (data) window.router.resolve();
    };
};

export default AdminPage;
