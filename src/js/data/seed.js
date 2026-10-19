import { CONFIG } from '../config.js';
import { addDays, eachDay, isDiaUtil, sobrepoe } from '../core/dates.js';
import { horaParaMin } from '../core/format.js';

const H_CLT = { entrada: '09:00', saida: '18:00', intervaloMin: 60 };
const H_APRENDIZ_4H = { entrada: '08:00', saida: '12:00', intervaloMin: 0 };
const H_APRENDIZ_6H = { entrada: '08:00', saida: '14:15', intervaloMin: 15 };
const H_ESTAGIO = { entrada: '13:00', saida: '19:00', intervaloMin: 0 };
const JANELA_ESCOLAR = [{ inicio: '2026-12-14', fim: '2027-01-31' }];

const FUNCIONARIOS = [
  { id: 'e01', nome: 'Helena Duarte', perfil: 'rh', contrato: 'clt', cargo: 'Analista de RH Sênior', setor: 'RH', admissao: '2021-05-10', nascimento: '1988-03-14', salario: 7800, horasSemanais: 44, horario: H_CLT, usaVT: false, feriasHistoricoDias: 120 },
  { id: 'e02', nome: 'Marcos Vilela', perfil: 'gestor', contrato: 'clt', cargo: 'Gerente de TI', setor: 'TI', admissao: '2020-02-03', nascimento: '1985-11-02', salario: 12500, horasSemanais: 44, horario: H_CLT, usaVT: false, feriasHistoricoDias: 150 },
  { id: 'e03', nome: 'Patrícia Lemos', perfil: 'gestor', contrato: 'clt', cargo: 'Coordenadora de Operações', setor: 'Operações', admissao: '2019-08-19', nascimento: '1987-06-25', salario: 9200, horasSemanais: 44, horario: H_CLT, usaVT: false, feriasHistoricoDias: 180 },
  { id: 'e04', nome: 'Rafael Souza', perfil: 'colaborador', contrato: 'clt', cargo: 'Desenvolvedor Pleno', setor: 'TI', gestorId: 'e02', admissao: '2023-03-06', nascimento: '1993-10-21', salario: 6200, horasSemanais: 44, horario: H_CLT, usaVT: true, custoVT: 320, dependentes: 1, feriasHistoricoDias: 60 },
  { id: 'e05', nome: 'Camila Barros', perfil: 'colaborador', contrato: 'clt', cargo: 'Analista de QA', setor: 'TI', gestorId: 'e02', admissao: '2024-08-12', nascimento: '1996-10-18', salario: 4800, horasSemanais: 44, horario: H_CLT, usaVT: true, custoVT: 280, feriasHistoricoDias: 30 },
  { id: 'e06', nome: 'Bruno Tavares', perfil: 'colaborador', contrato: 'clt', cargo: 'Assistente de Operações', setor: 'Operações', gestorId: 'e03', admissao: '2024-11-04', nascimento: '1999-02-09', salario: 3200, horasSemanais: 44, horario: H_CLT, usaVT: true, custoVT: 240, faltasUltimoPeriodo: 7, feriasHistoricoDias: 0 },
  { id: 'e07', nome: 'Marina Costa', perfil: 'colaborador', contrato: 'clt', cargo: 'Analista Administrativa', setor: 'Operações', gestorId: 'e03', admissao: '2025-06-02', nascimento: '1997-12-01', salario: 3100, horasSemanais: 44, horario: H_CLT, usaVT: true, custoVT: 200, feriasHistoricoDias: 0 },
  { id: 'e08', nome: 'Larissa Gomes', perfil: 'colaborador', contrato: 'aprendiz', cargo: 'Aprendiz de TI', setor: 'TI', gestorId: 'e02', admissao: '2025-02-03', fimContrato: '2027-02-02', nascimento: '2006-10-20', horasSemanais: 20, horario: H_APRENDIZ_4H, usaVT: true, custoVT: 180, feriasEscolares: JANELA_ESCOLAR, feriasHistoricoDias: 0 },
  { id: 'e09', nome: 'Diego Ferraz', perfil: 'colaborador', contrato: 'aprendiz', cargo: 'Aprendiz Administrativo', setor: 'Operações', gestorId: 'e03', admissao: '2026-03-02', fimContrato: '2028-03-01', nascimento: '2007-05-30', horasSemanais: 30, horario: H_APRENDIZ_6H, usaVT: true, custoVT: 160, ensinoMedioCompleto: true, feriasEscolares: JANELA_ESCOLAR, feriasHistoricoDias: 0 },
  { id: 'e10', nome: 'Thiago Nunes', perfil: 'colaborador', contrato: 'estagiario', cargo: 'Estagiário de TI', setor: 'TI', gestorId: 'e02', admissao: '2026-02-02', fimContrato: '2027-02-01', nascimento: '2002-08-17', bolsa: 1500, auxilioTransporte: 220, horasSemanais: 30, horario: H_ESTAGIO, feriasEscolares: [{ inicio: '2026-12-15', fim: '2027-02-01' }], feriasHistoricoDias: 0 },
  { id: 'e11', nome: 'Beatriz Cardoso', perfil: 'colaborador', contrato: 'estagiario', cargo: 'Estagiária Administrativa', setor: 'Operações', gestorId: 'e03', admissao: '2025-10-01', fimContrato: '2026-12-31', nascimento: '2001-04-12', bolsa: 1400, auxilioTransporte: 200, horasSemanais: 30, horario: H_ESTAGIO, feriasEscolares: [{ inicio: '2026-12-10', fim: '2026-12-31' }], feriasHistoricoDias: 0 },
  { id: 'e12', nome: 'Eduardo Pinheiro', perfil: 'colaborador', contrato: 'clt', cargo: 'Assistente de Operações', setor: 'Operações', gestorId: 'e03', admissao: '2022-01-10', nascimento: '1994-07-07', salario: 3000, horasSemanais: 44, horario: H_CLT, usaVT: true, custoVT: 220, feriasHistoricoDias: 90, desligamento: { data: '2026-07-31', motivo: 'pedido_demissao' } },
  { id: 'e13', nome: 'Juliana Reis', perfil: 'colaborador', contrato: 'clt', cargo: 'Assistente de RH', setor: 'RH', gestorId: 'e01', admissao: '2023-09-04', nascimento: '1995-01-23', salario: 3400, horasSemanais: 44, horario: H_CLT, usaVT: false, feriasHistoricoDias: 30, desligamento: { data: '2026-04-30', motivo: 'sem_justa_causa' } },
  { id: 'e14', nome: 'Renan Alves', perfil: 'colaborador', contrato: 'aprendiz', cargo: 'Aprendiz de TI', setor: 'TI', gestorId: 'e02', admissao: '2024-02-05', nascimento: '2005-09-12', horasSemanais: 20, horario: H_APRENDIZ_4H, usaVT: true, custoVT: 180, feriasHistoricoDias: 30, desligamento: { data: '2026-02-04', motivo: 'termino_contrato' } },
  { id: 'e15', nome: 'Sofia Martins', perfil: 'colaborador', contrato: 'clt', cargo: 'Desenvolvedora Júnior', setor: 'TI', gestorId: 'e02', admissao: '2022-06-13', nascimento: '1998-04-02', salario: 4100, horasSemanais: 44, horario: H_CLT, usaVT: false, feriasHistoricoDias: 90, desligamento: { data: '2025-12-15', motivo: 'pedido_demissao' } },
  { id: 'e16', nome: 'Gustavo Lima', perfil: 'colaborador', contrato: 'estagiario', cargo: 'Estagiário Administrativo', setor: 'Operações', gestorId: 'e03', admissao: '2025-09-01', fimContrato: '2026-09-10', nascimento: '2003-11-19', bolsa: 1400, auxilioTransporte: 200, horasSemanais: 30, horario: H_ESTAGIO, feriasHistoricoDias: 0, desligamento: { data: '2026-09-10', motivo: 'fim_estagio' } },
];

