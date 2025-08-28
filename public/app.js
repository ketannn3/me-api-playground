const BASE = window.location.origin;

async function safeFetchJSON(url, retries = 3, delay = 800) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return safeFetchJSON(url, retries - 1, Math.round(delay * 1.5));
    }
    throw err;
  }
}

function pretty(obj) { return JSON.stringify(obj, null, 2); }

async function loadProfile() {
  const el = document.getElementById('profileBox');
  try {
    const data = await safeFetchJSON(`${BASE}/profile`);
    el.textContent = pretty(data);
  } catch (e) {
    el.textContent = `Failed to load profile: ${e.message}`;
  }
}

async function loadTopSkills() {
  const list = document.getElementById('skillsList');
  list.innerHTML = '';
  try {
    const data = await safeFetchJSON(`${BASE}/skills/top`);
    data.skills.forEach(s => {
      const li = document.createElement('li');
      li.textContent = `${s.name} (${s.score})`;
      list.appendChild(li);
    });
  } catch (e) {
    const li = document.createElement('li');
    li.textContent = `Failed to load skills: ${e.message}`;
    list.appendChild(li);
  }
}

async function searchProjects() {
  const out = document.getElementById('projectsBox');
  const skill = document.getElementById('skillInput').value.trim();
  const url = `${BASE}/projects${skill ? `?skill=${encodeURIComponent(skill)}` : ''}`;
  try {
    const data = await safeFetchJSON(url);
    out.textContent = pretty(data);
  } catch (e) {
    out.textContent = `Failed to load projects: ${e.message}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchBtn').addEventListener('click', searchProjects);
  loadProfile();
  loadTopSkills();
});
