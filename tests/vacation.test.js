import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado, emp } from './helpers.js';
import {
  validarSolicitacao, solicitarFerias, decidirFerias, saldoFerias, alertasFerias, diasPorFaltas, direitoTotalDias,
} from '../src/js/domain/vacation.js';

const codigos = (v) => v.bloqueios.map((b) => b.codigo);

test('Dias de férias conforme faltas injustificadas (art. 130 da CLT)', () => {
  assert.deepEqual([0, 5, 6, 14, 15, 23, 24, 32, 33].map(diasPorFaltas), [30, 30, 24, 24, 18, 18, 12, 12, 0]);
});

test('Direito de férias: CLT após 12 meses; estagiário proporcional (2,5 dias/mês)', () => {
  const estado = novoEstado();
  assert.equal(direitoTotalDias(emp(estado, 'e09'), '2026-10-16'), 0);
  assert.equal(direitoTotalDias(emp(estado, 'e06'), '2026-10-16'), 24);
  assert.equal(direitoTotalDias(emp(estado, 'e10'), '2026-10-16'), 20);
  assert.equal(direitoTotalDias(emp(estado, 'e11'), '2026-10-16'), 30);
});

test('Caso de uso: estagiário pede recesso fora das férias escolares -> exige exceção', () => {
  const estado = novoEstado();
  const v = validarSolicitacao(estado, { empId: 'e10', inicio: '2026-11-23', fim: '2026-12-02' });
  assert.equal(v.ok, false);
  assert.equal(v.precisaExcecao, true);
  assert.deepEqual(codigos(v), ['janela_escolar']);
  assert.equal(solicitarFerias(estado, { empId: 'e10', inicio: '2026-11-23', fim: '2026-12-02' }).ok, false);
});

test('Exceção do estagiário exige justificativa, fica pendente e só o RH decide', () => {
  const estado = novoEstado();
  const dados = { empId: 'e10', inicio: '2026-11-23', fim: '2026-12-02', excecao: true };
  assert.equal(solicitarFerias(estado, { ...dados, justificativaExcecao: 'curto' }).ok, false);
  const r = solicitarFerias(estado, { ...dados, justificativaExcecao: 'Viagem familiar já agendada' });
  assert.ok(r.ok);
  assert.equal(estado.ferias.find((f) => f.id === r.id).excecao, true);
  assert.equal(decidirFerias(estado, { id: r.id, aprovar: true, decisorId: 'e02' }).ok, false);
  assert.ok(decidirFerias(estado, { id: r.id, aprovar: true, decisorId: 'e01' }).ok);
});

test('Estagiário dentro das férias escolares e do contrato é aceito', () => {
  const estado = novoEstado();
  const v = validarSolicitacao(estado, { empId: 'e10', inicio: '2026-12-21', fim: '2026-12-30' });
  assert.equal(v.ok, true);
  assert.equal(v.dias, 10);
});

test('Recesso do estagiário não pode ultrapassar o fim do contrato', () => {
  const estado = novoEstado();
  const v = validarSolicitacao(estado, { empId: 'e11', inicio: '2026-12-21', fim: '2027-01-15' });
  assert.ok(codigos(v).includes('fim_contrato'));
});

test('Aprendiz: férias fora do período escolar são bloqueadas sem possibilidade de exceção', () => {
  const estado = novoEstado();
  const fora = validarSolicitacao(estado, { empId: 'e08', inicio: '2026-11-23', fim: '2026-12-07' });
  assert.ok(codigos(fora).includes('janela_escolar'));
  assert.equal(fora.precisaExcecao, false);
  assert.equal(validarSolicitacao(estado, { empId: 'e08', inicio: '2026-12-14', fim: '2027-01-12' }).ok, true);
});

test('Aprendiz com menos de 12 meses não tem direito a férias', () => {
  const v = validarSolicitacao(novoEstado(), { empId: 'e09', inicio: '2026-12-14', fim: '2026-12-28' });
  assert.ok(codigos(v).includes('sem_direito'));
});

