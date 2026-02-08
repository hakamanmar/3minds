import os
import psycopg2
from flask import Flask, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from vercel_blob import put

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key')

# Connect to Vercel Postgres
def get_db():
    conn = psycopg2.connect(os.environ.get('POSTGRES_URL'))
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "student", device_id TEXT, must_change_pw INTEGER DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, title TEXT, description TEXT, code TEXT, color TEXT)')
    
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)', 
                  ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
    conn.commit()
    c.close()
    conn.close()

@app.before_request
def startup():
    # We only init once or check if tables exist
    pass

@app.route('/')
@app.route('/login')
@app.route('/admin')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM users WHERE email = %s', (data.get('email'),))
    user = c.fetchone()
    c.close()
    conn.close()
    if user and check_password_hash(user['password'], data.get('password')):
        return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

# --- لإضافة مادة أو ملف ---
@app.route('/api/upload', methods=['POST'])
def upload_to_cloud():
    file = request.files.get('file')
    if file:
        # يرفع الملف مباشرة لمخزن Blob السحابي
        resp = put(file.filename, file.read(), {'access': 'public'})
        return jsonify({'url': resp['url']})
    return jsonify({'error': 'No file'}), 400

if __name__ == '__main__':
    # Initialize DB (Run this manually once or here)
    try: init_db()
    except: pass
    app.run()
