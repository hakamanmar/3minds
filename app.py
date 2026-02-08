import os
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-123')

def get_db():
    # هذا السطر يسحب الرابط من إعدادات فيرسيل تلقائياً
    return psycopg2.connect(os.environ.get('POSTGRES_URL'))

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "student", device_id TEXT, must_change_pw INTEGER DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, title TEXT, code TEXT, description TEXT, color TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS lessons (id SERIAL PRIMARY KEY, subject_id INTEGER, title TEXT, url TEXT, type TEXT)')
    
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0] == 0:
        # حساب الأدمن الرئيسي
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)', 
                  ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
    conn.commit()
    c.close()
    conn.close()

@app.before_request
def startup():
    # الحساب يتفعل مرة واحدة عند أول طلب
    try:
        init_db()
    except:
        pass

@app.route('/')
@app.route('/login')
@app.route('/admin')
@app.route('/subjects')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    try:
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT * FROM users WHERE email = %s', (data.get('email'),))
        user = c.fetchone()
        c.close()
        conn.close()
        
        if user and check_password_hash(user['password'], data.get('password')):
            return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
        return jsonify({'success': False, 'message': 'بيانات غلط'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run()
