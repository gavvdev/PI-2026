import { html } from '../core/html.js';
import { CONFIG } from '../config.js';
import { formatBR } from '../core/dates.js';
import {
  abrirReclamacao, atualizarStatus, classificar, consultar, estaAtrasada, prazoFinal, STATUS_OUVIDORIA, STATUS_ABERTOS,
} from '../domain/ombudsman.js';
import {
  badge, aviso, tabela, acoes, formularios, opcoes,
} from '../ui.js';

const vista = { aba: 'registrar', sel: null, resultado: null, consulta: null };
const TOM_PRIO = { critica: 'danger', alta: 'warn', normal: 'neutral' };
const ROTULO_PRIO = { critica: 'Crítica', alta: 'Alta', normal: 'Normal' };
const TOM_STATUS = { recebida: 'info', em_analise: 'warn', em_investigacao: 'warn', resolvida: 'ok', encerrada: 'neutral' };

const formRegistro = (logado) => html`
  <form data-form="registrar">
    <fieldset style="border:0;padding:0;margin:0"><legend class="small" style="font-weight:600;margin-bottom:6px">Como deseja se identificar?</legend>
      <div class="inline"><input type="radio" id="id-ident" name="modo" value="identificada" ${logado ? 'checked' : 'disabled'} /><label for="id-ident">Identificada (apenas o RH vê seu nome)</label></div>
      <div class="inline"><input type="radio" id="id-anon" name="modo" value="anonima" ${logado ? '' : 'checked'} /><label for="id-anon">Anônima (nenhum dado seu é gravado)</label></div>
    </fieldset>
    <div><label for="texto">Descreva a situação</label>
      <textarea id="texto" name="texto" required minlength="20" placeholder="O que aconteceu, quando e onde. Evite dados que possam identificar você caso queira anonimato."></textarea>
      <div class="hint">Não inclua dados pessoais seus ou de terceiros além do necessário (LGPD).</div></div>
    <div id="previa" aria-live="polite"></div>
    <button class="btn btn-primary" type="submit">Enviar reclamação</button>
  </form>`;

const cartaoResultado = (r) => html`
  <div class="card" role="status"><h3>Reclamação registrada</h3>
    <p>Protocolo</p><div class="protocolo">${r.protocolo}</div>
    ${r.chave ? html`<p class="mt">Chave de acompanhamento (guarde, ela não pode ser recuperada)</p><div class="protocolo">${r.chave}</div>` : ''}
    <p class="mt small muted">Classificação automática: ${r.classificacao.categoria} · prioridade ${ROTULO_PRIO[r.classificacao.prioridade].toLowerCase()}.</p></div>`;

const formConsulta = () => html`
  <form data-form="consultar">
    <div><label for="c-prot">Protocolo</label><input id="c-prot" name="protocolo" placeholder="OUV-2026-0000" required /></div>
    <div><label for="c-chave">Chave de acompanhamento</label><input id="c-chave" name="chave" required autocomplete="off" /></div>
    <button class="btn btn-primary" type="submit">Consultar andamento</button>
  </form>`;

const linhaHistorico = (h) => html`<li><strong>${STATUS_OUVIDORIA[h.status]}</strong> · ${formatBR(h.quando)}<div class="muted">${h.nota}</div></li>`;

function resultadoConsulta() {
  if (vista.consulta === null) return '';
  if (vista.consulta === false) return aviso('danger', 'Protocolo ou chave não encontrados. Confira os dados e tente novamente.');
  const r = vista.consulta;
  return html`<div class="card mt"><div class="row between"><h3>${r.protocolo}</h3>${badge(STATUS_OUVIDORIA[r.status], TOM_STATUS[r.status])}</div>
    <p class="small muted">Registrada em ${formatBR(r.criadaEm)} · prazo de resposta ${formatBR(prazoFinal(r))}</p><ul class="steps">${r.historico.map(linhaHistorico)}</ul></div>`;
}

function ligarFormularios(root, ctx, logado) {
  const texto = root.querySelector('#texto');
  const previa = root.querySelector('#previa');
  texto?.addEventListener('input', () => {
    if (texto.value.trim().length < 20) { previa.innerHTML = ''; return; }
    const c = classificar(texto.value);
    previa.innerHTML = aviso('info', html`Classificação sugerida: <strong>${c.categoria}</strong> · prioridade ${ROTULO_PRIO[c.prioridade].toLowerCase()}`).toString();
  });
  formularios(root, {
    registrar: (_f, d) => {
      const anonima = d.get('modo') === 'anonima';
      const r = ctx.atualizar((e) => abrirReclamacao(e, { texto: d.get('texto'), anonima, autorId: logado ? ctx.user.id : null }));
      if (!r.ok) { ctx.toast(r.erro, 'danger'); return; }
      vista.resultado = r;
      ctx.toast('Reclamação registrada.', 'ok');
      ctx.refresh();
    },
    consultar: (_f, d) => {
      vista.consulta = consultar(ctx.estado, d.get('protocolo'), d.get('chave')) || false;
      ctx.refresh();
    },
    status: (_f, d) => {
      const r = ctx.atualizar((e) => atualizarStatus(e, { id: vista.sel, status: d.get('status'), nota: d.get('nota'), porId: ctx.user.id }));
      ctx.toast(r.ok ? 'Status atualizado.' : r.erro, r.ok ? 'ok' : 'danger');
      ctx.refresh();
    },
  });
}