test('Antecedência mínima de 30 dias', () => {
  const v = validarSolicitacao(novoEstado(), { empId: 'e04', inicio: '2026-11-02', fim: '2026-11-16' });
  assert.ok(codigos(v).includes('antecedencia'));
});

test('Início nos 2 dias antes de descanso semanal ou feriado é vedado (CLT)', () => {
  const estado = novoEstado();
  assert.ok(codigos(validarSolicitacao(estado, { empId: 'e04', inicio: '2026-12-18', fim: '2026-12-31' })).includes('inicio_vedado'));
  assert.ok(codigos(validarSolicitacao(estado, { empId: 'e04', inicio: '2026-12-23', fim: '2027-01-05' })).includes('inicio_vedado'));
  assert.ok(!codigos(validarSolicitacao(estado, { empId: 'e04', inicio: '2026-12-21', fim: '2027-01-03' })).includes('inicio_vedado'));
});

test('Fracionamento: mínimo de 5 dias e um período de pelo menos 14', () => {
  const estado = novoEstado();
  assert.ok(codigos(validarSolicitacao(estado, { empId: 'e04', inicio: '2026-12-01', fim: '2026-12-03' })).includes('fracao_minima'));
  assert.ok(codigos(validarSolicitacao(estado, { empId: 'e05', inicio: '2026-12-01', fim: '2026-12-10' })).includes('periodo_14'));
  assert.equal(validarSolicitacao(estado, { empId: 'e05', inicio: '2026-12-01', fim: '2026-12-14' }).ok, true);
});

test('Saldo insuficiente é bloqueado', () => {
  const v = validarSolicitacao(novoEstado(), { empId: 'e06', inicio: '2026-12-01', fim: '2026-12-30' });
  assert.ok(codigos(v).includes('saldo'));
  assert.equal(v.saldo, 24);
});

test('Conflito de escala: setor de TI comporta 1 pessoa em férias por vez', () => {
  const estado = novoEstado();
  assert.ok(solicitarFerias(estado, { empId: 'e05', inicio: '2026-12-21', fim: '2027-01-03' }).ok);
  const v = validarSolicitacao(estado, { empId: 'e04', inicio: '2026-12-28', fim: '2027-01-10' });
  assert.ok(codigos(v).includes('conflito_escala'));
  assert.equal(validarSolicitacao(estado, { empId: 'e04', inicio: '2027-01-11', fim: '2027-01-24' }).ok, true);
});

test('Gestor só decide férias do próprio time e ninguém decide a própria', () => {
  const estado = novoEstado();
  assert.equal(decidirFerias(estado, { id: 'f2', aprovar: true, decisorId: 'e02' }).ok, false);
  assert.equal(decidirFerias(estado, { id: 'f2', aprovar: true, decisorId: 'e07' }).ok, false);
  assert.ok(decidirFerias(estado, { id: 'f2', aprovar: true, decisorId: 'e03' }).ok);
  assert.equal(estado.ferias.find((f) => f.id === 'f2').status, 'aprovada');
});

test('Saldo desconta solicitações pendentes e rejeitadas devolvem o saldo', () => {
  const estado = novoEstado();
  const marina = emp(estado, 'e07');
  assert.equal(saldoFerias(estado, marina), 15);
  decidirFerias(estado, { id: 'f2', aprovar: false, decisorId: 'e03' });
  assert.equal(saldoFerias(estado, marina), 30);
});

test('Alerta de férias a vencer: Bruno está a 18 dias do limite concessivo', () => {
  const alertas = alertasFerias(novoEstado());
  assert.equal(alertas.length, 1);
  assert.equal(alertas[0].emp.id, 'e06');
  assert.equal(alertas[0].diasRestantes, 18);
  assert.equal(alertas[0].critico, true);
});
