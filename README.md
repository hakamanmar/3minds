# AcademicHub - Student Platform MVP

A secure, scalable educational web platform designed for university students and administrators.

## Features

- **Role-Based Access Control (RBAC)**: secure login for Students and Admins.
- **Subject Dashboard**: 8 distinct university subjects displayed as modern cards.
- **Content Management**: Admins can upload PDFs, videos, and images.
- **Student Access**: Read-only access for students to view and download materials.
- **AI Integration**: Mocked AI assistant to summarize lectures and generate questions.
- **Responsive Design**: Beautiful, mobile-friendly interface using modern CSS.

## Tech Stack

- **Frontend**: HTML5, CSS3 (Custom Design System), Vanilla JavaScript (ES Modules).
- **Backend**: Python (Flask).
- **Database**: SQLite (built-in, zero config).
- **Auth**: Session-based/JWT-ready (currently simple password hashing).

## Setup & Run

1. **Install Dependencies**
   Ensure you have Python installed.
   ```bash
   pip install flask
   ```

2. **Run the Server**
   ```bash
   python app.py
   ```

3. **Access the App**
   Open your browser and navigate to: `http://127.0.0.1:5000`

## Default Credentials

### Admin (Full Access)
- **Email**: `admin@uni.edu`
- **Password**: `admin123`

### Student (Read-Only)
- **Email**: `student@uni.edu`
- **Password**: `student123`

## Project Structure

```
academic-platform/
├── app.py              # Flask Backend & Database Logic
├── academic.db         # SQLite Database (Auto-created)
├── uploads/            # Secure File Storage
├── templates/
│   └── index.html      # Main Application Shell
└── static/
    ├── css/            # Styling (Variables, Reset, Layout)
    └── js/             # Frontend Logic
        ├── main.js     # Router & State
        ├── api.js      # API Client
        └── pages/      # Page Components
```
