import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'meapi.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.json');

// middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ensure data dir exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// open DB
const db = new sqlite3.Database(DB_PATH);

// helpers
function runSqlScript(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

function get(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function run(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err); else resolve(this);
    });
  });
}

// DB init
async function init() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await runSqlScript(db, schema);

  const row = await get('SELECT COUNT(*) as cnt FROM profile');
  if (row.cnt === 0) {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));

    // insert profile
    await run('INSERT INTO profile (id, name, email, education, links_json) VALUES (1, ?, ?, ?, ?)',
      [seed.profile.name, seed.profile.email, seed.profile.education, JSON.stringify(seed.profile.links)]);

    // insert skills
    for (const s of seed.skills) {
      await run('INSERT OR IGNORE INTO skills (name, score) VALUES (?, ?)', [s.name, s.score ?? 1]);
    }

    // insert work
    for (const w of seed.work) {
      await run('INSERT INTO work (company, role, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)',
        [w.company, w.role, w.start_date, w.end_date, w.description]);
    }

    // insert projects
    for (const p of seed.projects) {
      await run('INSERT INTO projects (title, description, skills_json, links_json) VALUES (?, ?, ?, ?)',
        [p.title, p.description, JSON.stringify(p.skills || []), JSON.stringify(p.links || {})]);
    }

    console.log('Database seeded with initial data.');
  } else {
    console.log('Database already has data, skipping seed.');
  }
}

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', ts: new Date().toISOString() });
});

// get full profile & related arrays
app.get('/profile', async (req, res) => {
  try {
    const profile = await get('SELECT id, name, email, education, links_json FROM profile WHERE id = 1');
    const skills = await all('SELECT name, score FROM skills ORDER BY score DESC, name ASC');
    const work = await all('SELECT company, role, start_date, end_date, description FROM work ORDER BY start_date ASC');
    const projectsRows = await all('SELECT id, title, description, skills_json, links_json FROM projects ORDER BY id ASC');
    const projects = projectsRows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      skills: JSON.parse(r.skills_json || '[]'),
      links: JSON.parse(r.links_json || '{}')
    }));
    res.json({
      name: profile?.name,
      email: profile?.email,
      education: profile?.education,
      links: JSON.parse(profile?.links_json || '{}'),
      skills,
      work,
      projects
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// replace profile with payload (simple upsert-all approach to satisfy create/update)
app.put('/profile', async (req, res) => {
  const body = req.body || {};
  try {
    await run('DELETE FROM profile WHERE id = 1');
    await run('INSERT INTO profile (id, name, email, education, links_json) VALUES (1, ?, ?, ?, ?)',
      [body.name || '', body.email || '', body.education || '', JSON.stringify(body.links || {})]);

    if (Array.isArray(body.skills)) {
      await run('DELETE FROM skills');
      for (const s of body.skills) {
        const name = typeof s === 'string' ? s : s.name;
        const score = (typeof s === 'object' && s.score) ? s.score : 1;
        await run('INSERT OR IGNORE INTO skills (name, score) VALUES (?, ?)', [name, score]);
      }
    }

    if (Array.isArray(body.work)) {
      await run('DELETE FROM work');
      for (const w of body.work) {
        await run('INSERT INTO work (company, role, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)',
          [w.company||'', w.role||'', w.start_date||'', w.end_date||'', w.description||'']);
      }
    }

    if (Array.isArray(body.projects)) {
      await run('DELETE FROM projects');
      for (const p of body.projects) {
        await run('INSERT INTO projects (title, description, skills_json, links_json) VALUES (?, ?, ?, ?)',
          [p.title||'', p.description||'', JSON.stringify(p.skills || []), JSON.stringify(p.links || {})]);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /projects?skill=python
app.get('/projects', async (req, res) => {
  const skill = (req.query.skill || '').toString().toLowerCase();
  try {
    const rows = await all('SELECT id, title, description, skills_json, links_json FROM projects ORDER BY id DESC');
    let projects = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      skills: JSON.parse(r.skills_json || '[]'),
      links: JSON.parse(r.links_json || '{}')
    }));
    if (skill) {
      projects = projects.filter(p => (p.skills || []).map(s => s.toLowerCase()).includes(skill));
    }
    res.json({ count: projects.length, projects });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /skills/top
app.get('/skills/top', async (req, res) => {
  try {
    const skills = await all('SELECT name, score FROM skills ORDER BY score DESC, name ASC');
    res.json({ skills });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// GET /search?q=...
app.get('/search', async (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  try {
    const results = { projects: [], skills: [], work: [] };
    if (!q) return res.json(results);

    // search projects
    const rows = await all('SELECT id, title, description, skills_json, links_json FROM projects');
    for (const r of rows) {
      const skills = JSON.parse(r.skills_json || '[]');
      const inText = (r.title + ' ' + (r.description||'')).toLowerCase().includes(q);
      const inSkills = skills.map(s => s.toLowerCase()).some(s => s.includes(q));
      if (inText || inSkills) {
        results.projects.push({
          id: r.id, title: r.title, description: r.description, skills, links: JSON.parse(r.links_json||'{}')
        });
      }
    }

    // search skills
    const allSkills = await all('SELECT name, score FROM skills');
    results.skills = allSkills.filter(s => s.name.toLowerCase().includes(q));

    // search work
    const work = await all('SELECT company, role, start_date, end_date, description FROM work');
    results.work = work.filter(w => (w.company + ' ' + w.role + ' ' + (w.description||'')).toLowerCase().includes(q));

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

init().then(() => {
  app.listen(PORT, () => console.log(`Me-API running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to init DB', err);
  process.exit(1);
});
