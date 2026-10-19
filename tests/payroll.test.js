import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularINSS, calcularIRRF, calcularFolha, salarioBase } from '../src/js/domain/payroll.js';

const freqVazia = { faltas: [], semanasComFalta: 0, descontavelMin: 0, extraMin: 0, feriasDias: 0, suspensaoDias: 0, diasVinculo: 30 };
const clt = (salario, extra = {}) => ({ id: 'x', contrato: 'clt', salario, horasSemanais: 44, ...extra });

test('INSS progressivo: salário de R$ 6.000 contribui R$ 641,51', () => {
  assert.equal(calcularINSS(6000), 641.51);
});

test('INSS respeita o teto de R$ 8.475,55 (contribuição máxima R$ 988,09)', () => {
  assert.equal(calcularINSS(20000), 988.09);
});

test('IRRF 2026: isento até R$ 5.000 e com redução parcial até R$ 7.350', () => {
  assert.equal(calcularIRRF({ rendimento: 4000, inss: calcularINSS(4000) }), 0);
  assert.equal(calcularIRRF({ rendimento: 5000, inss: calcularINSS(5000) }), 0);
  assert.equal(calcularIRRF({ rendimento: 6000, inss: 641.51 }), 385.1);
});

test('IRRF 2026: acima de R$ 7.350 não há redução', () => {
  assert.equal(calcularIRRF({ rendimento: 10000, inss: 988.09 }), 1569.55);
});

test('CLT: desconta INSS e vale-transporte limitado a 6% do salário', () => {
  const folha = calcularFolha({ emp: clt(4000, { usaVT: true, custoVT: 300 }), competencia: '2026-09', freq: freqVazia });
  const d = Object.fromEntries(folha.descontos.map((x) => [x.codigo, x.valor]));
  assert.equal(d.INSS, 368.6);
  assert.equal(d.VT, 240);
  assert.equal(d.IRRF, undefined);
  assert.equal(folha.fgts, 320);
});

test('CLT: vale-transporte nunca passa do custo real', () => {
  const folha = calcularFolha({ emp: clt(4000, { usaVT: true, custoVT: 100 }), competencia: '2026-09', freq: freqVazia });
  assert.equal(folha.descontos.find((d) => d.codigo === 'VT').valor, 100);
});

test('Aprendiz: salário proporcional ao salário mínimo-hora e FGTS de 2%', () => {
  const aprendiz = { id: 'a', contrato: 'aprendiz', horasSemanais: 20 };
  assert.equal(salarioBase(aprendiz), 736.82);
  const folha = calcularFolha({ emp: aprendiz, competencia: '2026-09', freq: freqVazia });
  assert.equal(folha.fgts, 14.74);
  const mesmaBaseClt = calcularFolha({ emp: clt(736.82), competencia: '2026-09', freq: freqVazia });
  assert.equal(mesmaBaseClt.fgts, 58.95);
});

test('Estagiário: bolsa sem INSS, IRRF, FGTS ou vale-transporte; auxílio-transporte é provento', () => {
  const est = { id: 's', contrato: 'estagiario', bolsa: 1500, auxilioTransporte: 220, horasSemanais: 30, usaVT: true, custoVT: 500 };
  const folha = calcularFolha({ emp: est, competencia: '2026-09', freq: freqVazia });
  assert.equal(folha.descontos.length, 0);
  assert.equal(folha.fgts, 0);
  assert.equal(folha.totais.liquido, 1720);
});

test('Estagiário: falta injustificada reduz a bolsa em 1/30', () => {
  const est = { id: 's', contrato: 'estagiario', bolsa: 1500, horasSemanais: 30 };
  const folha = calcularFolha({ emp: est, competencia: '2026-09', freq: { ...freqVazia, faltas: ['2026-09-02'], semanasComFalta: 1 } });
  assert.equal(folha.totais.liquido, 1450);
  assert.ok(!folha.descontos.some((d) => d.codigo === 'DSR'));
});

test('DSR: duas faltas na mesma semana perdem 1 DSR; em semanas distintas perdem 2', () => {
  const base = { emp: clt(3000), competencia: '2026-09' };
  const mesma = calcularFolha({ ...base, freq: { ...freqVazia, faltas: ['2026-09-02', '2026-09-03'], semanasComFalta: 1 } });
  const distintas = calcularFolha({ ...base, freq: { ...freqVazia, faltas: ['2026-09-02', '2026-09-10'], semanasComFalta: 2 } });
  assert.equal(mesma.descontos.find((d) => d.codigo === 'DSR').valor, 100);
  assert.equal(distintas.descontos.find((d) => d.codigo === 'DSR').valor, 200);
});

test('Férias: soma 1/3 constitucional sobre os dias gozados no mês', () => {
  const folha = calcularFolha({ emp: clt(3000), competencia: '2026-09', freq: { ...freqVazia, feriasDias: 30 } });
  assert.equal(folha.proventos.find((p) => p.codigo === 'FER13').valor, 1000);
});

test('Hora extra paga com 50% para CLT e nunca para aprendiz', () => {
  const freq = { ...freqVazia, extraMin: 120 };
  const folhaClt = calcularFolha({ emp: clt(2200), competencia: '2026-09', freq });
  assert.equal(folhaClt.proventos.find((p) => p.codigo === 'HE50').valor, 30);
  const folhaAp = calcularFolha({ emp: { id: 'a', contrato: 'aprendiz', horasSemanais: 20 }, competencia: '2026-09', freq });
  assert.ok(!folhaAp.proventos.some((p) => p.codigo === 'HE50'));
});

test('Admissão no meio do mês gera salário proporcional', () => {
  const folha = calcularFolha({ emp: clt(3000), competencia: '2026-09', freq: { ...freqVazia, diasVinculo: 15 } });
  assert.equal(folha.proventos[0].valor, 1500);
});
