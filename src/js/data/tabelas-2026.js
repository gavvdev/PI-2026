export const TABELAS_2026 = {
  vigencia: '2026',
  salarioMinimo: 1621.0,
  inss: {
    teto: 8475.55,
    faixas: [
      { ate: 1621.0, aliq: 0.075 },
      { ate: 2902.84, aliq: 0.09 },
      { ate: 4354.27, aliq: 0.12 },
      { ate: 8475.55, aliq: 0.14 },
    ],
  },
  irrf: {
    descontoSimplificado: 607.2,
    deducaoDependente: 189.59,
    faixas: [
      { ate: 2428.8, aliq: 0, ded: 0 },
      { ate: 2826.65, aliq: 0.075, ded: 182.16 },
      { ate: 3751.05, aliq: 0.15, ded: 394.16 },
      { ate: 4664.68, aliq: 0.225, ded: 675.49 },
      { ate: Infinity, aliq: 0.275, ded: 908.73 },
    ],
    reducao: { limite1: 5000, limite2: 7350, max: 312.89, a: 978.62, b: 0.133145 },
  },
  fgts: { clt: 0.08, aprendiz: 0.02, estagiario: 0 },
  valeTransporteDesconto: 0.06,
  horaExtraAdicional: 0.5,
};
