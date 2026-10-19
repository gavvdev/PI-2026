import { CONFIG } from '../config.js';
import {
  addDays, addMonths, diasInclusivo, diffDays, isDomingo, isFeriado, monthsBetween, sobrepoe, eachDay,
} from '../core/dates.js';
import { registrarAuditoria } from '../core/audit.js';

const STATUS_QUE_CONSOMEM = ['pendente', 'aprovada', 'gozada'];

export function diasPorFaltas(faltas) {
  if (faltas <= 5) return 30;
  if (faltas <= 14) return 24;
  if (faltas <= 23) return 18;
  if (faltas <= 32) return 12;
  return 0;
}

export function periodosCompletos(emp, hoje) {
  return Math.floor(monthsBetween(emp.admissao, hoje) / 12);
}

export function direitoTotalDias(emp, hoje) {
  if (emp.contrato === 'estagiario') return Math.min(30, Math.floor(monthsBetween(emp.admissao, hoje) * 2.5));
  const n = periodosCompletos(emp, hoje);
  if (n < 1) return 0;
  return 30 * (n - 1) + diasPorFaltas(emp.faltasUltimoPeriodo || 0);
}

export function feriasDoColaborador(estado, empId) {
  return estado.ferias.filter((f) => f.empId === empId);
}

export function diasConsumidos(estado, emp) {
  const registrados = feriasDoColaborador(estado, emp.id)
    .filter((f) => STATUS_QUE_CONSOMEM.includes(f.status))
    .reduce((s, f) => s + f.dias, 0);
  return registrados + (emp.feriasHistoricoDias || 0);
}

export function saldoFerias(estado, emp, hoje = CONFIG.dataReferencia) {
  return Math.max(0, direitoTotalDias(emp, hoje) - diasConsumidos(estado, emp));
}

export function fimUltimoPeriodoAquisitivo(emp, hoje) {
  const n = periodosCompletos(emp, hoje);
  return n < 1 ? null : addDays(addMonths(emp.admissao, 12 * n), -1);
}

export function limiteConcessivo(emp, hoje) {
  const fim = fimUltimoPeriodoAquisitivo(emp, hoje);
  return fim ? addMonths(fim, 12) : null;
}

export function proximoDireito(emp, hoje) {
  if (emp.contrato === 'estagiario') return null;
  const n = periodosCompletos(emp, hoje);
  return addMonths(emp.admissao, 12 * (n + 1));
}

function periodosAtivos(estado, emp, hoje) {
  const fim = fimUltimoPeriodoAquisitivo(emp, hoje);
  return feriasDoColaborador(estado, emp.id).filter((f) => ['pendente', 'aprovada', 'gozada'].includes(f.status) && fim && f.inicio > fim);
}

function simultaneidade(estado, emp, inicio, fim) {
  const colegas = estado.funcionarios.filter((f) => f.setor === emp.setor && !f.desligamento);
  const limite = Math.max(1, Math.floor(colegas.length * CONFIG.limiteSimultaneoSetor));
  const outras = estado.ferias.filter((f) => ['pendente', 'aprovada'].includes(f.status) && f.empId !== emp.id
    && colegas.some((c) => c.id === f.empId) && sobrepoe(f.inicio, f.fim, inicio, fim));
  if (!outras.length) return null;
  for (const dia of eachDay(inicio, fim)) {
    const ausentes = outras.filter((f) => sobrepoe(dia, dia, f.inicio, f.fim)).length;
    if (ausentes + 1 > limite) return { limite, dia };
  }
  return null;
}

