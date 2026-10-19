export function registrarAuditoria(estado, { por, acao, detalhe = '' }, agora = new Date().toISOString()) {
  estado.auditoria.unshift({ quando: agora, por, acao, detalhe });
  estado.auditoria = estado.auditoria.slice(0, 200);
}
