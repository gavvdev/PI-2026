import { html } from '../core/html.js';
import { CONFIG } from '../config.js';
import { formatBR } from '../core/dates.js';
import {
  validarSolicitacao, solicitarFerias, decidirFerias, podeDecidir, saldoFerias, direitoTotalDias, limiteConcessivo, proximoDireito,
  alertasFerias, feriasDoColaborador,
} from '../domain/vacation.js';
import {
  badge, aviso, tabela, acoes, formularios, kpi, STATUS_TOM, CONTRATO_ROTULO,
} from '../ui.js';
import { REGRAS_CONTRATO } from '../domain/payroll.js';

const REGRAS_FERIAS = {
  clt: ['30 dias após 12 meses; reduzidos por faltas injustificadas (art. 130)', 'Até 3 períodos: um de 14+ dias e os demais de 5+ dias', 'Início vedado nos 2 dias antes de feriado ou descanso semanal', 'Antecedência mínima de 30 dias (política da empresa)', 'Limite de 30% do setor em férias ao mesmo tempo'],
  aprendiz: ['30 dias após 12 meses de contrato', 'Devem coincidir com as férias escolares (sem exceção)', 'Mesmas regras de fracionamento da CLT', 'Antecedência mínima de 30 dias'],
  estagiario: ['Recesso de 30 dias por 12 meses; proporcional antes disso (2,5 dias/mês)', 'Preferencialmente nas férias escolares: fora delas exige exceção aprovada pelo RH', 'Deve terminar antes do fim do termo de estágio', 'Antecedência mínima de 30 dias'],
};

function painelValidacao(v) {
  if (!v.dias) return html`<p class="muted small">Informe as datas para validar as regras automaticamente.</p>`;
  const blocos = [];
  if (v.bloqueios.length) {
    blocos.push(aviso('danger', html`<strong>Solicitação bloqueada pelas regras:</strong><ul>${v.bloqueios.map((b) => html`<li>${b.mensagem}</li>`)}</ul>`));
    if (v.precisaExcecao) blocos.push(aviso('info', 'Este caso permite solicitar exceção: o pedido seguirá para análise do RH com sua justificativa.'));
  } else {
    blocos.push(aviso('ok', `Período válido: ${v.dias} dias corridos. Saldo após a solicitação: ${v.saldo - v.dias} dias.`));
  }
  v.avisos.forEach((a) => blocos.push(aviso('warn', a)));
  return html`${blocos}`;
}

