import { html } from '../core/html.js';
import { CONFIG } from '../config.js';
import { formatBR, formatMes, monthKey, addMonths, weekday } from '../core/dates.js';
import { brl, pct, num, primeiroNome } from '../core/format.js';
import {
  indicadoresRH, aniversariantesDaSemana, serieTurnover, ativos,
} from '../domain/metrics.js';
import { resumoPorCategoria, estaAtrasada, estaAberta } from '../domain/ombudsman.js';
import { alertasFerias, saldoFerias } from '../domain/vacation.js';
import { avaliarDiaEstado, resumoMes, ROTULOS_STATUS, marcacoesDoDia } from '../domain/timeclock.js';
import { pendenciasFechamento, folhaDoColaborador } from '../domain/fechamento.js';
import { trilhaDoColaborador, saldoPontos } from '../domain/courses.js';
import {
  badge, aviso, tabela, kpi, barras, colunas, CONTRATO_ROTULO,
} from '../ui.js';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const TOM = { ok: 'ok', atraso: 'warn', falta: 'danger', inconsistente: 'danger', ferias: 'info', aguardando: 'neutral', em_andamento: 'info' };

function painelRH(estado) {
  const hoje = CONFIG.dataReferencia;
  const i = indicadoresRH(estado, hoje);
  const atrasadas = estado.ouvidoria.filter((r) => estaAtrasada(r, hoje));
  const ferias = alertasFerias(estado, hoje);
  const competenciaAnterior = monthKey(addMonths(hoje, -1));
  const pend = estado.fechamentos[competenciaAnterior]?.status === 'fechada' ? [] : pendenciasFechamento(estado, competenciaAnterior);
  const niver = aniversariantesDaSemana(estado, hoje);
  const alertas = [
    ...atrasadas.map((r) => aviso('danger', `Reclamação ${r.protocolo} (${r.categoria}) está fora do prazo de resposta.`)),
    ...ferias.map((a) => aviso(a.critico ? 'danger' : 'warn', `${a.emp.nome}: ${a.saldo} dias de férias a gozar em ${a.diasRestantes} dias (limite ${formatBR(a.limite)}).`)),
    ...(pend.length ? [aviso('warn', `Folha de ${formatMes(competenciaAnterior)} com ${pend.length} pendência(s) para fechamento.`)] : []),
  ];
  return html`
    <div class="grid grid-4">
      ${kpi({ label: 'Colaboradores ativos', valor: i.ativos, nota: `${i.contratos.clt} CLT · ${i.contratos.aprendiz} aprendizes · ${i.contratos.estagiario} estagiários` })}
      ${kpi({ label: 'Turnover 12 meses', valor: pct(i.turnover.taxa), nota: `${i.turnover.saidas} saídas`, alerta: i.turnover.taxa > 25 })}
      ${kpi({ label: 'Reclamações abertas', valor: i.reclamacoesAbertas, nota: `${i.reclamacoesCriticas} crítica(s)`, alerta: i.reclamacoesCriticas > 0 })}
      ${kpi({ label: 'Aguardando decisão', valor: i.feriasPendentes + i.justificativasPendentes, nota: `${i.feriasPendentes} férias · ${i.justificativasPendentes} justificativas` })}
    </div>
    <div class="grid grid-2 mt">
      <section class="card"><h2>Alertas</h2><div class="stack">${alertas.length ? alertas : html`<p class="muted">Sem alertas no momento.</p>`}</div></section>
      <section class="card"><h2>Aniversariantes da semana</h2>${niver.length
        ? html`<ul class="list">${niver.map((n) => html`<li><span>${n.emp.nome} <span class="muted">· ${n.emp.setor}</span></span><strong>${formatBR(n.data).slice(0, 5)} ${DIAS[weekday(n.data)]}</strong></li>`)}</ul>`
        : html`<p class="muted">Nenhum aniversariante nos próximos 7 dias.</p>`}</section>
    </div>
    <div class="grid grid-2 mt">
      <section class="card"><h2>Saídas por mês</h2>${colunas(serieTurnover(estado, hoje).map((s) => ({ rotulo: formatMes(s.mes), valor: s.saidas })))}</section>
      <section class="card"><h2>Reclamações por categoria</h2>${barras(resumoPorCategoria(estado).map((c) => ({ rotulo: c.categoria, valor: c.total })))}</section>
    </div>`;
}

