import { html, raw } from './core/html.js';

export const badge = (texto, tom = '') => html`<span class="badge ${tom}">${texto}</span>`;

export const kpi = ({ label, valor, nota = '', alerta = false }) => html`
  <div class="card kpi ${alerta ? 'alert' : ''}">
    <div class="label">${label}</div>
    <div class="value">${valor}</div>
    <div class="note">${nota}</div>
  </div>`;

export const aviso = (tom, conteudo) => html`<div class="alert ${tom}" role="${tom === 'danger' ? 'alert' : 'status'}">${conteudo}</div>`;

export const vazio = (texto) => html`<p class="muted">${texto}</p>`;

export function tabela(cabecalhos, linhas, { vazioTexto = 'Nenhum registro.' } = {}) {
  if (!linhas.length) return html`<div class="card">${vazio(vazioTexto)}</div>`;
  return html`<div class="scroll-x"><table>
    <thead><tr>${cabecalhos.map((c) => html`<th class="${c.num ? 'num' : ''}">${c.num ? c.t : c}</th>`)}</tr></thead>
    <tbody>${linhas.map((l) => html`<tr>${l.map((cel, i) => html`<td class="${cabecalhos[i].num ? 'num' : ''}">${cel}</td>`)}</tr>`)}</tbody>
  </table></div>`;
}

export function barras(itens, { max = null } = {}) {
  const topo = max ?? Math.max(1, ...itens.map((i) => i.valor));
  if (!itens.length) return vazio('Sem dados no período.');
  return html`<div class="bars">${itens.map((i) => html`
    <div class="bar-row"><span>${i.rotulo}</span>
      <div class="bar-track" role="img" aria-label="${i.rotulo}: ${i.valor}"><div class="bar-fill" style="width:${(i.valor / topo) * 100}%"></div></div>
      <strong>${i.valor}</strong></div>`)}</div>`;
}

export function colunas(itens) {
  const topo = Math.max(1, ...itens.map((i) => i.valor));
  return html`<div class="columns">${itens.map((i) => html`
    <div class="col"><strong>${i.valor}</strong><span class="fill" style="height:${(i.valor / topo) * 90}%"></span><span class="muted">${i.rotulo}</span></div>`)}</div>`;
}

export function acoes(root, mapa) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-acao]');
    if (!el || !root.contains(el)) return;
    const fn = mapa[el.dataset.acao];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
}

export function formularios(root, mapa) {
  root.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    mapa[form.dataset.form]?.(form, new FormData(form));
  });
}

export const opcoes = (itens, selecionado) => itens.map(([valor, rotulo]) => html`<option value="${valor}" ${valor === selecionado ? raw('selected') : ''}>${rotulo}</option>`);
export const STATUS_TOM = { aprovada: 'ok', gozada: 'neutral', pendente: 'warn', rejeitada: 'danger' };
export const PERFIL_ROTULO = { rh: 'RH / Diretoria', gestor: 'Gestor', colaborador: 'Colaborador' };
export const CONTRATO_ROTULO = { clt: 'CLT', aprendiz: 'Aprendiz', estagiario: 'Estagiário' };
