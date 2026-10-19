const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const brl = (n) => moeda.format(n || 0);
export const num = (n) => numero.format(n || 0);
export const pct = (n) => `${numero.format(n || 0)}%`;

export function minParaHoras(min) {
  const sinal = min < 0 ? '-' : '';
  const abs = Math.abs(Math.round(min));
  return `${sinal}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export const horaParaMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const primeiroNome = (nome) => nome.split(' ')[0];

export function iniciais(nome) {
  const partes = nome.split(' ').filter(Boolean);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}
