import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from './helpers.js';
import {
  trilhaDoColaborador, concluirCurso, resgatarRecompensa, saldoPontos,
} from '../src/js/domain/courses.js';

test('Trilha: primeiro curso pendente é o atual, o restante bloqueado', () => {
  const estado = novoEstado();
  assert.deepEqual(trilhaDoColaborador(estado, 'e05').map((c) => c.status), ['done', 'done', 'current', 'locked']);
});

test('Não é possível pular etapa da trilha; concluir soma pontos; resgate valida saldo', () => {
  const estado = novoEstado();
  assert.equal(concluirCurso(estado, { empId: 'e05', cursoId: 'comunicacao-nao-violenta' }).ok, false);
  assert.ok(concluirCurso(estado, { empId: 'e05', cursoId: 'gestao-conflitos' }).ok);
  assert.equal(saldoPontos(estado, 'e05'), 150);
  assert.equal(resgatarRecompensa(estado, { empId: 'e05', recompensaId: 'r3' }).ok, false);
  assert.ok(resgatarRecompensa(estado, { empId: 'e05', recompensaId: 'r1' }).ok);
  assert.equal(saldoPontos(estado, 'e05'), 50);
});