export function validarSolicitacao(estado, { empId, inicio, fim }, hoje = CONFIG.dataReferencia) {
  const emp = estado.funcionarios.find((f) => f.id === empId);
  const bloqueios = [];
  const avisos = [];
  const bloquear = (codigo, mensagem, excecaoPermitida = false) => bloqueios.push({ codigo, mensagem, excecaoPermitida });

  if (!emp) return { ok: false, bloqueios: [{ codigo: 'colaborador', mensagem: 'Colaborador não encontrado.' }], avisos, dias: 0 };
  if (!inicio || !fim) return { ok: false, bloqueios: [{ codigo: 'datas', mensagem: 'Informe a data de início e de fim.' }], avisos, dias: 0 };
  if (fim < inicio) return { ok: false, bloqueios: [{ codigo: 'datas', mensagem: 'A data final não pode ser anterior à inicial.' }], avisos, dias: 0 };

  const dias = diasInclusivo(inicio, fim);
  const direito = direitoTotalDias(emp, hoje);
  const saldo = saldoFerias(estado, emp, hoje);
  const ehEstagio = emp.contrato === 'estagiario';

  if (diffDays(hoje, inicio) < CONFIG.antecedenciaFeriasDias) {
    bloquear('antecedencia', `A solicitação exige antecedência mínima de ${CONFIG.antecedenciaFeriasDias} dias.`);
  }
  if (direito === 0) {
    bloquear('sem_direito', ehEstagio
      ? 'O recesso proporcional só passa a existir após o primeiro mês completo de estágio.'
      : `Ainda não há período aquisitivo completo. O direito começa em ${proximoDireito(emp, hoje).split('-').reverse().join('/')}.`);
  } else if (dias > saldo) {
    bloquear('saldo', `Saldo insuficiente: você solicitou ${dias} dias e tem ${saldo} disponíveis.`);
  }
  if (emp.fimContrato && fim > emp.fimContrato) {
    bloquear('fim_contrato', `O período ultrapassa o fim do contrato (${emp.fimContrato.split('-').reverse().join('/')}).`);
  }

  if (!ehEstagio) {
    if ([1, 2].some((n) => isDomingo(addDays(inicio, n)) || isFeriado(addDays(inicio, n)))) {
      bloquear('inicio_vedado', 'As férias não podem começar nos 2 dias que antecedem feriado ou dia de descanso semanal (art. 134, §3º da CLT).');
    }
    const ativos = periodosAtivos(estado, emp, hoje);
    const tamanhos = [...ativos.map((f) => f.dias), dias];
    if (dias < 5) bloquear('fracao_minima', 'Cada período fracionado deve ter no mínimo 5 dias corridos.');
    if (tamanhos.length > 3) bloquear('fracoes', 'As férias podem ser divididas em no máximo 3 períodos.');
    if (!tamanhos.some((t) => t >= 14) && saldo - dias < 14 && direito > 0 && dias <= saldo) {
      bloquear('periodo_14', 'Um dos períodos de férias precisa ter pelo menos 14 dias corridos.');
    }
  }

  if (emp.contrato === 'aprendiz' && emp.feriasEscolares?.length) {
    const dentro = emp.feriasEscolares.some((j) => inicio >= j.inicio && fim <= j.fim);
    if (!dentro) bloquear('janela_escolar', 'Para o aprendiz, as férias devem coincidir com as férias escolares (art. 136, §2º da CLT).');
  }
  if (ehEstagio && emp.feriasEscolares?.length) {
    const dentro = emp.feriasEscolares.some((j) => inicio >= j.inicio && fim <= j.fim);
    if (!dentro) bloquear('janela_escolar', 'O recesso deve ser gozado, preferencialmente, durante as férias escolares. Fora desse período é preciso solicitar exceção ao RH.', true);
  }

  const conflito = simultaneidade(estado, emp, inicio, fim);
  if (conflito) {
    bloquear('conflito_escala', `Limite de ${conflito.limite} pessoa(s) do setor ${emp.setor} em férias ao mesmo tempo (conflito em ${conflito.dia.split('-').reverse().join('/')}).`);
  }

  const limite = limiteConcessivo(emp, hoje);
  if (limite && fim > limite && !ehEstagio) avisos.push(`O período termina após o limite concessivo (${limite.split('-').reverse().join('/')}); a empresa pode ter de pagar em dobro.`);
  if (!ehEstagio && dias === saldo && dias < 30 && direito >= 30) avisos.push('Esta solicitação usa todo o saldo restante do período.');

  const precisaExcecao = bloqueios.length > 0 && bloqueios.every((b) => b.excecaoPermitida);
  return { ok: bloqueios.length === 0, precisaExcecao, bloqueios, avisos, dias, saldo };
}

