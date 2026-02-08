import os
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-123')

def get_db():
    return psycopg2.connect(os.environ.get('POSTGRES_URL'))

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, device_id TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, title TEXT, description TEXT, code TEXT, color TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS lessons (id SERIAL PRIMARY KEY, subject_id INTEGER, title TEXT, url TEXT, type TEXT)')
    
    c.execute('SELECT count(*) FROM users WHERE email=%s', ('admin@3minds.edu',))
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)', 
                  ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
    conn.commit()
    c.close()
    conn.close()

try: 
    init_db()
except: 
    pass

@app.route('/')
@app.route('/login')
@app.route('/admin')
@app.route('/subjects')
@app.route('/subject/<int:id>')
def index(id=None):
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
    return jsonify({'success': False}), 401

@app.route('/api/subjects', methods=['GET', 'POST'])
def handle_subjects():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'POST':
        data = request.json
        c.execute('INSERT INTO subjects (title, description, code, color) VALUES (%s, %s, %s, %s)',
                  (data['title'], data['description'], data['code'], data['color']))
        conn.commit()
        c.close()
        conn.close()
        return jsonify({'success': True})
    
    c.execute('SELECT * FROM subjects')
    subs = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(s) for s in subs])

@app.route('/api/subjects/<int:id>', methods=['GET', 'DELETE'])
def handle_subject(id):
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'DELETE':
        c.execute('DELETE FROM lessons WHERE subject_id = %s', (id,))
        c.execute('DELETE FROM subjects WHERE id = %s', (id,))
        conn.commit()
        c.close()
        conn.close()
        return jsonify({'success': True})
    
    c.execute('SELECT * FROM subjects WHERE id = %s', (id,))
    subject = c.fetchone()
    c.close()
    conn.close()
    return jsonify(dict(subject) if subject else {})

@app.route('/api/subjects/<int:id>/lessons', methods=['GET'])
def get_lessons(id):
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM lessons WHERE subject_id = %s', (id,))
    lessons = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(l) for l in lessons])

@app.route('/api/admin/add-lesson', methods=['POST'])
def add_lesson():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('INSERT INTO lessons (subject_id, title, url, type) VALUES (%s, %s, %s, %s)',
              (data['subject_id'], data['title'], data['url'], data['type']))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/lessons/<int:id>', methods=['DELETE'])
def delete_lesson(id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM lessons WHERE id = %s', (id,))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT id, email, role, device_id FROM users')
    users = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/admin/add-student', methods=['POST'])
def add_student():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)',
                  (data['email'], generate_password_hash(data['password']), 'student'))
        conn.commit()
        return jsonify({'success': True})
    except:
        return jsonify({'success': False, 'error': 'Exists'})
    finally:
        c.close()
        conn.close()

@app.route('/api/admin/reset-device', methods=['POST'])
def reset_device():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET device_id = NULL WHERE id = %s', (data['user_id'],))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET password = %s WHERE id = %s', 
              (generate_password_hash(data['password']), data['user_id']))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run()
