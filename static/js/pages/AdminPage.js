/* AdminPage.js */
import { api } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const AdminPage = async () => {
    let subjects = [], users = [], announcements = [];
    try {
        subjects = await api.getSubjects();
        users = await api.getUsers();
        announcements = await api.getAnnouncements();
    } catch (e) {
        return `<div class="card error-card" style="padding: 2rem; color: #ef4444;"><h3>${i18n.t('error')}</h3><p>${e.message}</p></div>`;
    }

    window.deleteAnnouncement = async (id) => {
        if(confirm('حذف التبليغ؟')) { await api.deleteAnnouncement(id); location.reload(); }
    };
    window.editAnnouncement = async (id, content) => {
        const html = `<textarea id="edit-ann-content" style="height: 100px;">${content}</textarea>`;
        const data = await UI.modal('تعديل التبليغ', html, async () => {
            const newText = document.getElementById('edit-ann-content').value;
            if (!newText) return false;
            await api.updateAnnouncement(id, newText);
            return true;
        });
        if(data) location.reload();
    };
    window.deleteStudent = async (id, email) => {
        if(confirm(`هل أنت متأكد من حذف الطالب: ${email}؟\nسيتم حذفه نهائياً.`)) {
            await api.deleteUser(id);
            location.reload();
        }
    };

    return `
        <div class="header-section mb-4" style="display: flex; justify-content: space-between; align-items: center;">
            <div><h1>${i18n.t('admin_panel')}</h1><p>System Architecture & Cybersecurity Controls</p></div>
            <button class="btn" onclick="window.router.navigate('/')"><span>🏠 الصفحة الرئيسية</span></button>
        </div>

        <div class="grid-auto-fit" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
            
            <!-- Announcements -->
            <div class="card" style="grid-column: span 2;">
                <div class="flex-between mb-4">
                    <h3>📢 التبليغات</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="add-announcement-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;"><span>➕ جديد</span></button>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    ${announcements.map(a => `
                        <div style="padding: 1rem; border: 1px dashed var(--primary); border-radius: 8px; background: rgba(79, 70, 229, 0.05); display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;"><p style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 500;">${a.content}</p><span style="font-size: 0.85rem; color: var(--text-muted);">🕒 ${a.created_at || 'الآن'}</span></div>
                            <div style="display: flex; gap: 10px;">
                                <button onclick="window.editAnnouncement('${a.id}', '${a.content.replace(/'/g, "\\'")}')" style="background: #e0e7ff; border: 1px solid #6366f1; border-radius: 5px; color: #4338ca; padding: 5px 10px;">✏️</button>
                                <button onclick="window.deleteAnnouncement('${a.id}')" style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 5px; color: #b91c1c; padding: 5px 10px;">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                    ${announcements.length > 0 ? `<div style="margin-top:20px; text-align:center;"><button onclick="if(confirm('حذف الكل؟')){fetch('/api/announcements').then(r=>r.json()).then(d=>{d.forEach(a=>fetch('/api/announcements?id='+a.id,{method:'DELETE'}));setTimeout(()=>location.reload(),1000)})}" class="btn" style="background:#ef4444;color:white;padding:0.5rem 2rem;">⚠️ حذف الكل</button></div>` : ''}
                </div>
            </div>

            <!-- Subjects -->
            <div class="card">
                <div class="flex-between mb-4"><h3>${i18n.t('subjects')}</h3><button id="add-subject-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;"><span>➕ مادة</span></button></div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${subjects.map(s => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 10px;">
                            <div class="flex-between"><strong>${s.title} (${s.code})</strong><div><button class="btn edit-sub-btn" data-id="${s.id}" data-t="${s.title}" data-c="${s.code}" data-d="${s.description||''}" data-col="${s.color||'#4f46e5'}">✏️</button><button class="btn del-sub-btn" data-id="${s.id}" style="color: #ef4444;">🗑️</button></div></div>
                            <div style="margin-top: 1rem;"><button class="btn add-lesson-btn" data-id="${s.id}" style="width: 100%; border: 1px dashed var(--primary);">➕ أضف درس</button></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Students -->
            <div class="card">
                <div class="flex-between mb-4"><h3>${i18n.t('manage_students')}</h3><button id="add-student-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;"><span>➕ طالب</span></button></div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${users.filter(u => u.role === 'student').map(u => `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 8px;">
                            <div class="flex-between">
                                <strong>${u.email}</strong>
                                <span class="badge" style="background: ${u.device_id ? '#10b981' : '#f59e0b'}; color: white;">${u.device_id ? 'Linked' : 'Pending'}</span>
                            </div>
                            <div style="margin-top: 1rem; display: flex; gap: 5px;">
                                <button class="btn reset-device-btn" data-id="${u.id}" style="border: 1px solid var(--border); flex: 1;">🔄 Reset Device</button>
                                <button onclick="window.deleteStudent('${u.id}', '${u.email}')" class="btn" style="background: #fee2e2; border: 1px solid #ef4444; color: #b91c1c;">🗑️ حذف</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

AdminPage.init = () => {
    const addAnn = document.getElementById('add-announcement-btn');
    if(addAnn) addAnn.onclick = async () => {
        const d = await UI.modal('تبليغ جديد', `<textarea id="ac" style="height:100px"></textarea>`, async()=>{
            const t = document.getElementById('ac').value; if(!t)return false; await api.addAnnouncement(t); return true;
        });
        if(d) location.reload();
    };

    const addSub = document.getElementById('add-subject-btn');
    if(addSub) addSub.onclick = async () => {
        const c = `<input id="nst" placeholder="Name" class="mb-4"/><input id="nsc" placeholder="Code" class="mb-4"/><textarea id="nsd" placeholder="Desc" class="mb-4"></textarea><input type="color" id="nsco" value="#4f46e5" style="height:50px"/>`;
        const d = await UI.modal('مادة جديدة', c, async()=>{
            const t=document.getElementById('nst').value, co=document.getElementById('nsc').value, de=document.getElementById('nsd').value, col=document.getElementById('nsco').value;
            if(!t)return false; await api.addSubject({title:t,code:co,description:de,color:col}); return true;
        });
        if(d) location.reload();
    };

    const addStd = document.getElementById('add-student-btn');
    if(addStd) addStd.onclick = async () => {
        const d = await UI.modal('طالب جديد', `<input id="nse" placeholder="Email" class="mb-4"/><input type="password" id="nsp" placeholder="Pass"/>`, async()=>{
            const e=document.getElementById('nse').value, p=document.getElementById('nsp').value; if(!e||!p)return false;
            await api.addStudent(e,p); return true;
        });
        if(d) location.reload();
    };

    document.querySelectorAll('.edit-sub-btn').forEach(b => b.onclick = async () => {
        const {id,t,c:co,d:de,col} = b.dataset;
        const ht = `<input id="est" value="${t}" class="mb-4"/><input id="esc" value="${co}" class="mb-4"/><textarea id="esd" class="mb-4">${de}</textarea><input type="color" id="esco" value="${col}" style="height:50px"/>`;
        const r = await UI.modal('تعديل مادة', ht, async()=>{
            const nt=document.getElementById('est').value, nc=document.getElementById('esc').value, nd=document.getElementById('esd').value, ncol=document.getElementById('esco').value;
            await api.updateSubject(id, {title:nt,code:nc,description:nd,color:ncol}); return true;
        });
        if(r) location.reload();
    });

    document.querySelectorAll('.del-sub-btn').forEach(b => b.onclick = async () => {
        if(confirm('حذف المادة؟')) { await api.deleteSubject(b.dataset.id); location.reload(); }
    });

    document.querySelectorAll('.add-lesson-btn').forEach(b => b.onclick = async () => {
        const sid = b.dataset.id;
        const d = await UI.modal('درس جديد', `<input id="lt" placeholder="Title" class="mb-4"/><input id="lu" placeholder="URL" class="mb-4"/><select id="lty"><option value="PDF">PDF</option><option value="Video">Video</option></select>`, async()=>{
            const t=document.getElementById('lt').value, u=document.getElementById('lu').value, y=document.getElementById('lty').value; if(!t||!u)return false;
            await fetch('/api/admin/add-lesson', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject_id:parseInt(sid),title:t,url:u,type:y})}); return true;
        });
        if(d) { UI.toast('تمت الإضافة'); location.reload(); }
    });

    document.querySelectorAll('.reset-device-btn').forEach(b => b.onclick = async () => { if(confirm('Reset?')) { await api.resetDevice(b.dataset.id); location.reload(); } });
};

export default AdminPage;
