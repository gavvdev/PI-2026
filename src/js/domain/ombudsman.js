import { CONFIG } from '../config.js';
import { addDays } from '../core/dates.js';
import { registrarAuditoria } from '../core/audit.js';

export const STATUS_OUVIDORIA = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  em_investigacao: 'Em investigação',
  resolvida: 'Resolvida',
  encerrada: 'Encerrada',
};
export const STATUS_ABERTOS = ['recebida', 'em_analise', 'em_investigacao', 'resolvida'];
export const PRAZO_DIAS = { critica: 2, alta: 5, normal: 10 };

const CATEGORIAS = [
  { nome: 'Assédio e discriminação', prioridade: 'critica', termos: ['assedio', 'humilha', 'grita', 'gritos', 'discrimin', 'preconceito', 'racis', 'machis', 'xinga', 'ameaca', 'persegui', 'constrang', 'intimida'] },
  { nome: 'Segurança e saúde no trabalho', prioridade: 'alta', termos: ['acidente', 'risco', 'perigo', 'insalubre', 'sem epi', 'epi', 'ergonom', 'incendio', 'cadeira quebrada'] },
  { nome: 'Remuneração e folha', prioridade: 'normal', termos: ['salario', 'folha', 'pagamento', 'desconto', 'holerite', 'contracheque', 'hora extra', 'horas extras', 'decimo', '13o', 'fgts', 'bolsa'] },
  { nome: 'Jornada e ponto', prioridade: 'normal', termos: ['ponto', 'jornada', 'escala', 'atraso', 'banco de horas', 'intervalo', 'falta', 'folga'] },
  { nome: 'Férias e licenças', prioridade: 'normal', termos: ['ferias', 'recesso', 'licenca', 'afastamento'] },
  { nome: 'Benefícios', prioridade: 'normal', termos: ['vale', 'refeicao', 'alimentacao', 'transporte', 'plano de saude', 'beneficio', 'auxilio'] },
  { nome: 'Liderança e relacionamento', prioridade: 'alta', termos: ['gestor', 'chefe', 'coordenador', 'lider', 'supervisor', 'colega', 'feedback', 'injusto', 'favoritismo'] },
  { nome: 'Condições de trabalho', prioridade: 'normal', termos: ['ar-condicionado', 'ar condicionado', 'calor', 'frio', 'barulho', 'sala', 'banheiro', 'computador', 'equipamento', 'internet', 'limpeza', 'cadeira'] },
];

const NEGATIVOS = ['nao', 'pessimo', 'ruim', 'medo', 'injusto', 'errado', 'atraso', 'quebrado', 'problema', 'absurdo', 'cansado', 'desrespeito', 'humilha', 'grita', 'abuso', 'demora'];
const POSITIVOS = ['elogi', 'obrigado', 'parabens', 'excelente', 'otimo', 'elogio', 'agradeco', 'sugestao', 'melhoria'];

const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ocorrencias = (texto, termo) => texto.split(termo).length - 1;

export function classificar(texto) {
  const t = normalizar(texto || '');
  const pontuacoes = CATEGORIAS.map((c) => ({ c, pontos: c.termos.reduce((s, termo) => s + ocorrencias(t, termo), 0), achados: c.termos.filter((termo) => t.includes(termo)) }));
  const total = pontuacoes.reduce((s, p) => s + p.pontos, 0);
  const melhor = [...pontuacoes].sort((a, b) => b.pontos - a.pontos)[0];
  const negativos = NEGATIVOS.filter((n) => t.includes(n)).length;
  const positivos = POSITIVOS.filter((p) => t.includes(p)).length;
  const sentimento = negativos > positivos ? 'negativo' : positivos > negativos ? 'positivo' : 'neutro';
  if (!total) return { categoria: 'Outros', prioridade: 'normal', sentimento, confianca: 0.2, termos: [] };
  return {
    categoria: melhor.c.nome,
    prioridade: melhor.c.prioridade,
    sentimento,
    confianca: Math.round(Math.min(0.92, 0.3 + (melhor.pontos / total) * 0.3 + Math.min(melhor.achados.length, 3) * 0.12) * 100) / 100,
    termos: melhor.achados,
  };
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function gerarChave(rng = Math.random) {
  return Array.from({ length: 8 }, () => ALFABETO[Math.floor(rng() * ALFABETO.length)]).join('');
}

export function proximoProtocolo(estado, hoje = CONFIG.dataReferencia) {
  const ano = hoje.slice(0, 4);
  const seq = estado.ouvidoria.length + 1;
  return `OUV-${ano}-${String(seq).padStart(4, '0')}`;
}

export function abrirReclamacao(estado, { texto, anonima, autorId = null, categoriaManual = '' }, { hoje = CONFIG.dataReferencia, rng = Math.random } = {}) {
  const limpo = (texto || '').trim();
  if (limpo.length < 20) return { ok: false, erro: 'Descreva a situação com pelo menos 20 caracteres.' };
  if (!anonima && !autorId) return { ok: false, erro: 'Entre no sistema para registrar uma reclamação identificada.' };
  const ia = classificar(limpo);
  const protocolo = proximoProtocolo(estado, hoje);
  const chave = anonima ? gerarChave(rng) : null;
  const reclamacao = {
    id: `o${estado.ouvidoria.length + 1}`,
    protocolo,
    chave,
    anonima: Boolean(anonima),
    autorId: anonima ? null : autorId,
    criadaEm: hoje,
    texto: limpo,
    categoria: categoriaManual || ia.categoria,
    prioridade: ia.prioridade,
    sentimento: ia.sentimento,
    confianca: ia.confianca,
    status: 'recebida',
    historico: [{ quando: hoje, status: 'recebida', nota: 'Reclamação registrada.' }],
  };
  estado.ouvidoria.push(reclamacao);
  registrarAuditoria(estado, { por: anonima ? 'anonimo' : autorId, acao: 'ouvidoria.aberta', detalhe: protocolo });
  return { ok: true, protocolo, chave, classificacao: ia };
}

export function consultar(estado, protocolo, chave) {
  const r = estado.ouvidoria.find((o) => o.protocolo === (protocolo || '').trim().toUpperCase());
  if (!r) return null;
  if (r.anonima && (chave || '').trim().toUpperCase() !== r.chave) return null;
  if (!r.anonima) return null;
  return r;
}

export function atualizarStatus(estado, { id, status, nota, porId }, hoje = CONFIG.dataReferencia) {
  const r = estado.ouvidoria.find((o) => o.id === id);
  if (!r) return { ok: false, erro: 'Reclamação não encontrada.' };
  if (!STATUS_OUVIDORIA[status]) return { ok: false, erro: 'Status inválido.' };
  if (!nota || nota.trim().length < 5) return { ok: false, erro: 'Registre uma nota para o solicitante.' };
  r.status = status;
  r.historico.push({ quando: hoje, status, nota: nota.trim(), por: porId });
  registrarAuditoria(estado, { por: porId, acao: 'ouvidoria.status', detalhe: `${r.protocolo} → ${status}` });
  return { ok: true };
}

export const prazoFinal = (r) => addDays(r.criadaEm, PRAZO_DIAS[r.prioridade] || 10);
export const estaAberta = (r) => r.status !== 'encerrada';
export const estaAtrasada = (r, hoje = CONFIG.dataReferencia) => estaAberta(r) && r.status !== 'resolvida' && prazoFinal(r) < hoje;

export function resumoPorCategoria(estado) {
  const mapa = {};
  estado.ouvidoria.forEach((r) => { mapa[r.categoria] = (mapa[r.categoria] || 0) + 1; });
  return Object.entries(mapa).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}
