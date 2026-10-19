const DIA_MS = 86400000;

export const toDate = (iso) => new Date(`${iso}T12:00:00Z`);
export const toIso = (d) => d.toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(new Date(toDate(iso).getTime() + n * DIA_MS));
export const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / DIA_MS);
export const diasInclusivo = (a, b) => diffDays(a, b) + 1;
export const weekday = (iso) => toDate(iso).getUTCDay();
export const monthKey = (iso) => iso.slice(0, 7);

export function eachDay(inicio, fim) {
  const dias = [];
  for (let d = inicio; d <= fim; d = addDays(d, 1)) dias.push(d);
  return dias;
}

export function daysInMonth(chave) {
  const [a, m] = chave.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export const firstOfMonth = (chave) => `${chave}-01`;
export const lastOfMonth = (chave) => `${chave}-${String(daysInMonth(chave)).padStart(2, '0')}`;

export function addMonths(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const dia = Math.min(d, daysInMonth(`${ano}-${String(mes).padStart(2, '0')}`));
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function monthsBetween(inicio, fim) {
  const [ya, ma, da] = inicio.split('-').map(Number);
  const [yb, mb, db] = fim.split('-').map(Number);
  let meses = (yb - ya) * 12 + (mb - ma);
  if (db < da) meses -= 1;
  return Math.max(0, meses);
}

export function mondayOf(iso) {
  return addDays(iso, -((weekday(iso) + 6) % 7));
}

const FERIADOS_NACIONAIS = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07', '2026-10-12',
  '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-03-26', '2027-04-21', '2027-05-01', '2027-09-07', '2027-10-12',
  '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
];
const FERIADOS = new Set(FERIADOS_NACIONAIS);

export const isFeriado = (iso) => FERIADOS.has(iso);
export const isDomingo = (iso) => weekday(iso) === 0;
export const isFimDeSemana = (iso) => [0, 6].includes(weekday(iso));
export const isDiaUtil = (iso) => !isFimDeSemana(iso) && !isFeriado(iso);

export function sobrepoe(aIni, aFim, bIni, bFim) {
  return aIni <= bFim && bIni <= aFim;
}

export function diasSobrepostos(aIni, aFim, bIni, bFim) {
  const ini = aIni > bIni ? aIni : bIni;
  const fim = aFim < bFim ? aFim : bFim;
  return ini > fim ? 0 : diasInclusivo(ini, fim);
}

export function aniversarioNoPeriodo(nascimento, inicio, dias) {
  const [, mes, dia] = nascimento.split('-').map(Number);
  for (let i = 0; i < dias; i++) {
    const d = addDays(inicio, i);
    const [ano, m, dd] = d.split('-').map(Number);
    const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
    const alvoDia = mes === 2 && dia === 29 && !bissexto ? 28 : dia;
    if (m === mes && dd === alvoDia) return d;
  }
  return null;
}

export const formatBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
export const formatMes = (chave) => {
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [a, m] = chave.split('-').map(Number);
  return `${nomes[m - 1]}/${a}`;
};
export const idade = (nascimento, ref) => Math.floor(monthsBetween(nascimento, ref) / 12);
