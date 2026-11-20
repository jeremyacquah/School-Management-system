const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload and report folders exist
const uploadsDir = path.resolve(__dirname, '../uploads');
const reportsDir = path.resolve(__dirname, '../reports');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

// Static file serving for uploads & reports
app.use('/uploads', express.static(uploadsDir));
app.use('/reports', express.static(reportsDir));

// Serve production frontend dist
const distDir = path.resolve(__dirname, '../frontend/dist');

// Universal asset fallback to guarantee no stale cache crashes on mismatched bundle hashes
app.get('/assets/*.js', (req, res, next) => {
  const filePath = path.join(distDir, req.path);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const jsBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    if (jsBundle) {
      res.setHeader('Content-Type', 'application/javascript');
      return res.sendFile(path.join(assetsDir, jsBundle));
    }
  }
  next();
});

app.get('/assets/*.css', (req, res, next) => {
  const filePath = path.join(distDir, req.path);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const cssBundle = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
    if (cssBundle) {
      res.setHeader('Content-Type', 'text/css');
      return res.sendFile(path.join(assetsDir, cssBundle));
    }
  }
  next();
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/terms', require('./routes/terms_weeks.routes'));
app.use('/api/weeks', require('./routes/terms_weeks.routes'));
app.use('/api/students', require('./routes/students.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/grades', require('./routes/grades.routes'));
app.use('/api/fees', require('./routes/fees.routes'));
app.use('/api/timetable', require('./routes/timetable.routes'));
app.use('/api/notices', require('./routes/notices.routes'));
app.use('/api/library', require('./routes/library.routes'));
app.use('/api/exams', require('./routes/exams.routes'));
app.use('/api/assets', require('./routes/assets.routes'));
app.use('/api/audit-logs', require('./routes/audit.routes'));
app.use('/api/sync', require('./routes/sync.routes'));
app.use('/api/files', require('./routes/files.routes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'School Management System API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA routing only (never for missing assets or api)
if (fs.existsSync(distDir)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/assets')) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else {
      res.status(404).send('Not found');
    }
  });
}

// Start Server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`School Management System API Server`);
    console.log(`Running on port: ${PORT}`);
    console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database on startup:', err);
});
