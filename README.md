# Task board demo

A small real-time task board. Tasks are created, completed and deleted over a
REST API, and every open browser tab updates live through a WebSocket.

I built this as a compact, working project for trying out AI code review tools
such as TestDriver. It is a demo, not production software.

## Stack

- Server: Node.js 20, Express 4, `ws` for WebSockets
- Client: Vue 3 with Vite
- Tests: Vitest and Supertest
- CI: GitHub Actions (runs the tests and the client build)

## Run it

```bash
npm install
npm run build     # builds the Vue client into client/dist
npm start         # http://localhost:3000
```

Open the page in two tabs. A change in one tab shows up in the other.

For development, run `npm run dev:server` and `npm run dev:client` in two
terminals. Vite proxies `/api` and `/ws` to the server on port 3000.

## Test it

```bash
npm test
```

The tests cover the API: creating, completing and deleting tasks, input
validation, 404 handling, and that the live-update hook only fires after a
successful change.

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/api/tasks` | none | List of tasks |
| POST | `/api/tasks` | `{ "title": "text" }` | 201 with the new task |
| PATCH | `/api/tasks/:id` | `{ "done": true }` | The updated task |
| DELETE | `/api/tasks/:id` | none | 204 |

Titles are trimmed, must not be empty, and can be at most 120 characters.
Validation errors return 400 with `{ "error": "..." }`.

## Layout

```
server/app.js     Express routes and validation
server/store.js   In-memory task storage
server/index.js   HTTP + WebSocket server, serves the built client
client/           Vue app
tests/            API tests
```

## Limits

- Storage is in memory on purpose, so the app needs no database and runs
  anywhere. Data resets when the server restarts. Replacing `server/store.js`
  with a MongoDB version is the intended next step.
- There is no authentication and no per-user data.
