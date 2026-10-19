import { html } from '../core/html.js';
import { CONFIG } from '../config.js';
import { formatBR, weekday, formatMes } from '../core/dates.js';
import { minParaHoras } from '../core/format.js';
import {
  resumoMes, avaliarDiaEstado, marcacoesDoDia, registrarMarcacao, solicitarJustificativa, decidirJustificativa, ROTULOS_STATUS,
} from '../domain/timeclock.js';
import { badge, aviso, tabela, acoes, formularios, opcoes, kpi } from '../ui.js';

const vista = { empId: null, mes: '2026-10' };
const TOM = { ok: 'ok', atraso: 'warn', saida_antecipada: 'warn', falta: 'danger', falta_abonada: 'info', inconsistente: 'danger', ferias: 'info', suspensao: 'danger', folga: 'neutral', aguardando: 'neutral', em_andamento: 'info' };
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['2026-10', '2026-09', '2026-08'];
const OCULTOS = ['folga', 'fora_vinculo', 'futuro'];

function equipe(estado, user) {
  const ativos = estado.funcionarios.filter((f) => !f.desligamento);
  if (user.perfil === 'rh') return ativos;
  if (user.perfil === 'gestor') return ativos.filter((f) => f.gestorId === user.id || f.id === user.id);
  return [user];
}

const pendentesParaDecidir = (estado, user, lista) => estado.justificativas.filter((j) => j.status === 'pendente' && j.empId !== user.id && lista.some((f) => f.id === j.empId));

