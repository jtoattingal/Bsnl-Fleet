import express from 'express';
import path from 'path';
import fs from 'fs';
import { DB, initDatabase } from './server/db';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, type } = req.body;
    if (type === 'admin') {
      const settings = await DB.getSettings();
      const adminPass = settings.adminPassword || 'Bsnlatt';
      if (password === adminPass) {
        return res.json({
          success: true,
          isAdmin: true,
          user: { id: 'admin', username: 'admin', name: 'Administrator', designation: 'System Admin', active: true }
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid admin password' });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await DB.getUserByUsername(username);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.active) return res.status(403).json({ success: false, message: 'Account inactive' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Incorrect password' });

    return res.json({
      success: true,
      isAdmin: false,
      user: { id: user.id, username: user.username, name: user.name, designation: user.designation, active: user.active }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Entries API
app.get('/api/entries', async (req, res) => {
  try {
    const entries = await DB.getEntries();
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/entries', async (req, res) => {
  try {
    const entryData = req.body;
    if (!entryData.id) entryData.id = Date.now().toString();
    const saved = await DB.saveEntry(entryData);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  try {
    const saved = await DB.saveEntry({ ...req.body, id: req.params.id });
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    await DB.deleteEntry(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const users = await DB.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const saved = await DB.createUser({
      id: Date.now().toString(),
      ...req.body,
      password: req.body.password || 'Bsnl',
      active: true
    });
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await DB.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await DB.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Frontend Static Files Serve
const clientDistPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start Server
initDatabase().catch(err => console.warn('Database init notice:', err.message)).finally(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Application running successfully on port ${PORT}`);
  });
});

export default app;
