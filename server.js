const express = require('express');
const session = require('express-session');
const path = require('path');

require('./database/db'); // initialize schema

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'haqcademy-lms-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use('/api', require('./routes/api'));
app.use('/api/admin', require('./routes/admin-api'));

const sendPage = (page) => (req, res) =>
  res.sendFile(path.join(__dirname, 'public', page));

app.get('/', sendPage('index.html'));
app.get('/dashboard', sendPage('dashboard.html'));
app.get('/course/:id', sendPage('course.html'));
app.get('/lesson/:id', sendPage('lesson.html'));
app.get('/certificate/:courseId', sendPage('certificate.html'));
app.get('/admin', sendPage('admin/index.html'));
app.get('/admin/*', sendPage('admin/index.html'));

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║      Haq-Cademy LMS is Running!        ║');
  console.log(`║  http://localhost:${PORT}                  ║`);
  console.log('║  Admin: /admin  (admin/haqcademy2024)  ║');
  console.log('╚════════════════════════════════════════╝\n');
});
