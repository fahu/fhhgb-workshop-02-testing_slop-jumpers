export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
export function text(id: string, value: string): void {
  el(id).textContent = value;
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
export function flag(code: string): string {
  return /^[A-Z]{2}$/.test(code) && code !== 'ZZ' ? String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 127397)) : '⚙';
}

export function tokenCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? 'token' : 'tokens'}`;
}
