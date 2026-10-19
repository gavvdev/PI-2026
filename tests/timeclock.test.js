import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado, emp } from './helpers.js';
import {
  avaliarDia, avaliarDiaEstado, registrarMarcacao, solicitarJustificativa, decidirJustificativa, resumoMes, validarJornadaContrato,
} from '../src/js/domain/timeclock.js';

const ctx = (marcacoes, extra = {}) => ({ hoje: '2026-10-16', marcacoes, ferias: [], justificativas: [], suspensoes: [], ...extra });
const clt = { id: 'x', contrato: 'clt', admissao: '2020-01-01', horario: { entrada: '09:00', saida: '18:00', intervaloMin: 60 } };
const aprendiz = { id: 'a', contrato: 'aprendiz', admissao: '2020-01-01', horario: { entrada: '08:00', saida: '12:00', intervaloMin: 0 } };

test('Atraso dentro da tolerância de 5 minutos não é descontado', () => {
  const dia = avaliarDia(clt, '2026-10-05', ctx(['09:04', '13:00', '14:00', '18:00']));
  assert.equal(dia.descontavelMin, 0);
  assert.equal(dia.status, 'ok');
});

test('Atraso acima da tolerância desconta todos os minutos', () => {
  const dia = avaliarDia(clt, '2026-10-05', ctx(['09:25', '13:00', '14:00', '18:00']));
  assert.equal(dia.status, 'atraso');
  assert.equal(dia.descontavelMin, 25);
});

test('Hora extra de aprendiz é bloqueada e gera alerta', () => {
  const dia = avaliarDia(aprendiz, '2026-10-05', ctx(['08:00', '13:30']));
  assert.equal(dia.extraMin, 0);
  assert.equal(dia.excessoMin, 90);
  assert.match(dia.alertas[0], /não permitida/);
});

test('Hora extra de CLT acima de 2h gera alerta de limite', () => {
  const dia = avaliarDia(clt, '2026-10-05', ctx(['09:00', '13:00', '14:00', '21:00']));
  assert.equal(dia.extraMin, 180);
  assert.ok(dia.alertas.some((a) => /2h extras/.test(a)));
});

test('Marcações ímpares em dia passado ficam inconsistentes', () => {
  assert.equal(avaliarDia(clt, '2026-10-05', ctx(['09:00', '13:00', '14:00'])).status, 'inconsistente');
});

test('Sem marcações: falta no passado, aguardando hoje, abonada se justificada', () => {
  assert.equal(avaliarDia(clt, '2026-10-05', ctx([])).status, 'falta');
  assert.equal(avaliarDia(clt, '2026-10-16', ctx([])).status, 'aguardando');
  const abonada = avaliarDia(clt, '2026-10-05', ctx([], { justificativas: [{ data: '2026-10-05', status: 'aprovada' }] }));
  assert.equal(abonada.status, 'falta_abonada');
});

test('Fim de semana, feriado e férias não geram falta', () => {
  assert.equal(avaliarDia(clt, '2026-10-10', ctx([])).status, 'folga');
  assert.equal(avaliarDia(clt, '2026-10-12', ctx([])).status, 'folga');
  const ferias = [{ status: 'aprovada', inicio: '2026-10-05', fim: '2026-10-09' }];
  assert.equal(avaliarDia(clt, '2026-10-06', ctx([], { ferias })).status, 'ferias');
});

test('Caso de uso: simular atraso batendo a entrada às 09:25 do dia de hoje', () => {
  const estado = novoEstado();
  const r = registrarMarcacao(estado, { empId: 'e04', data: '2026-10-16', hora: '09:25', origem: 'app' });
  assert.ok(r.ok);
  assert.equal(r.avaliacao.status, 'em_andamento');
  assert.equal(r.avaliacao.atrasoMin, 25);
  assert.match(r.avaliacao.alertas[0], /25 min/);
});

test('Marcação duplicada, fora do vínculo e acima do limite são recusadas', () => {
  const estado = novoEstado();
  assert.ok(registrarMarcacao(estado, { empId: 'e08', data: '2026-10-16', hora: '08:00' }).ok);
  assert.equal(registrarMarcacao(estado, { empId: 'e08', data: '2026-10-16', hora: '08:00' }).ok, false);
  assert.ok(registrarMarcacao(estado, { empId: 'e08', data: '2026-10-16', hora: '12:00' }).ok);
  assert.equal(registrarMarcacao(estado, { empId: 'e08', data: '2026-10-16', hora: '12:30' }).ok, false);
  assert.equal(registrarMarcacao(estado, { empId: 'e09', data: '2026-02-02', hora: '08:00' }).ok, false);
  assert.equal(registrarMarcacao(estado, { empId: 'e04', data: '2026-10-17', hora: '09:00' }).ok, false);
});

test('Fluxo de justificativa: solicita, gestor aprova e a falta vira abonada', () => {
  const estado = novoEstado();
  assert.equal(avaliarDiaEstado(estado, emp(estado, 'e05'), '2026-10-06').status, 'falta');
  const r = solicitarJustificativa(estado, { empId: 'e05', data: '2026-10-06', motivo: 'Consulta marcada com antecedência' });
  assert.ok(r.ok);
  assert.equal(solicitarJustificativa(estado, { empId: 'e05', data: '2026-10-06', motivo: 'Outro motivo qualquer' }).ok, false);
  assert.ok(decidirJustificativa(estado, { id: r.id, aprovar: true, porId: 'e02' }).ok);
  assert.equal(avaliarDiaEstado(estado, emp(estado, 'e05'), '2026-10-06').status, 'falta_abonada');
});

test('Não é possível justificar um dia regular', () => {
  const estado = novoEstado();
  assert.equal(solicitarJustificativa(estado, { empId: 'e04', data: '2026-10-06', motivo: 'Motivo qualquer aqui' }).ok, false);
});

test('Resumo mensal de setembro do Bruno: 2 faltas na mesma semana e 1 falta abonada', () => {
  const estado = novoEstado();
  const r = resumoMes(estado, emp(estado, 'e06'), '2026-09');
  assert.deepEqual(r.faltas, ['2026-09-02', '2026-09-03']);
  assert.equal(r.semanasComFalta, 1);
  assert.deepEqual(r.faltasAbonadas, ['2026-09-21']);
});

test('Jornada cadastrada respeita os limites legais de cada contrato', () => {
  const estado = novoEstado();
  estado.funcionarios.filter((f) => !f.desligamento).forEach((f) => assert.deepEqual(validarJornadaContrato(f), [], f.nome));
  assert.equal(validarJornadaContrato({ ...clt, contrato: 'estagiario', horasSemanais: 40 }).length > 0, true);
});
