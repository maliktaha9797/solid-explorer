// The only module that touches localStorage. Mirrors the prototype's store: keys are prefixed
// with 'se:', values are JSON, and every failure (blocked storage, file:// quirks, private
// windows, corrupt data) degrades silently to the fallback.

const PREFIX = 'se:';

export function get(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage is unavailable or full. The app works without it, so ignore.
  }
}
