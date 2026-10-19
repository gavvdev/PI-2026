import { CONFIG } from '../config.js';
import {
  eachDay, firstOfMonth, lastOfMonth, isDiaUtil, mondayOf, sobrepoe, diasSobrepostos, addDays,
} from '../core/dates.js';
import { horaParaMin } from '../core/format.js';
import { registrarAuditoria } from '../core/audit.js';

export const ROTULOS_STATUS = {
  ok: 'Regular', atraso: 'Atraso', saida_antecipada: 'Saída antecipada', falta: 'Falta',
  falta_abonada: 'Falta abonada', inconsistente: 'Marcação inconsistente', ferias: 'Férias',
  suspensao: 'Suspensão', folga: 'Folga', aguardando: 'Aguardando marcação',
  em_andamento: 'Em andamento', futuro: '', fora_vinculo: '',
};

export function limitesContrato(emp) {
  if (emp.contrato === 'clt') return { extraPermitida: true, jornadaMaxDiaMin: 480 };
  if (emp.contrato === 'aprendiz') {
    return { extraPermitida: false, jornadaMaxDiaMin: emp.ensinoMedioCompleto ? 480 : 360 };
  }
  return { extraPermitida: false, jornadaMaxDiaMin: 360 };
}

export function jornadaPrevistaMin(emp) {
  const h = emp.horario;
  return horaParaMin(h.saida) - horaParaMin(h.entrada) - h.intervaloMin;
}

export function validarJornadaContrato(emp) {
  const { jornadaMaxDiaMin } = limitesContrato(emp);
  const erros = [];
  if (jornadaPrevistaMin(emp) > jornadaMaxDiaMin) {
    erros.push(`Jornada diária acima do limite legal para ${emp.contrato}.`);
  }
  if (emp.contrato === 'estagiario' && emp.horasSemanais > 30) {
    erros.push('Estágio de nível superior ou médio permite no máximo 30h semanais.');
  }
  return erros;
}

export function vinculoAtivo(emp, data) {
  if (data < emp.admissao) return false;
  return !(emp.desligamento && data > emp.desligamento.data);
}

export function marcacoesDoDia(estado, empId, data) {
  return (estado.ponto[`${empId}|${data}`] || []).map((b) => b.hora).sort();
}

