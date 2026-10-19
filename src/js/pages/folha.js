import { html } from '../core/html.js';
import { CONFIG } from '../config.js';
import { formatBR, formatMes } from '../core/dates.js';
import { brl } from '../core/format.js';
import { REGRAS_CONTRATO } from '../domain/payroll.js';
import {
  gerarFolha, folhaDoColaborador, pendenciasFechamento, fecharCompetencia, totaisFolha,
} from '../domain/fechamento.js';
import { registrarSuspensao } from '../domain/timeclock.js';
import {
  badge, aviso, tabela, acoes, formularios, opcoes, kpi, CONTRATO_ROTULO,
} from '../ui.js';

const vista = { mes: '2026-09', sel: null };
const MESES = ['2026-10', '2026-09', '2026-08'];

const seletorMes = () => html`<div><label class="sr-only" for="f-mes">Competência</label>
  <select id="f-mes" data-filtro="mes">${opcoes(MESES.map((m) => [m, formatMes(m)]), vista.mes)}</select></div>`;

function holerite(folha, emp, previa) {
  const lista = (itens) => itens.map((i) => html`<li><span>${i.descricao}${i.ref ? html` <span class="muted small">(${i.ref})</span>` : ''}</span><strong>${brl(i.valor)}</strong></li>`);
  return html`
    <section class="card" aria-labelledby="t-hol">
      <div class="row between"><h2 id="t-hol">Holerite · ${emp.nome} · ${formatMes(folha.competencia)}</h2>
        ${badge(previa ? 'Prévia' : 'Competência fechada', previa ? 'warn' : 'ok')}</div>
      <p class="muted small">${CONTRATO_ROTULO[emp.contrato]} · ${emp.cargo} · ${emp.setor}</p>
      <div class="grid grid-2">
        <div><h3>Proventos</h3><ul class="list">${lista(folha.proventos)}</ul></div>
        <div><h3>Descontos</h3>${folha.descontos.length ? html`<ul class="list">${lista(folha.descontos)}</ul>` : html`<p class="muted">Sem descontos neste contrato/competência.</p>`}</div>
      </div>
      <div class="row between mt"><span>Bruto ${brl(folha.totais.bruto)} − Descontos ${brl(folha.totais.descontos)}</span>
        <strong style="font-size:1.3rem">Líquido ${brl(folha.totais.liquido)}</strong></div>
      ${folha.fgts ? html`<p class="small muted">FGTS depositado pela empresa: ${brl(folha.fgts)} (${emp.contrato === 'aprendiz' ? '2%' : '8%'}).</p>` : ''}
    </section>`;
}

function regrasContrato() {
  return html`<div class="grid grid-3">${Object.entries(REGRAS_CONTRATO).map(([, r]) => html`
    <div class="card"><h3>${r.titulo}</h3><ul class="steps">${r.pontos.map((p) => html`<li>${p}</li>`)}</ul></div>`)}</div>`;
}

