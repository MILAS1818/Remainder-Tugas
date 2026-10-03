const STORAGE_KEY = 'rekap-tugas:v1';

let tasks = loadTasks();

const form = document.getElementById('task-form');
const listTodo = document.getElementById('list-todo');
const listDone = document.getElementById('list-done');

/* ---------- Penyimpanan (localStorage) ---------- */
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    alert('Gagal menyimpan data: penyimpanan browser penuh atau dinonaktifkan.');
  }
}

/* ---------- Aksi ---------- */
function addTask(name, category, deadline) {
  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, category, deadline,
    done: false
  });
  saveTasks();
  render();
}
function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTasks(); render(); }
}
function deleteTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t && confirm(`Hapus tugas "${t.name}"?`)) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

/* ---------- Helper tanggal ---------- */
function parseDate(str) { return new Date(str + 'T00:00:00'); }

function daysFromToday(str) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(str) - today) / 86400000);
}

function deadlineInfo(task) {
  const dateText = parseDate(task.deadline).toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  if (task.done) return { text: dateText, cls: 'text-slate-400' };

  const d = daysFromToday(task.deadline);
  if (d < 0)  return { text: `${dateText} • Terlambat ${-d} hari`, cls: 'text-red-600 font-medium' };
  if (d === 0) return { text: `${dateText} • Hari ini!`, cls: 'text-orange-600 font-medium' };
  if (d === 1) return { text: `${dateText} • Besok`, cls: 'text-amber-600 font-medium' };
  if (d <= 3)  return { text: `${dateText} • ${d} hari lagi`, cls: 'text-amber-600' };
  return { text: dateText, cls: 'text-slate-500' };
}

/* ---------- Render ---------- */
function createItem(task) {
  const info = deadlineInfo(task);

  const li = document.createElement('li');
  li.className = 'task-item bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3'
    + (task.done ? ' task-done' : '');

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'task-check';
  check.checked = task.done;
  check.setAttribute('aria-label', 'Tandai selesai');
  check.addEventListener('change', () => toggleTask(task.id));

  const body = document.createElement('div');
  body.className = 'flex-1 min-w-0';

  const title = document.createElement('p');
  title.className = 'task-title font-medium break-words';
  title.textContent = task.name;

  const meta = document.createElement('p');
  meta.className = 'text-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1';

  const badge = document.createElement('span');
  badge.className = 'bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5';
  badge.textContent = task.category;

  const due = document.createElement('span');
  due.className = info.cls;
  due.textContent = '⏰ ' + info.text;

  meta.append(badge, due);
  body.append(title, meta);

  const del = document.createElement('button');
  del.className = 'text-slate-400 hover:text-red-600 p-2 -mr-1 text-lg leading-none';
  del.setAttribute('aria-label', 'Hapus tugas');
  del.textContent = '🗑️';
  del.addEventListener('click', () => deleteTask(task.id));

  li.append(check, body, del);
  return li;
}

function renderList(ul, items, emptyText) {
  ul.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'text-sm text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-slate-300';
    empty.textContent = emptyText;
    ul.append(empty);
    return;
  }
  items.forEach(t => ul.append(createItem(t)));
}

function render() {
  // Urutkan: deadline terdekat di atas
  const sorted = [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const todo = sorted.filter(t => !t.done);
  const done = sorted.filter(t => t.done);

  renderList(listTodo, todo, 'Tidak ada tugas tertunda 🎉');
  renderList(listDone, done, 'Belum ada tugas yang selesai');

  document.getElementById('count-todo').textContent = `(${todo.length})`;
  document.getElementById('count-done').textContent = `(${done.length})`;

  const late = todo.filter(t => daysFromToday(t.deadline) < 0).length;
  document.getElementById('stats').textContent =
    `${todo.length} tugas tertunda` + (late ? ` • ${late} terlambat` : '');
}

/* ---------- Form ---------- */
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = form.name.value.trim();
  const category = form.category.value.trim();
  const deadline = form.deadline.value;
  if (!name || !category || !deadline) return;
  addTask(name, category, deadline);
  form.reset();
  form.name.focus();
});

/* ---------- PWA: Service Worker & tombol Install ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('SW gagal:', err));
  });
}

let installPrompt = null;
const btnInstall = document.getElementById('btn-install');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  btnInstall.classList.remove('hidden');
});
btnInstall.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  btnInstall.classList.add('hidden');
});
window.addEventListener('appinstalled', () => btnInstall.classList.add('hidden'));

render();