export function solicitarFerias(estado, { empId, inicio, fim, excecao = false, justificativaExcecao = '' }, hoje = CONFIG.dataReferencia) {
  const validacao = validarSolicitacao(estado, { empId, inicio, fim }, hoje);
  if (!validacao.ok && !(validacao.precisaExcecao && excecao)) return { ok: false, validacao };
  if (validacao.precisaExcecao && excecao && justificativaExcecao.trim().length < 10) {
    return { ok: false, validacao: { ...validacao, bloqueios: [...validacao.bloqueios, { codigo: 'justificativa', mensagem: 'Explique o motivo da exceção (mínimo 10 caracteres).' }] } };
  }
  const id = `f${estado.ferias.length + 1}`;
  estado.ferias.push({
    id, empId, inicio, fim, dias: validacao.dias, status: 'pendente', criadaEm: hoje,
    excecao: Boolean(validacao.precisaExcecao && excecao), justificativaExcecao: justificativaExcecao.trim(),
  });
  registrarAuditoria(estado, { por: empId, acao: 'ferias.solicitada', detalhe: `${id} ${inicio}→${fim}` });
  return { ok: true, id, validacao };
}

export function podeDecidir(estado, decisor, solicitacao) {
  const emp = estado.funcionarios.find((f) => f.id === solicitacao.empId);
  if (decisor.id === emp.id) return false;
  if (solicitacao.excecao) return decisor.perfil === 'rh';
  return decisor.perfil === 'rh' || (decisor.perfil === 'gestor' && emp.gestorId === decisor.id);
}

export function decidirFerias(estado, { id, aprovar, decisorId, nota = '' }) {
  const decisor = estado.funcionarios.find((f) => f.id === decisorId);
  const sol = estado.ferias.find((f) => f.id === id);
  if (!sol || sol.status !== 'pendente') return { ok: false, erro: 'A solicitação não está pendente.' };
  if (!podeDecidir(estado, decisor, sol)) return { ok: false, erro: 'Você não tem permissão para decidir esta solicitação.' };
  if (aprovar) {
    const recheck = validarSolicitacao({ ...estado, ferias: estado.ferias.filter((f) => f.id !== id) }, { empId: sol.empId, inicio: sol.inicio, fim: sol.fim });
    const impeditivos = recheck.bloqueios.filter((b) => !(sol.excecao && b.excecaoPermitida) && b.codigo !== 'antecedencia');
    if (impeditivos.length) return { ok: false, erro: impeditivos[0].mensagem };
  }
  sol.status = aprovar ? 'aprovada' : 'rejeitada';
  sol.decididoPor = decisorId;
  sol.nota = nota;
  registrarAuditoria(estado, { por: decisorId, acao: aprovar ? 'ferias.aprovada' : 'ferias.rejeitada', detalhe: id });
  return { ok: true };
}

export function alertasFerias(estado, hoje = CONFIG.dataReferencia, janelaDias = 90) {
  return estado.funcionarios
    .filter((e) => !e.desligamento && e.contrato !== 'estagiario')
    .map((emp) => {
      const saldo = saldoFerias(estado, emp, hoje);
      const limite = limiteConcessivo(emp, hoje);
      if (!saldo || !limite) return null;
      const dias = diffDays(hoje, limite);
      return dias <= janelaDias ? { emp, saldo, limite, diasRestantes: dias, critico: dias <= 30 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
