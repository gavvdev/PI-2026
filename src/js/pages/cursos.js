import { html } from '../core/html.js';
import {
  trilhaDoColaborador, opcionais, saldoPontos, concluirCurso, resgatarRecompensa, enviarFeedbackCurso, rankingPorSetor,
} from '../domain/courses.js';
import {
  badge, tabela, acoes, formularios, opcoes,
} from '../ui.js';

const vista = { aba: 'trilha', nota: 0 };

export const paginaCursos = {
  caminho: '/cursos',
  titulo: 'Mini cursos',
  icone: '🎓',
  perfis: ['rh', 'gestor', 'colaborador'],
  render({ estado, user }) {
    const trilha = trilhaDoColaborador(estado, user.id);
    const concluidos = estado.cursos.progresso[user.id].concluidos.map((id) => estado.cursos.catalogo.find((c) => c.id === id));
    const pontos = saldoPontos(estado, user.id);
    const proxima = estado.cursos.recompensas.find((r) => r.custo > pontos);
    const podeRanking = user.perfil !== 'colaborador';
    const abas = [['trilha', 'Trilha'], ['pontos', 'Pontos e recompensas'], ['curriculo', 'Meu currículo'], ['feedback', 'Feedback'], ...(podeRanking ? [['ranking', 'Ranking']] : [])];
    if (!abas.some(([id]) => id === vista.aba)) vista.aba = 'trilha';
    const feitos = trilha.filter((c) => c.status === 'done').length;

    const paineis = {
      trilha: html`
        <h2>Trilha obrigatória <span class="muted small">${feitos} de ${trilha.length} concluídos</span></h2>
        <ul class="duo-path">${trilha.map((c) => html`<li class="duo-item ${c.status}"><div class="duo-node ${c.status}" aria-hidden="true">${c.status === 'done' ? '✓' : c.status === 'locked' ? '🔒' : c.ordem}</div>
          <div class="lbl">${c.titulo}<span class="sr-only"> (${{ done: 'concluído', current: 'atual', locked: 'bloqueado' }[c.status]})</span></div>
          ${c.status === 'current' ? html`<button class="btn btn-primary btn-sm" data-acao="concluir" data-id="${c.id}">Concluir (+${c.pontos} pts)</button>` : ''}</li>`)}</ul>
        <h2>Cursos opcionais</h2>
        <div class="row-scroll">${opcionais(estado).map((c) => {
          const feito = estado.cursos.progresso[user.id].concluidos.includes(c.id);
          return html`<div class="card opt-card">${badge('Opcional')}<h3 class="mt">${c.titulo}</h3><p class="muted small">${c.desc}</p>
            ${feito ? badge('Concluído', 'ok') : html`<button class="btn btn-ghost btn-sm" data-acao="concluir" data-id="${c.id}">Concluir (+${c.pontos} pts)</button>`}</div>`;
        })}</div>`,
      pontos: html`
        <div class="points-hero"><div><div class="num">${pontos}</div><div>pontos disponíveis</div></div>
          <div>${proxima ? `Faltam ${proxima.custo - pontos} pontos para: ${proxima.titulo}` : 'Você já alcança todas as recompensas.'}</div></div>
        ${tabela(['Recompensa', 'Custo', ''], estado.cursos.recompensas.map((r) => [r.titulo, `${r.custo} pts`,
          html`<button class="btn btn-ghost btn-sm" data-acao="resgatar" data-id="${r.id}" ${pontos < r.custo ? 'disabled' : ''}>Resgatar</button>`]))}`,
      curriculo: html`<h2>Certificados conquistados</h2>${concluidos.length
        ? html`<div class="grid grid-2">${concluidos.map((c) => html`<div class="card row"><span class="badge ok">✓</span><div><strong>${c.titulo}</strong><div class="small muted">Certificado emitido</div></div></div>`)}</div>`
        : html`<p class="muted">Conclua cursos para gerar seu currículo.</p>`}`,
      feedback: concluidos.length ? html`<h2>Avaliar curso</h2>
        <form data-form="feedback">
          <div><label for="fb-curso">Curso concluído</label><select id="fb-curso" name="cursoId">${opcoes(concluidos.map((c) => [c.id, c.titulo]))}</select></div>
          <div><span class="small" style="font-weight:600">Quanto ajudou?</span><div class="stars" role="group" aria-label="Nota">${[1, 2, 3, 4, 5].map((n) => html`<button type="button" data-acao="estrela" data-id="${n}" aria-pressed="${vista.nota >= n}" aria-label="${n} estrela(s)">★</button>`)}</div></div>
          <div><label for="fb-com">Comentário</label><textarea id="fb-com" name="comentario"></textarea></div>
          <button class="btn btn-primary" type="submit">Enviar feedback</button>
        </form>` : html`<p class="muted">Conclua um curso para poder avaliá-lo.</p>`,
      ranking: html`<h2>Ranking ${user.perfil === 'gestor' ? `do setor ${user.setor}` : 'geral'}</h2>${tabela(['Colaborador', 'Setor', 'Cursos', 'Pontos'],
        rankingPorSetor(estado, user.perfil === 'gestor' ? user.setor : null).map((r) => [r.emp.nome, r.emp.setor, r.cursos, r.pontos]))}`,
    };

    return html`
      <div class="topline"><div><h1>Mini cursos de soft skills</h1><p>Aprenda, desenvolva, evolua · ${pontos} pontos</p></div></div>
      <div class="tabs" role="tablist">${abas.map(([id, nome]) => html`<button class="tab" role="tab" aria-selected="${id === vista.aba}" data-acao="aba" data-id="${id}">${nome}</button>`)}</div>
      ${paineis[vista.aba]}`;
  },
  bind(root, ctx) {
    acoes(root, {
      aba: (el) => { vista.aba = el.dataset.id; ctx.refresh(); },
      estrela: (el) => { vista.nota = Number(el.dataset.id); root.querySelectorAll('[data-acao="estrela"]').forEach((b) => b.setAttribute('aria-pressed', String(vista.nota >= Number(b.dataset.id)))); },
      concluir: (el) => {
        const r = ctx.atualizar((e) => concluirCurso(e, { empId: ctx.user.id, cursoId: el.dataset.id }));
        ctx.toast(r.ok ? `Curso concluído! +${r.pontos} pontos.` : r.erro, r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
      resgatar: (el) => {
        const r = ctx.atualizar((e) => resgatarRecompensa(e, { empId: ctx.user.id, recompensaId: el.dataset.id }));
        ctx.toast(r.ok ? 'Recompensa resgatada.' : r.erro, r.ok ? 'ok' : 'danger');
        ctx.refresh();
      },
    });
    formularios(root, {
      feedback: (_f, d) => {
        const r = ctx.atualizar((e) => enviarFeedbackCurso(e, { empId: ctx.user.id, cursoId: d.get('cursoId'), nota: vista.nota, comentario: d.get('comentario') }));
        ctx.toast(r.ok ? 'Obrigada pelo feedback!' : r.erro, r.ok ? 'ok' : 'danger');
        if (r.ok) vista.nota = 0;
        ctx.refresh();
      },
    });
  },
};
