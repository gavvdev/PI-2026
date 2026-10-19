import { CONFIG } from './config.js';
import { html } from './core/html.js';
import { iniciarStore, getState, atualizar, restaurarDemo } from './core/store.js';
import { usuarioAtual, sair } from './core/session.js';
import { iniciais } from './core/format.js';
import { formatBR } from './core/dates.js';
import { ROTAS } from './routes.js';
import { PERFIL_ROTULO } from './ui.js';

const raiz = document.getElementById('app');
const areaToast = document.getElementById('toasts');

function toast(mensagem, tom = '') {
  const el = document.createElement('div');
  el.className = `toast ${tom}`;
  el.textContent = mensagem;
  areaToast.append(el);
  setTimeout(() => el.remove(), 4500);
}

const caminhoAtual = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];
const navegar = (caminho) => { location.hash = caminho; };

function resolverRota(user) {
  const caminho = caminhoAtual();
  const rota = ROTAS.find((r) => r.caminho === caminho);
  const permitidas = ROTAS.filter((r) => !r.publica && r.perfis.includes(user?.perfil));
  if (rota?.publica) return rota;
  if (!user) return ROTAS.find((r) => r.caminho === '/login');
  if (rota && rota.perfis?.includes(user.perfil)) return rota;
  return permitidas[0] || null;
}

function montarShell(user, rota, conteudo) {
  const menu = ROTAS.filter((r) => !r.publica && r.perfis.includes(user.perfil));
  return html`
    <a class="skip" href="#principal">Pular para o conteúdo</a>
    <div class="shell">
      <aside class="rail">
        <div class="brand"><img src="assets/img/skills-marca.png" alt="" />SKILLS</div>
        <nav aria-label="Principal">
          ${menu.map((r) => html`<a class="nav-item" href="#${r.caminho}" ${r.caminho === rota.caminho ? 'aria-current="page"' : ''}><span class="ico" aria-hidden="true">${r.icone}</span>${r.titulo}</a>`)}
        </nav>
        <div class="user">
          <strong>${user.nome}</strong>${PERFIL_ROTULO[user.perfil]} · ${user.cargo}
          <div class="small">Data de referência: ${formatBR(CONFIG.dataReferencia)}</div>
          <button class="btn btn-ghost btn-sm" data-sair>Sair</button>
          <button class="btn btn-ghost btn-sm" data-resetar>Restaurar dados</button>
        </div>
      </aside>
      <main class="main" id="principal" tabindex="-1">${conteudo}</main>
    </div>`;
}

function renderizar() {
  const estado = getState();
  const user = usuarioAtual(estado);
  const rota = resolverRota(user);
  if (!rota) {
    raiz.innerHTML = '<main class="main"><p>Nenhum módulo disponível para este perfil.</p><a href="#/login">Voltar ao login</a></main>';
    return;
  }
  if (location.hash !== `#${rota.caminho}` && !location.hash.startsWith(`#${rota.caminho}?`)) {
    history.replaceState(null, '', `#${rota.caminho}`);
  }
  const ctx = { estado, user, atualizar, refresh: renderizar, toast, navegar, hoje: CONFIG.dataReferencia };
  const conteudo = rota.render(ctx);
  raiz.innerHTML = rota.semShell ? conteudo.toString() : montarShell(user, rota, conteudo).toString();
  rota.bind?.(rota.semShell ? raiz : raiz.querySelector('#principal'), ctx);
  raiz.querySelector('[data-sair]')?.addEventListener('click', () => { sair(); navegar('/login'); });
  raiz.querySelector('[data-resetar]')?.addEventListener('click', () => { restaurarDemo(); toast('Dados de demonstração restaurados.', 'ok'); renderizar(); });
}

iniciarStore();
window.addEventListener('hashchange', renderizar);
renderizar();
