require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace_me';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'kusay.tgn@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'replace_admin_password';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(req, res, next) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth) return res.status(401).json({ success: false, message: 'No token provided' });

  const parts = String(auth).split(' ');
  if (parts.length !== 2) return res.status(401).json({ success: false, message: 'Invalid token' });

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Client login (or register if not exists)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone is required' });
    }

    let client = await prisma.client.findUnique({ where: { phone } });

    if (!client) {
      // create new client with default bonus/points
      client = await prisma.client.create({
        data: {
          name: name || phone,
          phone,
          login: name || phone,
          points: 100000,
          bonuses: 100000,
          orders: 0,
          status: 'NEW CLIENT',
          role: 'user',
          source: 'telegram',
          welcomeBonus: true
        }
      });
    }

    const user = {
      id: client.id,
      name: client.name,
      login: client.login,
      phone: client.phone,
      points: Number(client.points || 0),
      bonuses: Number(client.bonuses || 0),
      status: client.status || 'MAX START',
      orders: Number(client.orders || 0),
      role: client.role || 'user'
    };

    const token = generateToken({ id: user.id, role: user.role });

    res.json({ success: true, message: 'Успешный вход', user, token });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ success: false, message: 'Login and password required' });
    }

    const entered = String(login).trim().toLowerCase();
    const adminEmail = String(ADMIN_EMAIL).toLowerCase();

    if (entered !== 'admin' && entered !== adminEmail) {
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }

    // Compare password to env-admin password (in production consider storing hashed password in DB)
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }

    const adminUser = {
      id: 'admin',
      name: 'Administrator',
      login: 'admin',
      phone: '',
      points: 0,
      bonuses: 0,
      status: 'ADMIN',
      orders: 0,
      role: 'admin'
    };

    const token = generateToken({ id: adminUser.id, role: 'admin' });

    res.json({ success: true, message: 'Вход выполнен', user: adminUser, token });
  } catch (err) {
    console.error('Admin login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get client by phone
app.get('/api/clients', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

    const client = await prisma.client.findUnique({ where: { phone: String(phone) } });
    if (!client) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, client });
  } catch (err) {
    console.error('Get client error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update profile (protected)
app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // prevent changing role by normal user
    delete data.role;

    const updated = await prisma.client.update({ where: { id }, data });

    const user = {
      id: updated.id,
      name: updated.name,
      login: updated.login,
      phone: updated.phone,
      points: Number(updated.points || 0),
      bonuses: Number(updated.bonuses || 0),
      status: updated.status || 'MAX START',
      orders: Number(updated.orders || 0),
      role: updated.role || 'user'
    };

    res.json({ success: true, message: 'Профиль обновлен', user });
  } catch (err) {
    console.error('Update profile error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
