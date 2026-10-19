import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from './helpers.js';
import { gerarFolha, pendenciasFechamento, fecharCompetencia, totaisFolha } from '../src/js/domain/fechamento.js';

test('Fechamento: setembro está pronto; outubro tem pendências; fechar congela a folha', () => {
  const estado = novoEstado();
  assert.deepEqual(pendenciasFechamento(estado, '2026-09'), []);
  const tipos = pendenciasFechamento(estado, '2026-10').map((p) => p.tipo);
  assert.ok(['em_andamento', 'ponto', 'justificativa'].every((t) => tipos.includes(t)));
  assert.equal(fecharCompetencia(estado, '2026-10', 'e01').ok, false);
  assert.ok(fecharCompetencia(estado, '2026-09', 'e01').ok);
  const congelado = estado.fechamentos['2026-09'].folha.length;
  assert.equal(congelado, 12);
  assert.equal(fecharCompetencia(estado, '2026-09', 'e01').ok, false);
  assert.ok(totaisFolha(gerarFolha(estado, '2026-09')).liquido > 0);
});
