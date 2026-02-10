/* api.js - COMPLETE AND FIXED */
const API_BASE = '/api';

export const auth = {
    getUser() {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    },
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
        localStorage.removeItem('user');
        window.location.href = '/';
    }
};

export const api = {
    async _fetch(url, options = {}) {
        const user = auth.getUser();
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (user && user.role) headers['X-User-Role'] = user.role;
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw { status: res.status, message: err.message || res.statusText };
        }
        return res.json();
    },

    // Auth
    async login(email, password) {
        return this._fetch(`${API_BASE}/login`, { method: 'POST', body: JSON.stringify({ email, password }) });
    },
    async changePassword(user_id, password) {
        return this._fetch(`${API_BASE}/change-password`, { method: 'POST', body: JSON.stringify({ user_id, password }) });
    },

    // Subjects (THE MISSING FUNCTION IS HERE NOW)
    async getSubjects() { return this._fetch(`${API_BASE}/subjects`); },
    
    async getSubject(id) { // <--- THIS WAS MISSING
        return this._fetch(`${API_BASE}/subjects/${id}`); 
    },
    
    async addSubject(data) { return this._fetch(`${API_BASE}/subjects`, { method: 'POST', body: JSON.stringify(data) }); },
    async updateSubject(id, data) { return this._fetch(`${API_BASE}/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteSubject(id) { return this._fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' }); },

    // Lessons
    async getLessons(subjectId) { return this._fetch(`${API_BASE}/subjects/${subjectId}/lessons`); },
    async addLesson(data) { return this._fetch(`${API_BASE}/admin/add-lesson`, { method: 'POST', body: JSON.stringify(data) }); },
    async deleteLesson(id) { return this._fetch(`${API_BASE}/lessons/${id}`, { method: 'DELETE' }); },
    
    // Legacy support just in case
    async deleteFile(id) { return this.deleteLesson(id); },

    // Users
    async getUsers() { return this._fetch(`${API_BASE}/users`); },
    async deleteUser(id) { return this._fetch(`${API_BASE}/users?id=${id}`, { method: 'DELETE' }); },
    async addStudent(email, password) { return this._fetch(`${API_BASE}/admin/add-student`, { method: 'POST', body: JSON.stringify({ email, password }) }); },
    async resetDevice(user_id) { return this._fetch(`${API_BASE}/admin/reset-device`, { method: 'POST', body: JSON.stringify({ user_id }) }); },

    // Announcements
    async getAnnouncements() { return this._fetch(`${API_BASE}/announcements`); },
    async addAnnouncement(content) { return this._fetch(`${API_BASE}/announcements`, { method: 'POST', body: JSON.stringify({ content }) }); },
    async updateAnnouncement(id, content) { return this._fetch(`${API_BASE}/announcements?id=${id}`, { method: 'PUT', body: JSON.stringify({ content }) }); },
    async deleteAnnouncement(id) { return this._fetch(`${API_BASE}/announcements?id=${id}`, { method: 'DELETE' }); }
};
