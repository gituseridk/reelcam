// Pebble: a tiny task list used to demo Showreel. No build step, no dependencies.
const tasks = [
  { title: 'Review the onboarding copy', tag: 'Design', done: true },
  { title: 'Fix the flaky upload test', tag: 'Eng', done: false },
  { title: 'Draft the release notes', tag: 'Launch', done: false },
];

const list = document.getElementById('tasks');
const C = 2 * Math.PI * 18;

function row(task, fresh) {
  const li = document.createElement('li');
  li.className = (task.done ? 'done' : '') + (fresh ? ' fresh' : '');
  const check = document.createElement('button');
  check.className = 'check';
  check.setAttribute('aria-label', 'Done');
  check.addEventListener('click', () => {
    task.done = !task.done;
    li.classList.toggle('done', task.done);
    update();
  });
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;
  const tag = document.createElement('span');
  tag.className = `tag t-${task.tag.toLowerCase()}`;
  tag.textContent = task.tag;
  li.append(check, title, tag);
  return li;
}

function update() {
  const done = tasks.filter((t) => t.done).length;
  document.getElementById('progress').textContent = `${done}/${tasks.length}`;
  document.getElementById('count-side').textContent = String(tasks.length - done);
  document.getElementById('bar').style.strokeDashoffset = String(C * (1 - done / Math.max(1, tasks.length)));
}

document.getElementById('bar').style.strokeDasharray = String(C);
for (const t of tasks) list.append(row(t, false));
update();

document.getElementById('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('new-task');
  const title = input.value.trim();
  if (title === '') return;
  const task = { title, tag: 'Launch', done: false };
  tasks.push(task);
  list.append(row(task, true));
  input.value = '';
  update();
});