function filaRH(estado) {
  const peso = { critica: 0, alta: 1, normal: 2 };
  return [...estado.ouvidoria].sort((a, b) => (STATUS_ABERTOS.includes(b.status) - STATUS_ABERTOS.includes(a.status)) || peso[a.prioridade] - peso[b.prioridade] || a.criadaEm.localeCompare(b.criadaEm));
}

export const paginaOuvidoria = {
  caminho: '/ouvidoria',
  titulo: 'Ouvidoria',
  icone: '📣',
  perfis: ['rh', 'gestor', 'colaborador'],
  render({ estado, user }) {
    const ehRH = user.perfil === 'rh';
    const minhas = estado.ouvidoria.filter((o) => o.autorId === user.id);
    const sel = estado.ouvidoria.find((o) => o.id === vista.sel);
    const abas = [['registrar', 'Registrar'], ...(ehRH ? [['fila', 'Fila de tratamento']] : [['minhas', 'Minhas reclamações']]), ['consultar', 'Consultar anônima']];
    if (!abas.some(([id]) => id === vista.aba)) vista.aba = 'registrar';

    let corpo;
    if (vista.aba === 'registrar') {
      corpo = html`<div class="grid grid-2"><div class="card"><h2>Nova reclamação</h2>${formRegistro(true)}</div><div>${vista.resultado ? cartaoResultado(vista.resultado) : aviso('info', 'Reclamações são classificadas automaticamente por categoria e prioridade para acelerar o tratamento. Casos críticos têm prazo de 2 dias.')}</div></div>`;
    } else if (vista.aba === 'consultar') {
      corpo = html`<div class="grid grid-2"><div class="card"><h2>Acompanhar reclamação anônima</h2>${formConsulta()}</div><div>${resultadoConsulta()}</div></div>`;
    } else if (vista.aba === 'minhas') {
      corpo = tabela(['Protocolo', 'Categoria', 'Situação', 'Última atualização'], minhas.map((o) => [
        o.protocolo, o.categoria, badge(STATUS_OUVIDORIA[o.status], TOM_STATUS[o.status]), `${formatBR(o.historico.at(-1).quando)}: ${o.historico.at(-1).nota}`,
      ]), { vazioTexto: 'Você não tem reclamações identificadas.' });
    } else {
      corpo = html`${tabela(['Protocolo', 'Autor', 'Categoria', 'Prioridade', 'Situação', 'Prazo', ''], filaRH(estado).map((o) => [
        o.protocolo, o.anonima ? 'Anônimo' : estado.funcionarios.find((f) => f.id === o.autorId)?.nome,
        html`${o.categoria}<div class="small muted">confiança da classificação ${Math.round(o.confianca * 100)}%</div>`,
        badge(ROTULO_PRIO[o.prioridade], TOM_PRIO[o.prioridade]), badge(STATUS_OUVIDORIA[o.status], TOM_STATUS[o.status]),
        html`${formatBR(prazoFinal(o))} ${estaAtrasada(o, CONFIG.dataReferencia) ? badge('Atrasada', 'danger') : ''}`,
        html`<button class="btn btn-ghost btn-sm" data-acao="abrir" data-id="${o.id}">Tratar</button>`,
      ]))}
      ${sel ? html`<section class="card mt" aria-labelledby="t-trat"><h2 id="t-trat">${sel.protocolo} · ${sel.categoria}</h2>
        <p>${sel.texto}</p><ul class="steps">${sel.historico.map(linhaHistorico)}</ul>
        <form data-form="status"><div class="grid grid-2"><div><label for="st">Novo status</label><select id="st" name="status">${opcoes(Object.entries(STATUS_OUVIDORIA), sel.status)}</select></div>
          <div><label for="nota">Nota para o solicitante</label><input id="nota" name="nota" required minlength="5" /></div></div>
          <button class="btn btn-primary" type="submit">Atualizar</button></form></section>` : ''}`;
    }
    return html`
      <div class="topline"><div><h1>Canal de ouvidoria</h1><p>Reclamações anônimas ou identificadas, com acompanhamento de status</p></div></div>
      <div class="tabs" role="tablist">${abas.map(([id, nome]) => html`<button class="tab" role="tab" aria-selected="${id === vista.aba}" data-acao="aba" data-id="${id}">${nome}</button>`)}</div>
      ${corpo}`;
  },
  bind(root, ctx) {
    ligarFormularios(root, ctx, true);
    acoes(root, {
      aba: (el) => { vista.aba = el.dataset.id; ctx.refresh(); },
      abrir: (el) => { vista.sel = el.dataset.id; ctx.refresh(); },
    });
  },
};

export const paginaOuvidoriaPublica = {
  caminho: '/ouvidoria-anonima',
  titulo: 'Ouvidoria anônima',
  publica: true,
  semShell: true,
  render() {
    return html`<div class="login-wrap"><div class="login-box">
      <div class="row"><img class="logo" src="assets/img/skills-marca.png" alt="Logo SKILLS" /><div><h1>Ouvidoria anônima</h1><p class="muted">Sem login e sem registro de identidade.</p></div></div>
      <a href="#/login">← Voltar ao login</a>
      <div class="grid grid-2"><div class="card"><h2>Registrar</h2>${formRegistro(false)}</div>
        <div>${vista.resultado ? cartaoResultado(vista.resultado) : ''}<div class="card ${vista.resultado ? 'mt' : ''}"><h2>Acompanhar</h2>${formConsulta()}</div>${resultadoConsulta()}</div></div>
    </div></div>`;
  },
  bind(root, ctx) { ligarFormularios(root, ctx, false); },
};