function painelGestor(estado, user) {
  const hoje = CONFIG.dataReferencia;
  const time = ativos(estado).filter((f) => f.gestorId === user.id);
  const feriasPend = estado.ferias.filter((f) => f.status === 'pendente' && time.some((t) => t.id === f.empId));
  const justPend = estado.justificativas.filter((j) => j.status === 'pendente' && time.some((t) => t.id === j.empId));
  const mes = monthKey(hoje);
  return html`
    <div class="grid grid-3">
      ${kpi({ label: 'Pessoas no time', valor: time.length })}
      ${kpi({ label: 'Férias para aprovar', valor: feriasPend.length, alerta: feriasPend.length > 0 })}
      ${kpi({ label: 'Justificativas para decidir', valor: justPend.length, alerta: justPend.length > 0 })}
    </div>
    <section class="mt"><h2>Time hoje · ${formatBR(hoje)}</h2>${tabela(['Colaborador', 'Contrato', 'Marcações', 'Situação', 'Faltas no mês'], time.map((f) => {
      const d = avaliarDiaEstado(estado, f, hoje);
      return [f.nome, badge(CONTRATO_ROTULO[f.contrato], 'neutral'), marcacoesDoDia(estado, f.id, hoje).join(' · ') || '—', badge(ROTULOS_STATUS[d.status] || d.status, TOM[d.status]), resumoMes(estado, f, mes).faltas.length];
    }))}</section>
    <p class="mt muted small">Aprove férias e justificativas nas telas <a href="#/ferias">Férias</a> e <a href="#/ponto">Jornada e ponto</a>.</p>`;
}

function painelColaborador(estado, user) {
  const hoje = CONFIG.dataReferencia;
  const ultima = monthKey(addMonths(hoje, -1));
  const { folha } = folhaDoColaborador(estado, user, ultima);
  const dia = avaliarDiaEstado(estado, user, hoje);
  const atual = trilhaDoColaborador(estado, user.id).find((c) => c.status === 'current');
  const alerta = alertasFerias(estado, hoje).find((a) => a.emp.id === user.id);
  return html`
    ${alerta ? html`<div class="mb">${aviso(alerta.critico ? 'danger' : 'warn', `Você tem ${alerta.saldo} dias de férias a gozar até ${formatBR(alerta.limite)}. Solicite em Férias.`)}</div>` : ''}
    <div class="grid grid-4 mt">
      ${kpi({ label: 'Saldo de férias', valor: `${saldoFerias(estado, user, hoje)} dias` })}
      ${kpi({ label: 'Hoje', valor: ROTULOS_STATUS[dia.status] || '—', nota: marcacoesDoDia(estado, user.id, hoje).join(' · ') || 'Sem marcações' })}
      ${kpi({ label: `Líquido de ${formatMes(ultima)}`, valor: brl(folha.totais.liquido), nota: 'Prévia até o fechamento' })}
      ${kpi({ label: 'Pontos de cursos', valor: saldoPontos(estado, user.id), nota: atual ? `Próximo: ${atual.titulo}` : 'Trilha concluída' })}
    </div>`;
}

export const paginaDashboard = {
  caminho: '/dashboard',
  titulo: 'Início',
  icone: '🏠',
  perfis: ['rh', 'gestor', 'colaborador'],
  render({ estado, user }) {
    const titulo = { rh: 'Visão geral do RH', gestor: 'Visão do time', colaborador: `Olá, ${primeiroNome(user.nome)}` }[user.perfil];
    const corpo = { rh: painelRH, gestor: painelGestor, colaborador: painelColaborador }[user.perfil](estado, user);
    return html`<div class="topline"><div><h1>${titulo}</h1><p>${user.setor} · ${CONFIG.empresa}</p></div></div>${corpo}`;
  },
};