export const paginaFerias = {
  caminho: '/ferias',
  titulo: 'Férias e alertas',
  icone: '🏖',
  perfis: ['rh', 'gestor', 'colaborador'],
  render({ estado, user }) {
    const hoje = CONFIG.dataReferencia;
    const saldo = saldoFerias(estado, user, hoje);
    const direito = direitoTotalDias(user, hoje);
    const limite = limiteConcessivo(user, hoje);
    const minhas = feriasDoColaborador(estado, user.id).sort((a, b) => b.inicio.localeCompare(a.inicio));
    const nome = (id) => estado.funcionarios.find((f) => f.id === id).nome;
    const pendentes = estado.ferias.filter((f) => f.status === 'pendente' && podeDecidir(estado, user, f));
    const alertas = user.perfil === 'rh' ? alertasFerias(estado, hoje) : [];
    const proprio = alertasFerias(estado, hoje).find((a) => a.emp.id === user.id);

    return html`
      <div class="topline"><div><h1>Férias e alertas</h1><p>Solicitações com validação automática pelas regras legais e da empresa · contrato ${CONTRATO_ROTULO[user.contrato]}</p></div></div>
      <div class="grid grid-3">
        ${kpi({ label: 'Saldo disponível', valor: `${saldo} dias`, nota: `${direito} dias de direito acumulado` })}
        ${kpi({ label: user.contrato === 'estagiario' ? 'Termo do estágio' : 'Limite para gozo', valor: formatBR(user.contrato === 'estagiario' ? user.fimContrato : limite) || '—', nota: user.contrato === 'estagiario' ? 'O recesso deve terminar antes' : `Próximo direito em ${formatBR(proximoDireito(user, hoje))}` })}
        ${kpi({ label: 'Solicitações em aberto', valor: minhas.filter((f) => f.status === 'pendente').length, nota: 'Aguardando decisão' })}
      </div>
      ${proprio ? html`<div class="mt">${aviso(proprio.critico ? 'danger' : 'warn', `Você tem ${proprio.saldo} dias a gozar até ${formatBR(proprio.limite)} (${proprio.diasRestantes} dias). Após o prazo, a empresa paga em dobro.`)}</div>` : ''}

      <div class="grid grid-2 mt">
        <section class="card" aria-labelledby="t-sol">
          <h2 id="t-sol">Nova solicitação</h2>
          <form data-form="solicitar" novalidate>
            <div class="grid grid-2">
              <div><label for="ini">Início</label><input id="ini" name="inicio" type="date" required /></div>
              <div><label for="fim">Fim</label><input id="fim" name="fim" type="date" required /></div>
            </div>
            <div id="validacao" aria-live="polite">${painelValidacao({ dias: 0 })}</div>
            <div id="bloco-excecao" hidden>
              <div class="inline"><input id="excecao" name="excecao" type="checkbox" /><label for="excecao">Solicitar exceção ao RH</label></div>
              <label for="just-exc" class="mt">Justificativa da exceção</label>
              <textarea id="just-exc" name="justificativa" placeholder="Explique por que o recesso não pode ser nas férias escolares."></textarea>
            </div>
            <button id="enviar" class="btn btn-primary" type="submit" disabled>Solicitar férias</button>
          </form>
        </section>
        <section class="card" aria-labelledby="t-reg">
          <h2 id="t-reg">Regras do seu contrato</h2>
          <ul class="steps">${REGRAS_FERIAS[user.contrato].map((r) => html`<li>${r}</li>`)}</ul>
          <p class="small muted">${REGRAS_CONTRATO[user.contrato].titulo}: regras configuradas no módulo de férias (vacation.js).</p>
        </section>
      </div>

      <section class="mt" aria-labelledby="t-min"><h2 id="t-min">Minhas solicitações</h2>
        ${tabela(['Período', 'Dias', 'Situação', 'Observação'], minhas.map((f) => [
          `${formatBR(f.inicio)} a ${formatBR(f.fim)}`, f.dias,
          badge(f.status, STATUS_TOM[f.status]),
          f.excecao ? html`${badge('Exceção', 'info')} ${f.justificativaExcecao}` : (f.nota || ''),
        ]), { vazioTexto: 'Você ainda não fez solicitações.' })}</section>

      ${pendentes.length ? html`<section class="mt" aria-labelledby="t-apr"><h2 id="t-apr">Aguardando minha decisão</h2>
        ${tabela(['Colaborador', 'Período', 'Dias', 'Tipo', ''], pendentes.map((f) => [
          nome(f.empId), `${formatBR(f.inicio)} a ${formatBR(f.fim)}`, f.dias,
          f.excecao ? html`${badge('Exceção', 'info')}<div class="small muted">${f.justificativaExcecao}</div>` : 'Regular',
          html`<button class="btn btn-primary btn-sm" data-acao="aprovar" data-id="${f.id}">Aprovar</button> <button class="btn btn-ghost btn-sm" data-acao="rejeitar" data-id="${f.id}">Rejeitar</button>`,
        ]))}</section>` : ''}

      ${alertas.length ? html`<section class="mt" aria-labelledby="t-al"><h2 id="t-al">Alertas de vencimento (RH)</h2>
        ${tabela(['Colaborador', 'Saldo', 'Limite concessivo', 'Restam', ''], alertas.map((a) => [
          a.emp.nome, `${a.saldo} dias`, formatBR(a.limite), `${a.diasRestantes} dias`, badge(a.critico ? 'Crítico' : 'Atenção', a.critico ? 'danger' : 'warn'),
        ]))}</section>` : ''}`;
  },
  bind(root, ctx) {
    const ini = root.querySelector('#ini');
    const fim = root.querySelector('#fim');
    const area = root.querySelector('#validacao');
    const bloco = root.querySelector('#bloco-excecao');
    const chk = root.querySelector('#excecao');
    const btn = root.querySelector('#enviar');
    const validar = () => {
      const v = validarSolicitacao(ctx.estado, { empId: ctx.user.id, inicio: ini.value, fim: fim.value }, ctx.hoje);
      area.innerHTML = painelValidacao(v).toString();
      bloco.hidden = !v.precisaExcecao;
      btn.disabled = !(v.ok || (v.precisaExcecao && chk.checked));
    };
    [ini, fim, chk].forEach((el) => el.addEventListener('change', validar));
    formularios(root, {
      solicitar: (_f, d) => {
        const r = ctx.atualizar((e) => solicitarFerias(e, {
          empId: ctx.user.id, inicio: d.get('inicio'), fim: d.get('fim'), excecao: d.get('excecao') === 'on', justificativaExcecao: d.get('justificativa') || '',
        }, ctx.hoje));
        if (!r.ok) {
          area.innerHTML = painelValidacao(r.validacao).toString();
          ctx.toast('Solicitação não enviada.', 'danger');
          return;
        }
        ctx.toast('Solicitação enviada para aprovação.', 'ok');
        ctx.refresh();
      },
    });
    const decidir = (aprovar) => (el) => {
      const r = ctx.atualizar((e) => decidirFerias(e, { id: el.dataset.id, aprovar, decisorId: ctx.user.id }));
      ctx.toast(r.ok ? (aprovar ? 'Férias aprovadas.' : 'Solicitação rejeitada.') : r.erro, r.ok ? 'ok' : 'danger');
      ctx.refresh();
    };
    acoes(root, { aprovar: decidir(true), rejeitar: decidir(false) });
  },
};
