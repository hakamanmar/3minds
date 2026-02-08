import os
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secure-key-2026')

# وظيفة الربط مع قاعدة البيانات السحابية
def get_db():
    url = os.environ.get('POSTGRES_URL')
    if not url:
        raise Exception("POSTGRES_URL is missing in Vercel settings!")
    return psycopg2.connect(url)

# تهيئة الجداول (تُنفذ مرة واحدة أو عند الحاجة)
def init_db():
    conn = get_db()
    c = conn.cursor()
    # مستخدمين
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, device_id TEXT)''')
    # مواد
    c.execute('''CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY, title TEXT, code TEXT, description TEXT, color TEXT)''')
    # ملفات ودروس
    c.execute('''CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY, subject_id INTEGER, title TEXT, url TEXT, type TEXT)''')
    
    # التأكد من وجود الأدمن
    c.execute('SELECT count(*) FROM users WHERE email = %s', ('admin@3minds.edu',))
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)', 
                  ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
    
    conn.commit()
    c.close()
    conn.close()

# محاولة تهيئة القاعدة عند بدء التشغيل
try:
    init_db()
    print("Database Initialized Successfully")
except Exception as e:
    print(f"DB Init Error: {e}")

@app.route('/')
@app.route('/login')
@app.route('/admin')
@app.route('/subjects')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data: return jsonify({'success': False}), 400
    
    try:
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT * FROM users WHERE email = %s', (data.get('email'),))
        user = c.fetchone()
        c.close()
        conn.close()
        
        if user and check_password_hash(user['password'], data.get('password')):
            return jsonify({
                'success': True, 
                'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}
            })
        return jsonify({'success': False, 'message': 'بيانات غلط'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': f"Internal Error: {str(e)}"}), 500

# باقي الـ API لم يتغير...
@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM subjects')
    subs = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(s) for s in subs])

if __name__ == '__main__':
    app.run()
