import os
import sqlite3
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import time

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'dev-secret-key'

# Vercel fix: Use /tmp for everything because root is read-only
DB_PATH = '/tmp/academic.db'
UPLOAD_FOLDER = '/tmp/uploads'

if not os.path.exists(UPLOAD_FOLDER):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    except:
        pass

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
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ('admin@uni.edu', generate_password_hash('admin123'), 'admin'))
        c.execute('INSERT INTO subjects (title, description, code, color) VALUES (?, ?, ?, ?)', ('Computer Science', 'Intro', 'CS101', '#4F46E5'))
    conn.commit()
    conn.close()

# Initialize DB on first request
@app.before_request
def startup():
    if not os.path.exists(DB_PATH):
        init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (data.get('email'),)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], data.get('password')):
        return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])

# Add other basic routes if needed, or keep it minimal to test
if __name__ == '__main__':
    app.run(debug=True)