export function avaliarDia(emp, data, ctx) {
  const base = {
    data, status: 'ok', atrasoMin: 0, descontavelMin: 0, extraMin: 0, excessoMin: 0, trabalhadoMin: 0, alertas: [],
  };
  if (!vinculoAtivo(emp, data)) return { ...base, status: 'fora_vinculo' };
  if (!isDiaUtil(data)) return { ...base, status: 'folga' };
  if (ctx.ferias.some((f) => ['aprovada', 'gozada'].includes(f.status) && sobrepoe(data, data, f.inicio, f.fim))) {
    return { ...base, status: 'ferias' };
  }
  if (ctx.suspensoes.some((s) => sobrepoe(data, data, s.inicio, s.fim))) return { ...base, status: 'suspensao' };

  const marcas = ctx.marcacoes;
  const esperadas = emp.horario.intervaloMin > 0 ? 4 : 2;
  if (!marcas.length) {
    if (ctx.justificativas.some((j) => j.data === data && j.status === 'aprovada')) return { ...base, status: 'falta_abonada' };
    if (data > ctx.hoje) return { ...base, status: 'futuro' };
    if (data === ctx.hoje) return { ...base, status: 'aguardando' };
    return { ...base, status: 'falta' };
  }
  if (data === ctx.hoje && marcas.length < esperadas) {
    const atrasoEntrada = Math.max(0, horaParaMin(marcas[0]) - horaParaMin(emp.horario.entrada));
    const alertas = atrasoEntrada > CONFIG.toleranciaMarcacaoMin ? [`Entrada com ${atrasoEntrada} min de atraso.`] : [];
    return { ...base, status: 'em_andamento', atrasoMin: atrasoEntrada, alertas };
  }
  if (marcas.length !== esperadas) {
    return { ...base, status: 'inconsistente', alertas: ['Quantidade de marcações diferente da esperada para a jornada.'] };
  }

  const min = marcas.map(horaParaMin);
  const intervaloReal = esperadas === 4 ? min[2] - min[1] : 0;
  const entradaPrev = horaParaMin(emp.horario.entrada);
  const saidaPrev = horaParaMin(emp.horario.saida);
  const atraso = Math.max(0, min[0] - entradaPrev);
  const saidaAntecipada = Math.max(0, saidaPrev - min[min.length - 1]);
  const excesso = Math.max(0, min[min.length - 1] - saidaPrev);
  const tol = CONFIG.toleranciaMarcacaoMin;
  const alertas = [];

  const atrasoDescontavel = atraso > tol ? atraso : 0;
  const saidaDescontavel = saidaAntecipada > tol ? saidaAntecipada : 0;
  let extra = excesso > CONFIG.toleranciaDiariaMin ? excesso : 0;
  const { extraPermitida } = limitesContrato(emp);
  let excessoMin = 0;
  if (extra > 0 && !extraPermitida) {
    alertas.push(`Hora extra não permitida para ${emp.contrato === 'aprendiz' ? 'aprendiz' : 'estagiário'}; ocorrência enviada ao gestor.`);
    excessoMin = extra;
    extra = 0;
  }
  if (extra > CONFIG.limiteHoraExtraDiaMin) alertas.push('Limite de 2h extras por dia excedido.');
  if (emp.contrato === 'clt' && esperadas === 4 && intervaloReal < 60) alertas.push('Intervalo menor que 1h (art. 71 da CLT).');

  let status = 'ok';
  if (atrasoDescontavel) status = 'atraso';
  else if (saidaDescontavel) status = 'saida_antecipada';
  return {
    ...base,
    status,
    atrasoMin: atraso,
    descontavelMin: atrasoDescontavel + saidaDescontavel,
    extraMin: extra,
    excessoMin,
    trabalhadoMin: min[min.length - 1] - min[0] - intervaloReal,
    alertas,
  };
}

function contexto(estado, emp, data) {
  return {
    hoje: CONFIG.dataReferencia,
    marcacoes: marcacoesDoDia(estado, emp.id, data),
    ferias: estado.ferias.filter((f) => f.empId === emp.id),
    justificativas: estado.justificativas.filter((j) => j.empId === emp.id),
    suspensoes: estado.suspensoes.filter((s) => s.empId === emp.id),
  };
}

export function avaliarDiaEstado(estado, emp, data) {
  return avaliarDia(emp, data, contexto(estado, emp, data));
}

export function resumoMes(estado, emp, competencia) {
  const inicio = firstOfMonth(competencia);
  const fim = lastOfMonth(competencia);
  const dias = eachDay(inicio, fim).map((d) => avaliarDiaEstado(estado, emp, d));
  const faltas = dias.filter((d) => d.status === 'falta').map((d) => d.data);
  const semanasComFalta = new Set(faltas.map(mondayOf)).size;
  const feriasDias = estado.ferias
    .filter((f) => f.empId === emp.id && ['aprovada', 'gozada'].includes(f.status))
    .reduce((s, f) => s + diasSobrepostos(f.inicio, f.fim, inicio, fim), 0);
  const suspensaoDias = dias.filter((d) => d.status === 'suspensao').length;
  const vinculoIni = emp.admissao > inicio ? emp.admissao : inicio;
  const vinculoFim = emp.desligamento && emp.desligamento.data < fim ? emp.desligamento.data : fim;
  const diasVinculo = vinculoIni > vinculoFim ? 0 : diasSobrepostos(vinculoIni, vinculoFim, inicio, fim);
  return {
    dias,
    faltas,
    faltasAbonadas: dias.filter((d) => d.status === 'falta_abonada').map((d) => d.data),
    semanasComFalta,
    atrasoMin: dias.reduce((s, d) => s + d.atrasoMin, 0),
    descontavelMin: dias.reduce((s, d) => s + d.descontavelMin, 0),
    extraMin: dias.reduce((s, d) => s + d.extraMin, 0),
    excessoMin: dias.reduce((s, d) => s + d.excessoMin, 0),
    inconsistencias: dias.filter((d) => d.status === 'inconsistente').map((d) => d.data),
    feriasDias,
    suspensaoDias,
    diasVinculo,
    justificativasPendentes: estado.justificativas.filter((j) => j.empId === emp.id && j.status === 'pendente' && j.data >= inicio && j.data <= fim),
    alertas: dias.flatMap((d) => d.alertas.map((a) => ({ data: d.data, texto: a }))),
  };
}

