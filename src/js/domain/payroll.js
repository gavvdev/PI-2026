import { TABELAS_2026 } from '../data/tabelas-2026.js';

export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const REGRAS_CONTRATO = {
  clt: {
    titulo: 'CLT (efetivo)',
    pontos: ['INSS progressivo e IRRF na fonte', 'FGTS de 8% (encargo da empresa)', 'Vale-transporte com desconto de até 6%', 'Hora extra com adicional de 50%', 'Férias de 30 dias com 1/3 constitucional'],
  },
  aprendiz: {
    titulo: 'Aprendiz',
    pontos: ['Salário proporcional à jornada (base: salário mínimo/hora)', 'FGTS reduzido de 2% (encargo da empresa)', 'INSS e vale-transporte descontados como empregado', 'Hora extra e compensação de jornada proibidas', 'Férias coincidentes com as férias escolares'],
  },
  estagiario: {
    titulo: 'Estagiário',
    pontos: ['Bolsa-auxílio sem INSS, IRRF, FGTS ou vale-transporte', 'Auxílio-transporte pago pela empresa (não é desconto)', 'Faltas injustificadas reduzem a bolsa proporcionalmente', 'Recesso de 30 dias por ano, proporcional se menor, preferencialmente nas férias escolares', 'Jornada máxima de 6h/dia e 30h/semana'],
  },
};

export function salarioBase(emp, t = TABELAS_2026) {
  if (emp.contrato === 'clt') return emp.salario;
  if (emp.contrato === 'aprendiz') return r2((t.salarioMinimo / 220) * emp.horasSemanais * 5);
  return emp.bolsa;
}

export function calcularINSS(base, t = TABELAS_2026) {
  const limitada = Math.min(base, t.inss.teto);
  let anterior = 0;
  let total = 0;
  for (const faixa of t.inss.faixas) {
    if (limitada > anterior) total += (Math.min(limitada, faixa.ate) - anterior) * faixa.aliq;
    anterior = faixa.ate;
  }
  return r2(total);
}

export function calcularIRRF({ rendimento, inss, dependentes = 0 }, t = TABELAS_2026) {
  const legais = inss + dependentes * t.irrf.deducaoDependente;
  const base = Math.max(0, rendimento - Math.max(legais, t.irrf.descontoSimplificado));
  const faixa = t.irrf.faixas.find((f) => base <= f.ate);
  const imposto = Math.max(0, base * faixa.aliq - faixa.ded);
  const { limite1, limite2, max, a, b } = t.irrf.reducao;
  let reducao = 0;
  if (rendimento <= limite1) reducao = Math.min(imposto, max);
  else if (rendimento <= limite2) reducao = Math.max(0, a - b * rendimento);
  return r2(Math.max(0, imposto - reducao));
}

export function calcularFolha({ emp, competencia, freq, tabelas = TABELAS_2026 }) {
  const t = tabelas;
  const cheio = salarioBase(emp, t);
  const fator = freq.diasVinculo >= 30 || freq.diasVinculo === 0 ? (freq.diasVinculo === 0 ? 0 : 1) : freq.diasVinculo / 30;
  const base = r2(cheio * fator);
  const valorDia = cheio / 30;
  const valorHora = cheio / (emp.horasSemanais * 5);
  const ehEstagio = emp.contrato === 'estagiario';
  const proventos = [];
  const descontos = [];
  const add = (lista, codigo, descricao, valor, ref = '') => {
    const v = r2(valor);
    if (v > 0) lista.push({ codigo, descricao, valor: v, ref });
  };

  add(proventos, ehEstagio ? 'BOLSA' : 'SAL', ehEstagio ? 'Bolsa-auxílio' : 'Salário base', base, fator < 1 ? `${freq.diasVinculo}/30 dias` : '');
  if (!ehEstagio) add(proventos, 'FER13', 'Adicional de 1/3 de férias', (valorDia * freq.feriasDias) / 3, `${freq.feriasDias} dias`);
  if (emp.contrato === 'clt') {
    add(proventos, 'HE50', 'Horas extras 50%', (freq.extraMin / 60) * valorHora * (1 + t.horaExtraAdicional), `${(freq.extraMin / 60).toFixed(1)} h`);
  }

  add(descontos, 'FALTA', 'Faltas injustificadas', freq.faltas.length * valorDia, `${freq.faltas.length} dia(s)`);
  if (!ehEstagio) add(descontos, 'DSR', 'DSR perdido', freq.semanasComFalta * valorDia, `${freq.semanasComFalta} semana(s)`);
  add(descontos, 'ATRASO', 'Atrasos e saídas antecipadas', (freq.descontavelMin / 60) * valorHora, `${freq.descontavelMin} min`);
  add(descontos, 'SUSP', 'Suspensão disciplinar', freq.suspensaoDias * valorDia, `${freq.suspensaoDias} dia(s)`);

  const totalFrequencia = descontos.reduce((s, d) => s + d.valor, 0);
  const totalProventos = proventos.reduce((s, p) => s + p.valor, 0);
  const rendimento = Math.max(0, r2(totalProventos - totalFrequencia));

  let inss = 0;
  let irrf = 0;
  let fgts = 0;
  if (!ehEstagio) {
    inss = calcularINSS(rendimento, t);
    irrf = calcularIRRF({ rendimento, inss, dependentes: emp.dependentes || 0 }, t);
    fgts = r2(rendimento * (emp.contrato === 'aprendiz' ? t.fgts.aprendiz : t.fgts.clt));
    add(descontos, 'INSS', 'INSS', inss);
    add(descontos, 'IRRF', 'IRRF', irrf);
    if (emp.usaVT) add(descontos, 'VT', 'Vale-transporte (6%)', Math.min(cheio * t.valeTransporteDesconto, emp.custoVT || 0));
  } else if (emp.auxilioTransporte) {
    add(proventos, 'AUXT', 'Auxílio-transporte', emp.auxilioTransporte);
  }

  const bruto = r2(proventos.reduce((s, p) => s + p.valor, 0));
  const totalDescontos = r2(descontos.reduce((s, d) => s + d.valor, 0));
  return {
    empId: emp.id,
    competencia,
    contrato: emp.contrato,
    proventos,
    descontos,
    fgts,
    totais: { bruto, descontos: totalDescontos, liquido: Math.max(0, r2(bruto - totalDescontos)) },
  };
}