export const paginaPonto = {
  caminho: '/ponto',
  titulo: 'Jornada e ponto',
  icone: '⏱',
  perfis: ['rh', 'gestor', 'colaborador'],
  render({ estado, user }) {
    const lista = equipe(estado, user);
    if (!lista.some((f) => f.id === vista.empId)) vista.empId = user.id;
    const alvo = estado.funcionarios.find((f) => f.id === vista.empId);
    const hoje = CONFIG.dataReferencia;
    const marcasHoje = marcacoesDoDia(estado, user.id, hoje);
    const avalHoje = avaliarDiaEstado(estado, user, hoje);
    const resumo = resumoMes(estado, alvo, vista.mes);
    const linhas = resumo.dias.filter((d) => !OCULTOS.includes(d.status));
    const justificaveis = vista.empId === user.id
      ? resumo.dias.filter((d) => ['falta', 'inconsistente'].includes(d.status)
        && !estado.justificativas.some((j) => j.empId === user.id && j.data === d.data && j.status !== 'rejeitada'))
      : [];
    const aDecidir = pendentesParaDecidir(estado, user, lista);
    const horarioPrev = user.horario;

    return html`
      <div class="topline"><div><h1>Jornada e ponto</h1><p>Registro por biometria ou app, espelho mensal e justificativas</p></div></div>

      <div class="grid grid-2">
        <section class="card" aria-labelledby="t-reg">
          <h2 id="t-reg">Registrar minha marcação · ${formatBR(hoje)}</h2>
          <p class="muted small">Jornada prevista: ${horarioPrev.entrada} às ${horarioPrev.saida}${horarioPrev.intervaloMin ? ` (intervalo de ${horarioPrev.intervaloMin} min)` : ''}. No protótipo você informa o horário da batida para simular situações como atraso.</p>
          <form data-form="marcar">
            <div class="grid grid-2">
              <div><label for="hora">Horário da batida</label><input id="hora" name="hora" type="time" required value="${marcasHoje.length ? '' : horarioPrev.entrada}" /></div>
              <div><label for="origem">Origem</label><select id="origem" name="origem">${opcoes([['biometrico', 'Leitor biométrico'], ['app', 'Aplicativo']], 'app')}</select></div>
            </div>
            <button class="btn btn-primary" type="submit">Registrar marcação</button>
          </form>
          <div class="mt">
            <strong class="small">Marcações de hoje:</strong>
            ${marcasHoje.length ? html`<p>${marcasHoje.join(' · ')}</p>` : html`<p class="muted small">Nenhuma marcação ainda.</p>`}
            ${avalHoje.alertas.map((a) => aviso('warn', a))}
          </div>
        </section>

        <section class="card" aria-labelledby="t-res">
          <h2 id="t-res">Resumo de ${formatMes(vista.mes)}${alvo.id !== user.id ? html` · ${alvo.nome}` : ''}</h2>
          <div class="grid grid-2">
            ${kpi({ label: 'Faltas injustificadas', valor: resumo.faltas.length, nota: `${resumo.faltasAbonadas.length} abonada(s)`, alerta: resumo.faltas.length > 0 })}
            ${kpi({ label: 'Atrasos descontáveis', valor: minParaHoras(resumo.descontavelMin), nota: `${resumo.atrasoMin} min no total, tolerância de ${CONFIG.toleranciaMarcacaoMin} min` })}
            ${kpi({ label: 'Horas extras pagas', valor: minParaHoras(resumo.extraMin), nota: resumo.excessoMin ? `${resumo.excessoMin} min de excesso bloqueado` : 'Sem excesso' })}
            ${kpi({ label: 'Marcações inconsistentes', valor: resumo.inconsistencias.length, nota: 'Bloqueiam o fechamento da folha', alerta: resumo.inconsistencias.length > 0 })}
          </div>
        </section>
      </div>

      <section class="mt" aria-labelledby="t-esp">
        <div class="row between"><h2 id="t-esp">Espelho de ponto</h2>
          <div class="row">
            ${lista.length > 1 ? html`<div><label class="sr-only" for="f-emp">Colaborador</label><select id="f-emp" data-filtro="empId">${opcoes(lista.map((f) => [f.id, f.nome]), vista.empId)}</select></div>` : ''}
            <div><label class="sr-only" for="f-mes">Competência</label><select id="f-mes" data-filtro="mes">${opcoes(MESES.map((m) => [m, formatMes(m)]), vista.mes)}</select></div>
          </div>
        </div>
        ${tabela(['Data', 'Marcações', 'Trabalhado', 'Situação', 'Observações'], linhas.map((d) => [
          html`${formatBR(d.data)} <span class="muted">${DIAS[weekday(d.data)]}</span>`,
          marcacoesDoDia(estado, alvo.id, d.data).join(' · ') || '—',
          d.trabalhadoMin ? minParaHoras(d.trabalhadoMin) : '—',
          badge(ROTULOS_STATUS[d.status] + (d.status === 'atraso' ? ` (${d.atrasoMin} min)` : ''), TOM[d.status]),
          d.alertas.join(' ') || (d.extraMin ? `Hora extra: ${d.extraMin} min` : ''),
        ]), { vazioTexto: 'Sem registros neste mês.' })}
      </section>

      ${justificaveis.length ? html`
        <section class="card mt" aria-labelledby="t-just"><h2 id="t-just">Justificar ausência ou marcação</h2>
          <form data-form="justificar">
            <div><label for="j-data">Dia</label><select id="j-data" name="data">${justificaveis.map((d) => html`<option value="${d.data}">${formatBR(d.data)} · ${ROTULOS_STATUS[d.status]}</option>`)}</select></div>
            <div><label for="j-motivo">Motivo</label><textarea id="j-motivo" name="motivo" required minlength="5" placeholder="Explique o que aconteceu e, se houver, o comprovante."></textarea></div>
            <button class="btn btn-primary" type="submit">Enviar para aprovação</button>
          </form></section>` : ''}

      ${aDecidir.length ? html`
        <section class="mt" aria-labelledby="t-apr"><h2 id="t-apr">Justificativas aguardando decisão</h2>
          ${tabela(['Colaborador', 'Dia', 'Motivo', ''], aDecidir.map((j) => [
            estado.funcionarios.find((f) => f.id === j.empId).nome, formatBR(j.data), j.motivo,
            html`<button class="btn btn-primary btn-sm" data-acao="aprovar" data-id="${j.id}">Abonar</button> <button class="btn btn-ghost btn-sm" data-acao="rejeitar" data-id="${j.id}">Rejeitar</button>`,
          ]))}</section>` : ''}`;
  },
  bind(root, ctx) {
    root.querySelectorAll('[data-filtro]').forEach((el) => el.addEventListener('change', () => { vista[el.dataset.filtro] = el.value; ctx.refresh(); }));
    formularios(root, {
      marcar: (_f, d) => {
        const r = ctx.atualizar((e) => registrarMarcacao(e, { empId: ctx.user.id, data: ctx.hoje, hora: d.get('hora'), origem: d.get('origem') }));
        ctx.toast(r.ok ? 'Marcação registrada.' : r.erro, r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
      justificar: (_f, d) => {
        const r = ctx.atualizar((e) => solicitarJustificativa(e, { empId: ctx.user.id, data: d.get('data'), motivo: d.get('motivo'), agora: ctx.hoje }));
        ctx.toast(r.ok ? 'Justificativa enviada ao gestor.' : r.erro, r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
    });
    const decidir = (aprovar) => (el) => {
      const r = ctx.atualizar((e) => decidirJustificativa(e, { id: el.dataset.id, aprovar, porId: ctx.user.id }));
      ctx.toast(r.ok ? (aprovar ? 'Falta abonada.' : 'Justificativa rejeitada.') : r.erro, r.ok ? 'ok' : 'danger');
      ctx.refresh();
    };
    acoes(root, { aprovar: decidir(true), rejeitar: decidir(false) });
  },
};
