import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado } from './helpers.js';
import {
  turnover, aniversariantesDaSemana, indicadoresRH, registrarDesligamento, headcountEm, desligamentosPorMotivo,
} from '../src/js/domain/metrics.js';
import { aniversarioNoPeriodo } from '../src/js/core/dates.js';

test('Turnover de 12 meses: 5 saídas sobre headcount médio de 12,5 = 40%', () => {
  const t = turnover(novoEstado());
  assert.equal(t.saidas, 5);
  assert.equal(t.headcountMedio, 12.5);
  assert.equal(t.taxa, 40);
});

test('Headcount reflete admissões e desligamentos na data', () => {
  const estado = novoEstado();
  assert.equal(headcountEm(estado, '2026-10-16'), 11);
  assert.equal(headcountEm(estado, '2026-07-01'), 13);
});

test('Desligamentos por motivo somam o total de saídas', () => {
  const estado = novoEstado();
  assert.equal(desligamentosPorMotivo(estado).reduce((s, m) => s + m.total, 0), 5);
});

test('Aniversariantes da semana, em ordem de data', () => {
  const lista = aniversariantesDaSemana(novoEstado());
  assert.deepEqual(lista.map((a) => a.emp.nome), ['Camila Barros', 'Larissa Gomes', 'Rafael Souza']);
});

test('Aniversário de 29/02 cai em 28/02 em ano não bissexto e virada de ano funciona', () => {
  assert.equal(aniversarioNoPeriodo('2000-02-29', '2027-02-26', 7), '2027-02-28');
  assert.equal(aniversarioNoPeriodo('1990-01-02', '2026-12-30', 7), '2027-01-02');
});

test('Indicadores do RH batem com os dados de demonstração', () => {
  const i = indicadoresRH(novoEstado());
  assert.deepEqual(i.contratos, { clt: 7, aprendiz: 2, estagiario: 2 });
  assert.equal(i.reclamacoesAbertas, 3);
  assert.equal(i.reclamacoesCriticas, 1);
  assert.equal(i.feriasPendentes, 1);
  assert.equal(i.justificativasPendentes, 1);
});

test('Desligar colaborador rejeita férias pendentes e impede desligar o único RH', () => {
  const estado = novoEstado();
  assert.ok(registrarDesligamento(estado, { empId: 'e07', data: '2026-10-16', motivo: 'pedido_demissao', porId: 'e01' }).ok);
  assert.equal(estado.ferias.find((f) => f.id === 'f2').status, 'rejeitada');
  assert.equal(registrarDesligamento(estado, { empId: 'e01', data: '2026-10-16', motivo: 'acordo', porId: 'e01' }).ok, false);
  assert.equal(registrarDesligamento(estado, { empId: 'e04', data: '2026-10-16', motivo: '', porId: 'e01' }).ok, false);
});