const OCORRENCIAS = {
  e04: { '2026-09-08': { atraso: 25 }, '2026-09-17': { extra: 70 }, '2026-10-05': { atraso: 15 } },
  e05: { '2026-09-03': { atraso: 12 }, '2026-10-06': { falta: true } },
  e06: { '2026-08-12': { falta: true }, '2026-09-02': { falta: true }, '2026-09-03': { falta: true }, '2026-09-21': { falta: true }, '2026-10-07': { falta: true } },
  e07: { '2026-09-10': { atraso: 4 }, '2026-09-25': { atraso: 18 }, '2026-10-13': { inconsistente: true } },
  e08: { '2026-09-15': { atraso: 7 }, '2026-10-08': { extra: 90 } },
  e10: { '2026-09-09': { atraso: 20 }, '2026-10-14': { falta: true } },
  e11: { '2026-09-22': { falta: true } },
};

const FERIAS = [
  { id: 'f1', empId: 'e05', inicio: '2026-09-14', fim: '2026-09-23', dias: 10, status: 'gozada', criadaEm: '2026-07-20', decididoPor: 'e02' },
  { id: 'f2', empId: 'e07', inicio: '2026-12-07', fim: '2026-12-21', dias: 15, status: 'pendente', criadaEm: '2026-10-09' },
];

