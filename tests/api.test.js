import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, MAX_TITLE_LENGTH } from '../server/app.js';
import { createStore } from '../server/store.js';

let app;
let changes;

beforeEach(() => {
  changes = 0;
  app = createApp({
    store: createStore(),
    onChange: () => {
      changes += 1;
    },
  });
});

async function addTask(title) {
  const res = await request(app).post('/api/tasks').send({ title });
  return res.body;
}

describe('tasks API', () => {
  it('starts with no tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates a task and trims the title', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '  Write tests  ' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.done).toBe(false);

    const list = await request(app).get('/api/tasks');
    expect(list.body).toHaveLength(1);
  });

  it('rejects an empty title', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('rejects a title that is only spaces', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing title', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
  });

  it('rejects a title that is too long', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'x'.repeat(MAX_TITLE_LENGTH + 1) });
    expect(res.status).toBe(400);
  });

  it('marks a task as done', async () => {
    const task = await addTask('Ship it');
    const res = await request(app).patch(`/api/tasks/${task.id}`).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it('rejects a done value that is not a boolean', async () => {
    const task = await addTask('Ship it');
    const res = await request(app).patch(`/api/tasks/${task.id}`).send({ done: 'yes' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when updating a task that does not exist', async () => {
    const res = await request(app).patch('/api/tasks/missing').send({ done: true });
    expect(res.status).toBe(404);
  });

  it('deletes a task', async () => {
    const task = await addTask('Remove me');
    const res = await request(app).delete(`/api/tasks/${task.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get('/api/tasks');
    expect(list.body).toEqual([]);
  });

  it('returns 404 when deleting a task that does not exist', async () => {
    const res = await request(app).delete('/api/tasks/missing');
    expect(res.status).toBe(404);
  });

  it('notifies listeners only after successful changes', async () => {
    const task = await addTask('One');
    await request(app).post('/api/tasks').send({ title: '' });
    await request(app).patch(`/api/tasks/${task.id}`).send({ done: true });
    await request(app).delete(`/api/tasks/${task.id}`);
    expect(changes).toBe(3);
  });
});
