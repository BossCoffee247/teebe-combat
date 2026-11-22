// Automatic sync through a private GitHub repo (BossCoffee247/teebe-data by default).
// Each device keeps working offline; changes are pushed a few seconds after you stop
// tapping, when the app is hidden, and pulled when it opens. Every sync is a commit,
// so the repo's history doubles as a full backup timeline.

const CFG_KEY = 'teebe.sync';
const PUSH_DELAY = 15000;

const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

export function createSync({ getData, applyData, onStatus, confirmConflict }) {
  let cfg = {
    token: '', repo: 'BossCoffee247/teebe-data', path: 'teebe.json',
    sha: null, dirty: false, lastSync: null, error: '',
    device: /Android|iPhone/i.test(navigator.userAgent) ? 'Phone' : 'PC',
  };
  try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem(CFG_KEY)) }; } catch { /* defaults */ }

  let timer = null, running = false, again = false;
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ } };
  const status = () => onStatus?.(state());

  function state() {
    if (!cfg.token) return { kind: 'off', text: 'Not connected' };
    if (cfg.error) return { kind: 'error', text: cfg.error };
    if (!navigator.onLine) return { kind: 'pending', text: cfg.dirty ? 'Offline — will sync when back online' : 'Offline' };
    if (running) return { kind: 'pending', text: 'Syncing…' };
    if (cfg.dirty) return { kind: 'pending', text: 'Changes waiting to sync' };
    return { kind: 'ok', text: cfg.lastSync ? `Synced ${ago(cfg.lastSync)}` : 'Connected' };
  }

  async function api(method, url, body) {
    const res = await fetch('https://api.github.com/' + url, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + cfg.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404 && method === 'GET') return null;
    if (!res.ok) {
      const err = new Error(res.status === 401 ? 'Token rejected — check or replace it'
        : res.status === 403 ? 'Token lacks access to the data repo'
        : res.status === 409 || res.status === 422 ? 'conflict' : `GitHub error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  const fileUrl = () => `repos/${cfg.repo}/contents/${cfg.path}`;

  async function pull() {
    const f = await api('GET', fileUrl());
    return f ? { sha: f.sha, data: JSON.parse(b64decode(f.content)) } : null;
  }

  async function push(sha) {
    const data = { ...getData(), updatedAt: new Date().toISOString(), device: cfg.device };
    const out = await api('PUT', fileUrl(), {
      message: `Sync from ${cfg.device} — ${new Date().toLocaleString()}`,
      content: b64encode(JSON.stringify(data, null, 1)),
      ...(sha ? { sha } : {}),
    });
    cfg.sha = out.content.sha;
    cfg.dirty = false;
  }

  async function run() {
    const remote = await pull();
    if (!remote) return push(null);                       // first sync: create the file
    if (remote.sha === cfg.sha) return cfg.dirty ? push(remote.sha) : undefined;
    // The other device changed something since our last sync. If this device has
    // changes too, ask which to keep (true = keep this device's data).
    if (cfg.dirty && confirmConflict(remote.data, !cfg.sha)) return push(remote.sha);
    applyData(remote.data);
    cfg.sha = remote.sha;
    cfg.dirty = false;
  }

  async function sync() {
    if (!cfg.token || !navigator.onLine) return status();
    if (running) { again = true; return; }
    running = true; status();
    clearTimeout(timer);
    try {
      try { await run(); }
      catch (e) { if (e.message === 'conflict') await run(); else throw e; } // someone pushed in between
      cfg.error = '';
      cfg.lastSync = Date.now();
    } catch (e) {
      cfg.error = e.message === 'Failed to fetch' ? '' : e.message; // network blips just retry later
    } finally {
      running = false;
      saveCfg();
      status();
      if (again) { again = false; sync(); }
    }
  }

  function markDirty() {
    cfg.dirty = true;
    saveCfg();
    if (!cfg.token) return;
    status();
    clearTimeout(timer);
    timer = setTimeout(sync, PUSH_DELAY);
  }

  async function connect(token, repo) {
    cfg.token = token.trim();
    if (repo) cfg.repo = repo.trim();
    cfg.error = '';
    cfg.sha = null;               // unknown: first sync compares with what's in the repo
    // A device that already holds a character must never be silently overwritten on
    // first connect: mark it dirty so an existing file in the repo triggers the question.
    cfg.dirty = !!localStorage.getItem('teebe.v1');
    try {
      await api('GET', `repos/${cfg.repo}`);
    } catch (e) {
      cfg.token = '';
      saveCfg(); status();
      throw e;
    }
    saveCfg();
    await sync();
  }

  function disconnect() {
    cfg.token = ''; cfg.sha = null; cfg.error = '';
    saveCfg(); status();
  }

  // Triggers
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
    else if (cfg.dirty) sync();
  });
  setInterval(status, 30000); // keep "synced x min ago" fresh

  return {
    sync, markDirty, connect, disconnect, state,
    get config() { return { repo: cfg.repo, device: cfg.device, connected: !!cfg.token }; },
    setDevice(name) { cfg.device = name.trim() || cfg.device; saveCfg(); },
  };
}

function ago(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}
