import { randomUUID } from 'node:crypto';

// In-memory store. It is deliberate: the demo needs no database, so it runs
// anywhere (including a CI sandbox). The functions below are the only place
// that touches the data, so swapping in MongoDB later means changing this file.
export function createStore() {
  let tasks = [];

  return {
    list() {
      return tasks.map((task) => ({ ...task }));
    },
    add(title) {
      const task = {
        id: randomUUID(),
        title,
        done: false,
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      return { ...task };
    },
    update(id, patch) {
      const task = tasks.find((item) => item.id === id);
      if (!task) return null;
      Object.assign(task, patch);
      return { ...task };
    },
    remove(id) {
      const before = tasks.length;
      tasks = tasks.filter((task) => task.id !== id);
      return tasks.length < before;
    },
  };
}
