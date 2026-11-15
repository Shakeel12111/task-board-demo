import express from 'express';
import { createStore } from './store.js';

export const MAX_TITLE_LENGTH = 120;

// onChange is called after every successful change so the caller can push
// the new list to connected WebSocket clients.
export function createApp({ store = createStore(), onChange = () => {} } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/tasks', (_req, res) => {
    res.json(store.list());
  });

  app.post('/api/tasks', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return res
        .status(400)
        .json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` });
    }
    const task = store.add(title);
    onChange();
    res.status(201).json(task);
  });

  app.patch('/api/tasks/:id', (req, res) => {
    if (typeof req.body?.done !== 'boolean') {
      return res.status(400).json({ error: 'done must be true or false.' });
    }
    const task = store.update(req.params.id, { done: req.body.done });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    onChange();
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    if (!store.remove(req.params.id)) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    onChange();
    res.status(204).end();
  });

  return app;
}
