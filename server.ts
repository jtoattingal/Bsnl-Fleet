import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DB, initDatabase } from './server/db';

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
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
          user: {
            id: 'admin',
            username: 'admin',
            name: 'Administrator',
            designation: 'System Admin',
            active: true,
          },
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid admin password' });
    }

    // User login
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await DB.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, message: 'Account is inactive. Contact Administrator.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    return res.json({
      success: true,
      isAdmin: false,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        designation: user.designation,
        active: user.active,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change user password
app.post('/api/auth/user-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const user = await DB.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.password !== currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }

    await DB.updateUser(userId, { password: newPassword });
    res.json({ success: true, message: 'Password updated successfully' });
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

    // Start from September 2026 onwards
    if (entryData.date && entryData.date < '2026-09-01') {
      return res.status(400).json({ error: 'Entries must start from September 2026 reading onwards.' });
    }

    // Reject if month is closed (unless admin is creating or editing)
    const entryMonth = entryData.date ? entryData.date.slice(0, 7) : '';
    const settings = await DB.getSettings();
    const closedMonths: string[] = settings.closedMonths || [];
    const isAdminAction = entryData.isAdmin || entryData.user === 'admin' || req.headers['x-admin'] === 'true';
    if (!isAdminAction && closedMonths.includes(entryMonth)) {
      return res.status(403).json({ error: 'This month has been closed by the Administrator. No new entries can be added.' });
    }

    // Threshold & meter validation
    if (Number(entryData.actualCMR) <= Number(entryData.actualOMR)) {
      return res.status(400).json({ error: 'Closing meter reading must be strictly greater than opening meter reading.' });
    }

    if (!entryData.id) {
      entryData.id = Date.now().toString();
    }
    const saved = await DB.saveEntry(entryData);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all entries at once (Admin Save Logbook to Database) - Must be before /api/entries/:id
app.put('/api/entries/sync', async (req, res) => {
  try {
    const { entries } = req.body;
    if (Array.isArray(entries)) {
      const saved = await DB.syncEntries(entries);
      return res.json({ success: true, count: saved.length });
    }
    res.status(400).json({ error: 'entries array expected' });
  } catch (err: any) {
    console.error('Error in /api/entries/sync:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entryData = { ...req.body, id };

    // Start from September 2026 onwards
    if (entryData.date && entryData.date < '2026-09-01') {
      return res.status(400).json({ error: 'Entries must start from September 2026 reading onwards.' });
    }

    // Meter validation
    if (Number(entryData.actualCMR) <= Number(entryData.actualOMR)) {
      return res.status(400).json({ error: 'Closing meter reading must be strictly greater than opening meter reading.' });
    }

    const saved = await DB.saveEntry(entryData);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purge specific closed month entries to free MongoDB storage space
app.delete('/api/entries/month', async (req, res) => {
  try {
    const { monthKey } = req.body;
    if (!monthKey) {
      return res.status(400).json({ error: 'monthKey required' });
    }
    const result = await DB.deleteMonthEntries(monthKey);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Space cleanup: Delete entries from 4th last month or older
app.delete('/api/entries/cleanup-older', async (req, res) => {
  try {
    const { cutoffMonthKey } = req.body;
    if (!cutoffMonthKey) {
      return res.status(400).json({ error: 'cutoffMonthKey required' });
    }
    const result = await DB.deleteOldEntries(cutoffMonthKey);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear sample data: delete all entries so users can start fresh from September 2026
app.delete('/api/entries/clear-all', async (req, res) => {
  try {
    const result = await DB.clearAllEntries();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await DB.deleteEntry(id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const users = await DB.getUsers();
    // Return users without exposing plaintext passwords if desired, but allow admin reset
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, name, designation, password } = req.body;
    if (!username || !name) {
      return res.status(400).json({ error: 'Username and Name are required' });
    }

    const existing = await DB.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const newUser = {
      id: Date.now().toString(),
      username: username.trim().toLowerCase(),
      name: name.trim(),
      designation: designation?.trim() || '',
      password: password || 'Bsnl',
      active: true,
    };

    const saved = await DB.createUser(newUser);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/sync', async (req, res) => {
  try {
    const { users } = req.body;
    if (Array.isArray(users)) {
      await DB.syncUsers(users);
      return res.json({ success: true, count: users.length });
    }
    res.status(400).json({ error: 'users array expected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await DB.updateUser(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Reset User Password to default 'Bsnl'
app.post('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await DB.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const updated = await DB.updateUser(id, { password: 'Bsnl' });
    res.json({
      success: true,
      message: "Password reset to default 'Bsnl' successfully",
      user: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await DB.deleteUser(id);
    res.json({ success: true, message: 'User deleted' });
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
    const updates = req.body;
    const updated = await DB.updateSettings(updates);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Seed API
app.post('/api/seed', async (req, res) => {
  try {
    const reset = await DB.resetToDefaults();
    res.json({ success: true, message: 'Reset to defaults complete', data: reset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware & Static serving
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
