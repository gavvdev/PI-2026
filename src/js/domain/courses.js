export function trilhaDoColaborador(estado, empId) {
  const prog = estado.cursos.progresso[empId];
  const concluidos = new Set(prog?.concluidos || []);
  let atualMarcado = false;
  return estado.cursos.trilha.map((id, i) => {
    const curso = estado.cursos.catalogo.find((c) => c.id === id);
    let status = 'locked';
    if (concluidos.has(id)) status = 'done';
    else if (!atualMarcado) { status = 'current'; atualMarcado = true; }
    return { ...curso, ordem: i + 1, status };
  });
}

export const opcionais = (estado) => estado.cursos.catalogo.filter((c) => c.opcional);
export const saldoPontos = (estado, empId) => {
  const p = estado.cursos.progresso[empId];
  return p ? p.pontosTotais - p.pontosGastos : 0;
};

export function concluirCurso(estado, { empId, cursoId }) {
  const prog = estado.cursos.progresso[empId];
  const curso = estado.cursos.catalogo.find((c) => c.id === cursoId);
  if (!prog || !curso) return { ok: false, erro: 'Curso ou colaborador não encontrado.' };
  if (prog.concluidos.includes(cursoId)) return { ok: false, erro: 'Curso já concluído.' };
  if (!curso.opcional) {
    const atual = trilhaDoColaborador(estado, empId).find((c) => c.status === 'current');
    if (!atual || atual.id !== cursoId) return { ok: false, erro: 'Conclua os cursos anteriores da trilha primeiro.' };
  }
  prog.concluidos.push(cursoId);
  prog.pontosTotais += curso.pontos;
  return { ok: true, pontos: curso.pontos };
}

export function resgatarRecompensa(estado, { empId, recompensaId }) {
  const prog = estado.cursos.progresso[empId];
  const r = estado.cursos.recompensas.find((x) => x.id === recompensaId);
  if (!prog || !r) return { ok: false, erro: 'Recompensa não encontrada.' };
  if (saldoPontos(estado, empId) < r.custo) return { ok: false, erro: 'Pontos insuficientes.' };
  prog.pontosGastos += r.custo;
  prog.resgates.push({ recompensaId, titulo: r.titulo });
  return { ok: true };
}

export function enviarFeedbackCurso(estado, { empId, cursoId, nota, comentario }) {
  if (!nota || nota < 1 || nota > 5) return { ok: false, erro: 'Escolha de 1 a 5 estrelas.' };
  estado.cursos.feedbacks.push({ empId, cursoId, nota: Number(nota), comentario: (comentario || '').trim() });
  return { ok: true };
}

export function rankingPorSetor(estado, setor = null) {
  return estado.funcionarios
    .filter((f) => !f.desligamento && estado.cursos.progresso[f.id] && (!setor || f.setor === setor))
    .map((f) => ({ emp: f, cursos: estado.cursos.progresso[f.id].concluidos.length, pontos: estado.cursos.progresso[f.id].pontosTotais }))
    .sort((a, b) => b.pontos - a.pontos);
}
