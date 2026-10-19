const CHAVE = 'skills-hcm:sessao';
let emMemoria = null;

function disco() {
  try { return sessionStorage; } catch { return null; }
}

export function entrar(empId) {
  emMemoria = empId;
  try { disco()?.setItem(CHAVE, empId); } catch { /* sem armazenamento */ }
}

export function sair() {
  emMemoria = null;
  try { disco()?.removeItem(CHAVE); } catch { /* sem armazenamento */ }
}

export function empIdAtual() {
  if (emMemoria) return emMemoria;
  try { return disco()?.getItem(CHAVE) || null; } catch { return null; }
}

export function usuarioAtual(estado) {
  const id = empIdAtual();
  return estado.funcionarios.find((f) => f.id === id && !f.desligamento) || null;
}
