import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUsers } from './src/db/users.ts';
import { upsertEvent, getEventById, getEventRsvps, upsertRsvp, deleteRsvp } from './src/db/events.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'cloudsql-postgresql' });
  });

  // User synchronization with Firebase Auth
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || '';
      const displayName = req.body?.displayName;

      if (!uid) {
        return res.status(400).json({ error: 'User UID missing' });
      }

      const user = await getOrCreateUser(uid, email, displayName);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('Error synchronizing user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // Fetch registered users (protected)
  app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allUsers = await getUsers();
      res.json(allUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  // Get event details
  app.get('/api/events/:eventId', async (req, res) => {
    try {
      const event = await getEventById(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error: any) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch event' });
    }
  });

  // Upsert event details (host authentication optional/verified)
  app.post('/api/events/:eventId', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const eventId = req.params.eventId;
      const { title, date, time, venue, address, map, hosts, description, message, theme, category } = req.body;

      const event = await upsertEvent({
        id: eventId,
        userUid: req.user?.uid,
        title: title || 'Celebration',
        date: date || '',
        time,
        venue: venue || 'Venue',
        address: address || map || '',
        hosts: hosts || 'Hosts',
        description: description || message || '',
        theme: theme || category || '',
      });

      res.json({ success: true, event });
    } catch (error: any) {
      console.error('Error saving event:', error);
      res.status(500).json({ error: error.message || 'Failed to save event' });
    }
  });

  // Get RSVPs for event
  app.get('/api/events/:eventId/rsvps', async (req, res) => {
    try {
      const eventRsvps = await getEventRsvps(req.params.eventId);
      res.json(eventRsvps);
    } catch (error: any) {
      console.error('Error fetching RSVPs:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch RSVPs' });
    }
  });

  // Submit or update RSVP
  app.post('/api/events/:eventId/rsvps', async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const { id, name, phone, email, status, adults, children, headcount, food, source, notes } = req.body;

      if (!id || !name || !phone || !status) {
        return res.status(400).json({ error: 'Missing required RSVP fields (id, name, phone, status)' });
      }

      const savedRsvp = await upsertRsvp({
        id,
        eventId,
        name,
        phone,
        email,
        status,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        headcount: Number(headcount) || (Number(adults) || 1) + (Number(children) || 0),
        food: food || 'Vegetarian',
        source: source || 'Web RSVP',
        notes,
      });

      res.json({ success: true, rsvp: savedRsvp });
    } catch (error: any) {
      console.error('Error saving RSVP:', error);
      res.status(500).json({ error: error.message || 'Failed to save RSVP' });
    }
  });

  // Delete RSVP
  app.delete('/api/rsvps/:rsvpId', async (req, res) => {
    try {
      const deleted = await deleteRsvp(req.params.rsvpId);
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Error deleting RSVP:', error);
      res.status(500).json({ error: error.message || 'Failed to delete RSVP' });
    }
  });

  // Vite middleware in dev mode / static files in production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
