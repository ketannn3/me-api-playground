async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error('Failed '+url);
  return r.json();
}

function pretty(obj){ return JSON.stringify(obj, null, 2); }

async function loadProfile(){
  const data = await fetchJSON('/profile');
  document.getElementById('profileBox').textContent = pretty(data);
}

async function loadTopSkills(){
  const data = await fetchJSON('/skills/top');
  const list = document.getElementById('skillsList');
  list.innerHTML = '';
  data.skills.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.name} (${s.score})`;
    list.appendChild(li);
  });
}

async function searchProjects(){
  const skill = document.getElementById('skillInput').value.trim();
  const url = '/projects' + (skill ? `?skill=${encodeURIComponent(skill)}` : '');
  const data = await fetchJSON(url);
  document.getElementById('projectsBox').textContent = pretty(data);
}

document.getElementById('searchBtn').addEventListener('click', searchProjects);

loadProfile();
loadTopSkills();
