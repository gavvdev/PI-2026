import { CONFIG } from '../config.js';
import { monthKey, firstOfMonth, lastOfMonth, sobrepoe } from '../core/dates.js';
import { calcularFolha } from './payroll.js';
import { resumoMes } from './timeclock.js';
import { registrarAuditoria } from '../core/audit.js';

export function funcionariosDaCompetencia(estado, competencia) {
  const ini = firstOfMonth(competencia);
  const fim = lastOfMonth(competencia);
  return estado.funcionarios.filter((f) => f.admissao <= fim && (!f.desligamento || f.desligamento.data >= ini));
}

export function folhaDoColaborador(estado, emp, competencia) {
  const freq = resumoMes(estado, emp, competencia);
  return { freq, folha: calcularFolha({ emp, competencia, freq }) };
}

export function gerarFolha(estado, competencia) {
  return funcionariosDaCompetencia(estado, competencia).map((emp) => ({ emp, ...folhaDoColaborador(estado, emp, competencia) }));
}

export function pendenciasFechamento(estado, competencia, linhas = gerarFolha(estado, competencia)) {
  const pendencias = [];
  if (estado.fechamentos[competencia]?.status === 'fechada') return [{ tipo: 'fechada', texto: 'Competência já fechada.' }];
  if (competencia >= monthKey(CONFIG.dataReferencia)) {
    pendencias.push({ tipo: 'em_andamento', texto: 'A competência ainda está em andamento.' });
  }
  for (const { emp, freq } of linhas) {
    freq.inconsistencias.forEach((d) => pendencias.push({ tipo: 'ponto', empId: emp.id, texto: `${emp.nome}: marcação inconsistente em ${d.split('-').reverse().join('/')}.` }));
    freq.justificativasPendentes.forEach((j) => pendencias.push({ tipo: 'justificativa', empId: emp.id, texto: `${emp.nome}: justificativa pendente de ${j.data.split('-').reverse().join('/')}.` }));
  }
  const ini = firstOfMonth(competencia);
  const fim = lastOfMonth(competencia);
  estado.ferias
    .filter((f) => f.status === 'pendente' && sobrepoe(f.inicio, f.fim, ini, fim))
    .forEach((f) => pendencias.push({ tipo: 'ferias', empId: f.empId, texto: `Solicitação de férias pendente de aprovação (${estado.funcionarios.find((e) => e.id === f.empId).nome}).` }));
  return pendencias;
}

export function fecharCompetencia(estado, competencia, porId) {
  const linhas = gerarFolha(estado, competencia);
  const pendencias = pendenciasFechamento(estado, competencia, linhas);
  if (pendencias.length) return { ok: false, pendencias };
  estado.fechamentos[competencia] = {
    status: 'fechada',
    fechadaEm: CONFIG.dataReferencia,
    por: porId,
    folha: linhas.map(({ folha }) => folha),
  };
  registrarAuditoria(estado, { por: porId, acao: 'folha.fechada', detalhe: competencia });
  return { ok: true };
}

export function totaisFolha(linhas) {
  return linhas.reduce(
    (t, { folha }) => ({
      bruto: t.bruto + folha.totais.bruto,
      descontos: t.descontos + folha.totais.descontos,
      liquido: t.liquido + folha.totais.liquido,
      fgts: t.fgts + folha.fgts,
    }),
    { bruto: 0, descontos: 0, liquido: 0, fgts: 0 },
  );
}
