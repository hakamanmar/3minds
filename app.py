import os
import sqlite3
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

# إعداد الشغل ليناسب الحاسبة والموبايل
app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'dev-secret-key'

# قاعدة البيانات بالمكان المسموح فيه أونلاين
DB_PATH = '/tmp/academic.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "student", device_id TEXT, must_change_pw INTEGER DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, code TEXT, color TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    c.execute('CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, filename TEXT, filepath TEXT, file_type TEXT, uploaded_by INTEGER, uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ('rep1@3minds.edu', generate_password_hash('rep123'), 'editor'))
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ('rep2@3minds.edu', generate_password_hash('rep123'), 'editor'))
        c.execute('INSERT INTO users (email, password, role, must_change_pw) VALUES (?, ?, ?, 1)', ('student@3minds.edu', generate_password_hash('student123'), 'student'))
        c.execute('INSERT INTO subjects (title, description, code, color) VALUES (?, ?, ?, ?)', ('Academic Excellence', 'Platform Overview', 'ACAD101', '#4F46E5'))
    conn.commit()
    conn.close()

@app.before_request
def startup():
    if not os.path.exists(DB_PATH):
        init_db()

@app.route('/')
@app.route('/login')
@app.route('/admin')
@app.route('/subjects')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (data.get('email'),)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], data.get('password')):
        return jsonify({'success': True, 'must_reset': bool(user['must_change_pw']), 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    users = conn.execute('SELECT id, email, role, device_id FROM users').fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])

if __name__ == '__main__':
    app.run()