const JUSTIFICATIVAS = [
  { id: 'j1', empId: 'e06', data: '2026-09-21', motivo: 'Compromisso pessoal com comprovante anexado', status: 'aprovada', decididoPor: 'e03', criadaEm: '2026-09-22' },
  { id: 'j2', empId: 'e10', data: '2026-10-14', motivo: 'Prova na faculdade, declaração da instituição', status: 'pendente', criadaEm: '2026-10-15' },
];

const OUVIDORIA = [
  { id: 'o1', protocolo: 'OUV-2026-0001', chave: null, anonima: false, autorId: 'e07', criadaEm: '2026-10-02', texto: 'O desconto de atraso na folha de setembro parece maior do que o tempo que eu realmente atrasei. Gostaria de uma revisão do cálculo.', categoria: 'Remuneração e folha', prioridade: 'normal', sentimento: 'negativo', confianca: 0.62, status: 'em_analise', historico: [{ quando: '2026-10-02', status: 'recebida', nota: 'Reclamação registrada.' }, { quando: '2026-10-05', status: 'em_analise', nota: 'DP está conferindo as marcações de ponto.', por: 'e01' }] },
  { id: 'o2', protocolo: 'OUV-2026-0002', chave: 'K7M2QX9A', anonima: true, autorId: null, criadaEm: '2026-09-28', texto: 'Tenho presenciado gritos e humilhação pública de um coordenador com a equipe durante reuniões. Muita gente está com medo de falar.', categoria: 'Assédio e discriminação', prioridade: 'critica', sentimento: 'negativo', confianca: 0.71, status: 'em_investigacao', historico: [{ quando: '2026-09-28', status: 'recebida', nota: 'Reclamação registrada.' }, { quando: '2026-09-29', status: 'em_investigacao', nota: 'Caso encaminhado ao comitê de ética.', por: 'e01' }] },
  { id: 'o3', protocolo: 'OUV-2026-0003', chave: 'T4N8WB2D', anonima: true, autorId: null, criadaEm: '2026-10-12', texto: 'O ar-condicionado da sala do segundo andar está quebrado há semanas e o calor atrapalha o trabalho.', categoria: 'Condições de trabalho', prioridade: 'normal', sentimento: 'negativo', confianca: 0.55, status: 'recebida', historico: [{ quando: '2026-10-12', status: 'recebida', nota: 'Reclamação registrada.' }] },
  { id: 'o4', protocolo: 'OUV-2026-0004', chave: null, anonima: false, autorId: 'e05', criadaEm: '2026-09-10', texto: 'O vale-refeição do mês passado foi creditado com atraso de três dias.', categoria: 'Benefícios', prioridade: 'normal', sentimento: 'negativo', confianca: 0.5, status: 'encerrada', historico: [{ quando: '2026-09-10', status: 'recebida', nota: 'Reclamação registrada.' }, { quando: '2026-09-18', status: 'encerrada', nota: 'Operadora confirmou falha no crédito; ajuste feito no contrato.', por: 'e01' }] },
];

const CATALOGO_CURSOS = [
  { id: 'lgpd-basica', titulo: 'LGPD no dia a dia', desc: 'Dados pessoais e boas práticas', pontos: 50 },
  { id: 'comunicacao-assertiva', titulo: 'Comunicação Assertiva', desc: 'Dizer o que precisa, com clareza', pontos: 50 },
  { id: 'gestao-conflitos', titulo: 'Gestão de Conflitos', desc: 'Conversas difíceis sem desgaste', pontos: 50 },
  { id: 'comunicacao-nao-violenta', titulo: 'Comunicação Não-Violenta', desc: 'Pedidos e feedbacks respeitosos', pontos: 50 },
  { id: 'lideranca-agil', titulo: 'Liderança Ágil', desc: 'Times auto-organizados', pontos: 40, opcional: true },
  { id: 'excel-avancado', titulo: 'Excel Avançado', desc: 'Planilhas e relatórios', pontos: 40, opcional: true },
  { id: 'ingles-negocios', titulo: 'Inglês para Negócios', desc: 'Vocabulário corporativo', pontos: 40, opcional: true },
  { id: 'design-thinking', titulo: 'Design Thinking', desc: 'Resolução criativa de problemas', pontos: 40, opcional: true },
];

