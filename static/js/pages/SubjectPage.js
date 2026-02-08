import { api } from '../api.js';

const SubjectPage = async (params) => {
    const lessons = await api.getLessons(params.id);

    return `
        <div class="header-section">
            <h1>مواد الدراسة</h1>
            <p>يمكنك قراءة الملفات مباشرة أو تحميلها لجهازك</p>
        </div>

        <div class="grid-auto-fit mt-4">
            ${lessons.length ? lessons.map(lesson => `
                <div class="card">
                    <h3>${lesson.title}</h3>
                    <div style="display:flex; gap:0.5rem; margin-top:1.5rem;">
                        <button class="btn btn-primary view-btn" data-url="${lesson.url}" style="flex:1;">
                            <i class="ph ph-eye"></i> قراءة
                        </button>
                        <a href="${lesson.url}" target="_blank" download class="btn" style="flex:1; border:1px solid var(--border); text-align:center; text-decoration:none; color:inherit;">
                            <i class="ph ph-download"></i> تحميل
                        </a>
                    </div>
                </div>
            `).join('') : '<p>لا توجد ملفات حالياً</p>'}
        </div>

        <div id="file-viewer" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; padding:20px;">
             <button id="close-v" style="position:absolute; right:20px; top:10px; font-size:30px; color:white; background:none; border:none; cursor:pointer;">&times;</button>
             <iframe id="v-iframe" src="" style="width:100%; height:100%; border:none; border-radius:10px; background:white;"></iframe>
        </div>
    `;
};

SubjectPage.init = () => {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.onclick = () => {
            let url = btn.dataset.url;
            if (url.includes('drive.google.com')) url = url.replace('/view', '/preview');
            document.getElementById('v-iframe').src = url;
            document.getElementById('file-viewer').style.display = 'block';
        };
    });
    document.getElementById('close-v').onclick = () => {
        document.getElementById('file-viewer').style.display = 'none';
        document.getElementById('v-iframe').src = '';
    };
};

export default SubjectPage;
