class Seguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);
export const raw = (texto) => new Seguro(String(texto));

function converter(v) {
  if (v instanceof Seguro) return v.texto;
  if (Array.isArray(v)) return v.map(converter).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
}

export function html(strings, ...valores) {
  let saida = '';
  strings.forEach((s, i) => {
    saida += s;
    if (i < valores.length) saida += converter(valores[i]);
  });
  return new Seguro(saida);
}
