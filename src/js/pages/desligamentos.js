import { html } from '../core/html.js';
import { CONFIG } from '../config.js';
import { addMonths, formatBR, formatMes, monthsBetween } from '../core/dates.js';
import {
  turnover, serieTurnover, desligamentosPorMotivo, desligamentosNoPeriodo, registrarDesligamento, MOTIVOS_DESLIGAMENTO,
} from '../domain/metrics.js';
import { registrarAuditoria } from '../core/audit.js';
import {
  badge, tabela, acoes, formularios, opcoes, kpi, barras, colunas, CONTRATO_ROTULO,
} from '../ui.js';
import { pct, num } from '../core/format.js';

const tempoCasa = (f) => monthsBetween(f.admissao, f.desligamento.data);

export const paginaDesligamentos = {
  caminho: '/desligamentos',
  titulo: 'Desligamentos',
  icone: '🚪',
  perfis: ['rh'],
  render({ estado }) {
    const hoje = CONFIG.dataReferencia;
    const t = turnover(estado, hoje);
    const saidas = desligamentosNoPeriodo(estado, addMonths(hoje, -12), hoje).sort((a, b) => b.desligamento.data.localeCompare(a.desligamento.data));
    const media = saidas.length ? saidas.reduce((s, f) => s + tempoCasa(f), 0) / saidas.length : 0;
    const ativos = estado.funcionarios.filter((f) => !f.desligamento);
    return html`
      <div class="topline"><div><h1>Desligamentos</h1><p>Indicadores de rotatividade e registro de saídas</p></div></div>
      <div class="grid grid-3">
        ${kpi({ label: 'Turnover (12 meses)', valor: pct(t.taxa), nota: `${t.saidas} saídas sobre ${num(t.headcountMedio)} colaboradores em média`, alerta: t.taxa > 25 })}
        ${kpi({ label: 'Tempo médio de casa', valor: `${num(media)} meses`, nota: 'Entre quem saiu no período' })}
        ${kpi({ label: 'Saídas no período', valor: saidas.length })}
      </div>
      <div class="grid grid-2 mt">
        <section class="card"><h2>Saídas por mês</h2>${colunas(serieTurnover(estado, hoje).map((s) => ({ rotulo: formatMes(s.mes), valor: s.saidas })))}</section>
        <section class="card"><h2>Motivos</h2>${barras(desligamentosPorMotivo(estado, hoje).map((m) => ({ rotulo: m.motivo, valor: m.total })))}</section>
      </div>
      <section class="mt"><h2>Histórico (12 meses)</h2>${tabela(['Colaborador', 'Contrato', 'Setor', 'Data', 'Motivo', 'Tempo de casa'], saidas.map((f) => [
        f.nome, badge(CONTRATO_ROTULO[f.contrato], 'neutral'), f.setor, formatBR(f.desligamento.data), MOTIVOS_DESLIGAMENTO[f.desligamento.motivo], `${tempoCasa(f)} meses`,
      ]))}</section>
      <section class="card mt" aria-labelledby="t-novo"><h2 id="t-novo">Registrar desligamento</h2>
        <form data-form="desligar">
          <div><label for="d-emp">Colaborador</label><select id="d-emp" name="empId">${ativos.map((f) => html`<option value="${f.id}">${f.nome} · ${f.cargo}</option>`)}</select></div>
          <div class="grid grid-2"><div><label for="d-data">Data</label><input id="d-data" name="data" type="date" required value="${hoje}" /></div>
            <div><label for="d-mot">Motivo</label><select id="d-mot" name="motivo">${opcoes(Object.entries(MOTIVOS_DESLIGAMENTO))}</select></div></div>
          <div class="alert warn">Solicitações de férias pendentes do colaborador serão rejeitadas. Verbas rescisórias não fazem parte deste protótipo.</div>
          <button class="btn btn-danger" type="submit">Confirmar desligamento</button>
        </form></section>`;
  },
  bind(root, ctx) {
    formularios(root, {
      desligar: (_f, d) => {
        const nome = ctx.estado.funcionarios.find((f) => f.id === d.get('empId'))?.nome;
        if (!window.confirm(`Confirmar o desligamento de ${nome}?`)) return;
        const r = ctx.atualizar((e) => {
          const res = registrarDesligamento(e, { empId: d.get('empId'), data: d.get('data'), motivo: d.get('motivo'), porId: ctx.user.id });
          if (res.ok) registrarAuditoria(e, { por: ctx.user.id, acao: 'desligamento.registrado', detalhe: d.get('empId') });
          return res;
        });
        ctx.toast(r.ok ? 'Desligamento registrado.' : r.erro, r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
    });
    acoes(root, {});
  },
};