export function registrarMarcacao(estado, { empId, data, hora, origem = 'app' }) {
  const emp = estado.funcionarios.find((f) => f.id === empId);
  if (!emp) return { ok: false, erro: 'Colaborador não encontrado.' };
  if (!/^\d{2}:\d{2}$/.test(hora || '')) return { ok: false, erro: 'Informe um horário válido.' };
  if (!vinculoAtivo(emp, data)) return { ok: false, erro: 'Data fora do vínculo do colaborador.' };
  if (!isDiaUtil(data)) return { ok: false, erro: 'A data informada não é dia útil.' };
  const chave = `${empId}|${data}`;
  const atuais = estado.ponto[chave] || [];
  if (atuais.some((b) => b.hora === hora)) return { ok: false, erro: 'Já existe uma marcação neste horário.' };
  const maximo = emp.horario.intervaloMin > 0 ? 4 : 2;
  if (atuais.length >= maximo) return { ok: false, erro: `Limite de ${maximo} marcações por dia atingido.` };
  estado.ponto[chave] = [...atuais, { hora, origem }].sort((a, b) => a.hora.localeCompare(b.hora));
  return { ok: true, avaliacao: avaliarDiaEstado(estado, emp, data) };
}

export function solicitarJustificativa(estado, { empId, data, motivo, agora }) {
  if (!motivo || motivo.trim().length < 5) return { ok: false, erro: 'Descreva o motivo (mínimo 5 caracteres).' };
  const emp = estado.funcionarios.find((f) => f.id === empId);
  const dia = avaliarDiaEstado(estado, emp, data);
  if (!['falta', 'inconsistente'].includes(dia.status)) return { ok: false, erro: 'Só é possível justificar faltas ou marcações inconsistentes.' };
  if (estado.justificativas.some((j) => j.empId === empId && j.data === data && j.status !== 'rejeitada')) {
    return { ok: false, erro: 'Já existe uma justificativa para este dia.' };
  }
  const id = `j${estado.justificativas.length + 1}`;
  estado.justificativas.push({ id, empId, data, motivo: motivo.trim(), status: 'pendente', criadaEm: agora || CONFIG.dataReferencia });
  return { ok: true, id };
}

export function decidirJustificativa(estado, { id, aprovar, porId }) {
  const j = estado.justificativas.find((x) => x.id === id);
  if (!j || j.status !== 'pendente') return { ok: false, erro: 'Justificativa não está pendente.' };
  j.status = aprovar ? 'aprovada' : 'rejeitada';
  j.decididoPor = porId;
  return { ok: true };
}

export function registrarSuspensao(estado, { empId, inicio, fim, motivo, porId }) {
  const emp = estado.funcionarios.find((f) => f.id === empId);
  if (!emp || emp.contrato === 'estagiario') return { ok: false, erro: 'Suspensão disciplinar não se aplica a estagiários.' };
  if (!inicio || !fim || fim < inicio) return { ok: false, erro: 'Informe um período válido.' };
  if (!motivo || motivo.trim().length < 5) return { ok: false, erro: 'Descreva o motivo da suspensão.' };
  estado.suspensoes.push({ id: `s${estado.suspensoes.length + 1}`, empId, inicio, fim, motivo: motivo.trim(), porId });
  registrarAuditoria(estado, { por: porId, acao: 'folha.suspensao', detalhe: `${empId} ${inicio}→${fim}` });
  return { ok: true };
}

export function ultimosDiasUteis(data, n) {
  const dias = [];
  for (let d = addDays(data, -1); dias.length < n; d = addDays(d, -1)) if (isDiaUtil(d)) dias.push(d);
  return dias;
}
