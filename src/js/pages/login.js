import { html } from '../core/html.js';
import { entrar } from '../core/session.js';
import { PERFIL_ROTULO, CONTRATO_ROTULO, formularios } from '../ui.js';

const DESCRICAO = {
  rh: 'Dashboard completo, folha, desligamentos e ouvidoria.',
  gestor: 'Equipe, aprovações de férias e justificativas.',
  colaborador: 'Ponto, férias, holerite e mini cursos.',
};

const elegiveis = (estado, perfil) => estado.funcionarios.filter((f) => !f.desligamento && f.perfil === perfil);

export const paginaLogin = {
  caminho: '/login',
  titulo: 'Entrar',
  publica: true,
  semShell: true,
  render({ estado }) {
    const inicial = elegiveis(estado, 'rh');
    return html`
      <div class="login-wrap"><div class="login-box">
        <div class="row"><img class="logo" src="assets/img/skills-marca.png" alt="Logo SKILLS" />
          <div><h1>SKILLS Core HCM</h1><p class="muted">Gestão unificada de RH e DP · protótipo navegável</p></div></div>
        <div class="alert info">Protótipo para demonstração: não há senha. Escolha um perfil e um usuário fictício para testar as regras de cada tipo de contrato.</div>
        <form data-form="login" style="max-width:none">
          <fieldset style="border:0;padding:0;margin:0">
            <legend class="sr-only">Perfil de acesso</legend>
            <div class="perfil-cards">
              ${Object.entries(PERFIL_ROTULO).map(([perfil, nome]) => html`
                <label class="perfil-card"><input type="radio" name="perfil" value="${perfil}" ${perfil === 'rh' ? 'checked' : ''} />
                  <strong>${nome}</strong><span class="small muted">${DESCRICAO[perfil]}</span></label>`)}
            </div>
          </fieldset>
          <div><label for="usuario">Usuário de demonstração</label>
            <select id="usuario" name="usuario">${inicial.map((f) => html`<option value="${f.id}">${f.nome} · ${f.cargo}</option>`)}</select></div>
          <div class="row"><button class="btn btn-primary" type="submit">Entrar</button>
            <a class="btn btn-ghost" href="#/ouvidoria-anonima">Canal de ouvidoria anônimo (sem login)</a></div>
        </form>
      </div></div>`;
  },
  bind(root, ctx) {
    const select = root.querySelector('#usuario');
    root.querySelectorAll('input[name="perfil"]').forEach((radio) => radio.addEventListener('change', () => {
      const lista = elegiveis(ctx.estado, radio.value);
      select.innerHTML = '';
      lista.forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.nome} · ${f.cargo} (${CONTRATO_ROTULO[f.contrato]})`;
        select.append(opt);
      });
    }));
    formularios(root, {
      login: (_f, dados) => {
        entrar(dados.get('usuario'));
        ctx.navegar('/');
        ctx.refresh();
      },
    });
  },
};
