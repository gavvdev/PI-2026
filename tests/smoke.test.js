import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado, emp } from './helpers.js';
import { ROTAS } from '../src/js/routes.js';
import { html, raw } from '../src/js/core/html.js';

const USUARIOS = ['e01', 'e02', 'e04', 'e08', 'e10'];

function contexto(estado, user) {
  return { estado, user, hoje: '2026-10-16', atualizar: (fn) => fn(estado), refresh() {}, toast() {}, navegar() {} };
}

test('Todas as telas renderizam para cada perfil e contrato sem erro', () => {
  const estado = novoEstado();
  for (const id of USUARIOS) {
    const user = emp(estado, id);
    for (const rota of ROTAS.filter((r) => r.publica || r.perfis.includes(user.perfil))) {
      const saida = rota.render(contexto(estado, user)).toString();
      assert.ok(saida.length > 200, `${rota.caminho} para ${id}`);
      assert.ok(!/undefined|NaN|\[object Object\]/.test(saida), `${rota.caminho} para ${id} contém valor inválido`);
    }
  }
});

test('Rotas protegidas declaram perfis e o login/ouvidoria pública são acessíveis sem sessão', () => {
  assert.ok(ROTAS.filter((r) => !r.publica).every((r) => Array.isArray(r.perfis) && r.perfis.length));
  assert.deepEqual(ROTAS.filter((r) => r.publica).map((r) => r.caminho).sort(), ['/login', '/ouvidoria-anonima']);
});

test('O gerador de HTML escapa conteúdo digitado pelo usuário', () => {
  const saida = html`<p>${'<img src=x onerror=alert(1)>'}</p>`.toString();
  assert.equal(saida, '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  assert.equal(html`<b>${raw('<i>ok</i>')}</b>`.toString(), '<b><i>ok</i></b>');
});