const TRILHA_OBRIGATORIA = ['lgpd-basica', 'comunicacao-assertiva', 'gestao-conflitos', 'comunicacao-nao-violenta'];

const RECOMPENSAS = [
  { id: 'r1', titulo: 'Ingresso de cinema', custo: 100 },
  { id: 'r2', titulo: 'Vale-compras R$ 100', custo: 200 },
  { id: 'r3', titulo: 'Folga remunerada (1 dia)', custo: 300 },
];

const PROGRESSO_INICIAL = {
  e04: ['lgpd-basica', 'comunicacao-assertiva', 'gestao-conflitos', 'excel-avancado'],
  e05: ['lgpd-basica', 'comunicacao-assertiva'],
  e07: ['lgpd-basica'],
  e08: ['lgpd-basica', 'comunicacao-assertiva'],
  e10: ['lgpd-basica'],
};

function mulberry(semente) {
  let t = semente;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const mm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function gerarBatidas(emp, data, oc, indice) {
  const h = emp.horario;
  const ent = horaParaMin(h.entrada);
  const sai = horaParaMin(h.saida);
  const entrada = oc.atraso ? ent + oc.atraso : ent - (indice % 4);
  const saida = sai + (oc.extra || 0) + (indice % 3);
  let batidas;
  if (h.intervaloMin > 0) {
    const inicioIntervalo = ent + Math.round((sai - ent - h.intervaloMin) / 2);
    batidas = [entrada, inicioIntervalo, inicioIntervalo + h.intervaloMin, saida];
  } else {
    batidas = [entrada, saida];
  }
  if (oc.inconsistente) batidas.pop();
  return batidas.map(mm);
}

function gerarPonto(funcionarios, ferias) {
  const ponto = {};
  const fim = addDays(CONFIG.dataReferencia, -1);
  for (const emp of funcionarios) {
    const ini = emp.admissao > '2026-08-01' ? emp.admissao : '2026-08-01';
    const ate = emp.desligamento && emp.desligamento.data < fim ? emp.desligamento.data : fim;
    if (ini > ate) continue;
    const feriasEmp = ferias.filter((f) => f.empId === emp.id && ['gozada', 'aprovada'].includes(f.status));
    eachDay(ini, ate).forEach((data, i) => {
      if (!isDiaUtil(data)) return;
      if (feriasEmp.some((f) => sobrepoe(data, data, f.inicio, f.fim))) return;
      const oc = OCORRENCIAS[emp.id]?.[data] || {};
      if (oc.falta) return;
      ponto[`${emp.id}|${data}`] = gerarBatidas(emp, data, oc, i).map((hora) => ({ hora, origem: mulberry(i + emp.id.length)() > 0.5 ? 'biometrico' : 'app' }));
    });
  }
  return ponto;
}

export function criarSeed() {
  const funcionarios = structuredClone(FUNCIONARIOS);
  const ferias = structuredClone(FERIAS);
  const progresso = {};
  funcionarios.filter((f) => !f.desligamento).forEach((f) => {
    const concluidos = PROGRESSO_INICIAL[f.id] || [];
    const pontos = concluidos.reduce((s, id) => s + (CATALOGO_CURSOS.find((c) => c.id === id)?.pontos || 0), 0);
    progresso[f.id] = { concluidos: [...concluidos], pontosGastos: 0, pontosTotais: pontos, resgates: [] };
  });
  return {
    versao: CONFIG.versaoDados,
    funcionarios,
    ferias,
    ponto: gerarPonto(funcionarios, ferias),
    justificativas: structuredClone(JUSTIFICATIVAS),
    suspensoes: [],
    fechamentos: { '2026-08': { status: 'fechada', fechadaEm: '2026-09-03', por: 'e01', folha: null } },
    ouvidoria: structuredClone(OUVIDORIA),
    cursos: { catalogo: CATALOGO_CURSOS, trilha: TRILHA_OBRIGATORIA, recompensas: RECOMPENSAS, progresso, feedbacks: [] },
    auditoria: [],
  };
}
