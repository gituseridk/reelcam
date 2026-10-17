// Orbit: a release page used to demo the recorder. No build step, no dependencies.
const checks = [
  { title: 'Changelog written', who: 'Ana', done: true },
  { title: 'Docs updated', who: 'Leo', done: true },
  { title: 'Migration tested', who: 'Kai', done: true },
  { title: 'Status page ready', who: 'Mo', done: false },
  { title: 'Release notes approved', who: 'Jo', done: false },
];
const COMMANDS = [
  ['Ship Orbit 2.0', 'Release'],
  ['Show checks for 2.0', 'Release'],
  ['Shortcuts', 'Help'],
];
const R = 2 * Math.PI * 52;
const $ = (id) => document.getElementById(id);

function renderChecks() {
  $('checks').replaceChildren(...checks.map((c) => {
    const li = document.createElement('li');
    li.className = c.done ? 'done' : '';
    li.innerHTML = '<span class="tick"></span><span></span><span class="who"></span>';
    li.children[1].textContent = c.title;
    li.children[2].textContent = c.who;
    return li;
  }));
}

function progress() {
  const done = checks.filter((c) => c.done).length;
  $('pct').textContent = `${Math.round((done / checks.length) * 100)}%`;
  $('count').textContent = `${done} of ${checks.length}`;
  $('bar').style.strokeDashoffset = String(R * (1 - done / checks.length));
}

function results(query) {
  const q = query.trim().toLowerCase();
  const hits = COMMANDS.filter(([name]) => q === '' || name.toLowerCase().includes(q.split(' ')[0]));
  $('results').replaceChildren(...hits.map(([name, kind], i) => {
    const li = document.createElement('li');
    li.className = i === 0 ? 'on' : '';
    li.innerHTML = '<b></b><span></span>';
    li.children[0].textContent = name;
    li.children[1].textContent = kind;
    return li;
  }));
}

function openPalette() {
  $('palette-layer').hidden = false;
  $('command').value = '';
  results('');
  $('command').focus();
}

function ship() {
  $('palette-layer').hidden = true;
  const open = checks.map((c, i) => (c.done ? -1 : i)).filter((i) => i >= 0);
  open.forEach((i, n) => setTimeout(() => {
    checks[i].done = true;
    renderChecks();
    $('checks').children[i].classList.add('pop');
    progress();
    if (n === open.length - 1) setTimeout(golive, 450);
  }, 350 + n * 420));
}

function golive() {
  document.body.classList.add('live');
  $('eyebrow').textContent = 'Live now';
  $('headline').textContent = 'Orbit 2.0 is live';
  $('sub').textContent = 'Shipped to 12,400 teams.';
  const ring = document.querySelector('.ring').getBoundingClientRect();
  window.burst(ring.x + ring.width / 2, ring.y + ring.height / 2, 7);
  const li = document.createElement('li');
  li.className = 'new';
  li.innerHTML = '<div class="what"><span class="ver">2.0</span><div><b>Orbit 2.0</b><p>Command bar, live progress and one-step releases.</p></div></div><time>Today</time>';
  $('entries').prepend(li);
  rollout();
}

function rollout() {
  $('meter').style.width = '100%';
  $('note').textContent = 'Rolling out to every team.';
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / 2400);
    $('teams').textContent = Math.round(12400 * (1 - (1 - k) ** 3)).toLocaleString('en-US');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

$('bar').style.strokeDasharray = String(R);
renderChecks();
progress();
$('search').addEventListener('click', openPalette);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') $('palette-layer').hidden = true;
});
$('command').addEventListener('input', (e) => results(e.target.value));
$('command').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ship(); } });
