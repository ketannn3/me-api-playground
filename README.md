# Me‑API Playground (Track A)

A tiny personal API + minimal frontend that stores my profile (name, email, education, skills, projects, work, links) in **SQLite** and exposes query endpoints. Built with **Express.js**. One-command run, one-click deploy.

## ✨ Features
- CRUD-ish: `GET /profile`, `PUT /profile`
- Queries: `GET /projects?skill=python`, `GET /skills/top`, `GET /search?q=...`
- Health: `GET /health`
- Minimal UI served from `/` to search by skill and view data
- Seeded with my data (edit `seed.json` to personalize)

## 🏗️ Architecture
```
Express (server.js)
 ├─ SQLite (data/meapi.db)
 ├─ schema.sql (migrations)
 ├─ seed.json (initial data)
 └─ public/ (static UI: index.html + app.js + style.css)
```
![flow](https://dummyimage.com/800x260/0b1020/93c5fd&text=Browser+%E2%86%94+Express+%E2%86%94+SQLite)

## 🚀 Run locally
```bash
# 1) Install Node 18+
# 2) Install deps
npm i

# 3) Start
npm start
# -> http://localhost:3000 (UI)
# -> /health, /profile, /projects?skill=python, /skills/top, /search?q=...
```

## 📦 API Endpoints
- `GET /health` → `{ "status": "ok" }`
- `GET /profile` → full profile with arrays
- `PUT /profile` → replace-all update (send full JSON body)
- `GET /projects?skill=python` → filter projects by skill (case-insensitive)
- `GET /skills/top` → skills sorted by score
- `GET /search?q=...` → look across projects, skills, and work

Import **MeAPI.postman_collection.json** into Postman or use cURL:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/projects?skill=python
curl "http://localhost:3000/search?q=streamlit"
```

## 🗃️ Database
- SQLite file: `data/meapi.db` (created automatically on first start)
- Schema: [`schema.sql`](./schema.sql)
- Seed data: [`seed.json`](./seed.json)

## 🔐 (Optional nice-to-have)
- Basic auth for write ops: wrap `PUT /profile` with a shared key header like `X-API-Key` (not required for submission).

## 🌐 Deploy (Render)
1. Push to a GitHub repo.
2. In Render → **New Web Service** → connect repo.
3. Runtime: Node 18+
4. Build command: `npm i`  
   Start command: `node server.js`
5. Open the URL → `/health` should return 200.
6. The frontend loads from `/`.

> Vercel/Netlify can host the static UI if you split frontend and backend, but Render is quickest for both with one service.

## 📄 README Requirements
- **Architecture & setup:** above
- **Schema:** see `schema.sql`
- **Sample queries:** Postman file + cURL above
- **Known limitations:** SQLite file is ephemeral on some hosts (on Render it resets on redeploy). For this demo, seed runs automatically to repopulate.

## 🔗 Links
- **Resume:** (add your public resume link here)
- **GitHub:** https://github.com/ketannn3

---

### Acceptance Checklist (Track A)
- [x] `GET /health` returns 200
- [x] Query endpoints filter correctly and seed data is visible in UI
- [x] README is complete & reproducible; single Render URL works

---

> Made fast for submission. Personalize `seed.json` with your exact details before deploying.
