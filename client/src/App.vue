<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const tasks = ref([]);
const title = ref('');
const error = ref('');
const connected = ref(false);

let socket;
let retryTimer;
let closing = false;

const remaining = computed(() => tasks.value.filter((task) => !task.done).length);

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Something went wrong. Try again.');
  }
  return res.status === 204 ? null : res.json();
}

async function refresh() {
  try {
    tasks.value = await request('/api/tasks');
  } catch (e) {
    error.value = e.message;
  }
}

// While the live connection is down the server cannot push updates,
// so reload the list after each action instead.
async function afterChange() {
  if (!connected.value) await refresh();
}

async function addTask() {
  error.value = '';
  try {
    await request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: title.value }),
    });
    title.value = '';
    await afterChange();
  } catch (e) {
    error.value = e.message;
  }
}

async function toggle(task) {
  error.value = '';
  try {
    await request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done: !task.done }),
    });
    await afterChange();
  } catch (e) {
    error.value = e.message;
  }
}

async function remove(task) {
  error.value = '';
  try {
    await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
    await afterChange();
  } catch (e) {
    error.value = e.message;
  }
}

function connect() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${scheme}://${location.host}/ws`);

  socket.onopen = () => {
    connected.value = true;
  };
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'tasks') tasks.value = message.tasks;
  };
  socket.onclose = () => {
    connected.value = false;
    if (!closing) retryTimer = setTimeout(connect, 1500);
  };
}

onMounted(() => {
  refresh();
  connect();
});

onBeforeUnmount(() => {
  closing = true;
  clearTimeout(retryTimer);
  socket?.close();
});
</script>

<template>
  <main class="board">
    <header class="board-header">
      <h1>Task board</h1>
      <p class="status" :class="{ live: connected }" role="status">
        {{ connected ? 'Live' : 'Reconnecting…' }}
      </p>
    </header>

    <form class="add" @submit.prevent="addTask">
      <label for="new-task">New task</label>
      <input
        id="new-task"
        v-model="title"
        type="text"
        maxlength="120"
        placeholder="What needs doing?"
        autocomplete="off"
      />
      <button type="submit">Add task</button>
    </form>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <p v-if="tasks.length === 0" class="empty">
      No tasks yet. Add one above and it will appear in every open tab.
    </p>

    <ul v-else class="tasks">
      <li v-for="task in tasks" :key="task.id" :class="{ done: task.done }">
        <label>
          <input type="checkbox" :checked="task.done" @change="toggle(task)" />
          <span>{{ task.title }}</span>
        </label>
        <button
          type="button"
          class="remove"
          :aria-label="`Delete ${task.title}`"
          @click="remove(task)"
        >
          Delete
        </button>
      </li>
    </ul>

    <p v-if="tasks.length" class="count">{{ remaining }} of {{ tasks.length }} left</p>
  </main>
</template>