export const paginaFolha = {
  caminho: '/folha',
  titulo: 'Folha de pagamento',
  icone: '💰',
  perfis: ['rh', 'gestor', 'colaborador'],
  render({ estado, user }) {
    const fechada = estado.fechamentos[vista.mes];
    const snapshot = (empId) => fechada?.folha?.find((f) => f.empId === empId);

    if (user.perfil !== 'rh') {
      const { folha } = folhaDoColaborador(estado, user, vista.mes);
      const final = snapshot(user.id) || folha;
      return html`
        <div class="topline"><div><h1>Meu holerite</h1><p>Cálculo conforme as regras do contrato ${CONTRATO_ROTULO[user.contrato]}</p></div>${seletorMes()}</div>
        ${holerite(final, user, fechada?.status !== 'fechada')}
        <h2 class="mt">Regras do seu contrato</h2>
        <div class="card"><ul class="steps">${REGRAS_CONTRATO[user.contrato].pontos.map((p) => html`<li>${p}</li>`)}</ul></div>`;
    }

    const linhas = gerarFolha(estado, vista.mes);
    const pendencias = pendenciasFechamento(estado, vista.mes, linhas);
    const resolvidas = linhas.map((l) => ({ ...l, folha: snapshot(l.emp.id) || l.folha }));
    const totais = totaisFolha(resolvidas);
    const sel = resolvidas.find((l) => l.emp.id === vista.sel);
    const ativos = estado.funcionarios.filter((f) => !f.desligamento && f.contrato !== 'estagiario');

    return html`
      <div class="topline"><div><h1>Folha de pagamento</h1><p>Fechamento mensal com faltas, suspensões e férias · cálculo por tipo de contrato</p></div>
        <div class="row">${seletorMes()}${badge(fechada?.status === 'fechada' ? `Fechada em ${formatBR(fechada.fechadaEm)}` : 'Em aberto', fechada?.status === 'fechada' ? 'ok' : 'warn')}</div></div>

      <div class="grid grid-4">
        ${kpi({ label: 'Colaboradores na folha', valor: resolvidas.length, nota: 'Inclui desligados no mês' })}
        ${kpi({ label: 'Total bruto', valor: brl(totais.bruto) })}
        ${kpi({ label: 'Total líquido', valor: brl(totais.liquido), nota: `Descontos ${brl(totais.descontos)}` })}
        ${kpi({ label: 'FGTS da empresa', valor: brl(totais.fgts), nota: 'CLT 8% · aprendiz 2%' })}
      </div>

      <div class="mt">${fechada?.status === 'fechada'
        ? aviso('ok', 'Competência fechada: os valores abaixo estão congelados.')
        : pendencias.length
          ? aviso('warn', html`<strong>${pendencias.length} pendência(s) impedem o fechamento:</strong><ul>${pendencias.map((p) => html`<li>${p.texto}</li>`)}</ul>`)
          : aviso('ok', 'Sem pendências. A competência pode ser fechada.')}</div>

      <div class="mt">${tabela(
        ['Colaborador', 'Faltas', { t: 'Atraso (min)', num: true }, 'Susp.', 'Férias', { t: 'Bruto', num: true }, { t: 'Descontos', num: true }, { t: 'Líquido', num: true }, ''],
        resolvidas.map(({ emp, freq, folha }) => [
          html`${emp.nome}<div>${badge(CONTRATO_ROTULO[emp.contrato], 'neutral')}</div>`,
          freq.faltas.length + (freq.faltasAbonadas.length ? ` (+${freq.faltasAbonadas.length} abon.)` : ''),
          freq.descontavelMin, freq.suspensaoDias || '—', freq.feriasDias ? `${freq.feriasDias} d` : '—',
          brl(folha.totais.bruto), brl(folha.totais.descontos), html`<strong>${brl(folha.totais.liquido)}</strong>`,
          html`<button class="btn btn-ghost btn-sm" data-acao="detalhe" data-id="${emp.id}">Ver holerite</button>`,
        ]),
      )}</div>

      <div class="row mt"><button class="btn btn-primary" data-acao="fechar" ${fechada?.status === 'fechada' || pendencias.length ? 'disabled' : ''}>Fechar competência</button></div>

      ${sel ? html`<div class="mt">${holerite(sel.folha, sel.emp, fechada?.status !== 'fechada')}</div>` : ''}

      <section class="card mt" aria-labelledby="t-susp"><h2 id="t-susp">Registrar suspensão disciplinar</h2>
        <form data-form="suspensao">
          <div><label for="s-emp">Colaborador</label><select id="s-emp" name="empId">${ativos.map((f) => html`<option value="${f.id}">${f.nome}</option>`)}</select></div>
          <div class="grid grid-2"><div><label for="s-ini">Início</label><input id="s-ini" name="inicio" type="date" required /></div><div><label for="s-fim">Fim</label><input id="s-fim" name="fim" type="date" required /></div></div>
          <div><label for="s-mot">Motivo</label><input id="s-mot" name="motivo" required minlength="5" /></div>
          <button class="btn btn-ghost" type="submit">Registrar suspensão</button>
        </form></section>

      <h2 class="mt">Regras por tipo de contrato</h2>${regrasContrato()}`;
  },
  bind(root, ctx) {
    root.querySelector('[data-filtro]')?.addEventListener('change', (e) => { vista.mes = e.target.value; vista.sel = null; ctx.refresh(); });
    acoes(root, {
      detalhe: (el) => { vista.sel = el.dataset.id; ctx.refresh(); },
      fechar: () => {
        const r = ctx.atualizar((e) => fecharCompetencia(e, vista.mes, ctx.user.id));
        ctx.toast(r.ok ? `Competência ${formatMes(vista.mes)} fechada.` : 'Resolva as pendências antes de fechar.', r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
    });
    formularios(root, {
      suspensao: (_f, d) => {
        const r = ctx.atualizar((e) => registrarSuspensao(e, {
          empId: d.get('empId'), inicio: d.get('inicio'), fim: d.get('fim'), motivo: d.get('motivo'), porId: ctx.user.id,
        }));
        ctx.toast(r.ok ? 'Suspensão registrada. A folha foi recalculada.' : r.erro, r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
    });
  },
};
