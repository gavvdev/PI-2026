import { CONFIG } from '../config.js';
import { addDays, addMonths, aniversarioNoPeriodo, monthKey, lastOfMonth, firstOfMonth } from '../core/dates.js';
import { estaAberta } from './ombudsman.js';

export const MOTIVOS_DESLIGAMENTO = {
  pedido_demissao: 'Pedido de demissão',
  sem_justa_causa: 'Dispensa sem justa causa',
  justa_causa: 'Dispensa por justa causa',
  termino_contrato: 'Término de contrato de aprendizagem',
  fim_estagio: 'Fim de estágio',
  acordo: 'Acordo (art. 484-A)',
};

export const ativos = (estado) => estado.funcionarios.filter((f) => !f.desligamento);

export function headcountEm(estado, data) {
  return estado.funcionarios.filter((f) => f.admissao <= data && (!f.desligamento || f.desligamento.data > data)).length;
}

export function desligamentosNoPeriodo(estado, inicio, fim) {
  return estado.funcionarios.filter((f) => f.desligamento && f.desligamento.data > inicio && f.desligamento.data <= fim);
}

export function turnover(estado, hoje = CONFIG.dataReferencia, meses = 12) {
  const inicio = addMonths(hoje, -meses);
  const saidas = desligamentosNoPeriodo(estado, inicio, hoje);
  const media = (headcountEm(estado, inicio) + headcountEm(estado, hoje)) / 2;
  return {
    saidas: saidas.length,
    headcountMedio: media,
    taxa: media ? Math.round((saidas.length / media) * 1000) / 10 : 0,
  };
}

export function serieTurnover(estado, hoje = CONFIG.dataReferencia, meses = 6) {
  const serie = [];
  for (let i = meses - 1; i >= 0; i--) {
    const chave = monthKey(addMonths(hoje, -i));
    serie.push({ mes: chave, saidas: desligamentosNoPeriodo(estado, addDays(firstOfMonth(chave), -1), lastOfMonth(chave)).length });
  }
  return serie;
}

export function desligamentosPorMotivo(estado, hoje = CONFIG.dataReferencia, meses = 12) {
  const mapa = {};
  desligamentosNoPeriodo(estado, addMonths(hoje, -meses), hoje).forEach((f) => {
    const nome = MOTIVOS_DESLIGAMENTO[f.desligamento.motivo] || f.desligamento.motivo;
    mapa[nome] = (mapa[nome] || 0) + 1;
  });
  return Object.entries(mapa).map(([motivo, total]) => ({ motivo, total })).sort((a, b) => b.total - a.total);
}

export function aniversariantesDaSemana(estado, hoje = CONFIG.dataReferencia) {
  return ativos(estado)
    .map((f) => ({ f, data: aniversarioNoPeriodo(f.nascimento, hoje, 7) }))
    .filter((x) => x.data)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(({ f, data }) => ({ emp: f, data }));
}

export function composicaoPorContrato(estado) {
  const mapa = { clt: 0, aprendiz: 0, estagiario: 0 };
  ativos(estado).forEach((f) => { mapa[f.contrato] += 1; });
  return mapa;
}

export function indicadoresRH(estado, hoje = CONFIG.dataReferencia) {
  const abertas = estado.ouvidoria.filter(estaAberta);
  return {
    ativos: ativos(estado).length,
    contratos: composicaoPorContrato(estado),
    turnover: turnover(estado, hoje),
    reclamacoesAbertas: abertas.length,
    reclamacoesCriticas: abertas.filter((r) => r.prioridade === 'critica').length,
    feriasPendentes: estado.ferias.filter((f) => f.status === 'pendente').length,
    justificativasPendentes: estado.justificativas.filter((j) => j.status === 'pendente').length,
  };
}

export function registrarDesligamento(estado, { empId, data, motivo, porId }) {
  const emp = estado.funcionarios.find((f) => f.id === empId);
  if (!emp || emp.desligamento) return { ok: false, erro: 'Colaborador não encontrado ou já desligado.' };
  if (!MOTIVOS_DESLIGAMENTO[motivo]) return { ok: false, erro: 'Selecione o motivo do desligamento.' };
  if (!data || data < emp.admissao) return { ok: false, erro: 'A data deve ser posterior à admissão.' };
  if (emp.perfil === 'rh' && ativos(estado).filter((f) => f.perfil === 'rh').length === 1) {
    return { ok: false, erro: 'Não é possível desligar o único usuário de RH.' };
  }
  emp.desligamento = { data, motivo };
  estado.ferias.forEach((f) => { if (f.empId === empId && f.status === 'pendente') f.status = 'rejeitada'; });
  return { ok: true };
}
