import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoEstado, rngFixo } from './helpers.js';
import {
  classificar, abrirReclamacao, consultar, atualizarStatus, estaAtrasada, resumoPorCategoria,
} from '../src/js/domain/ombudsman.js';

test('Classificação: assédio é crítico, folha e condições são normais', () => {
  const a = classificar('Sofro humilhação e gritos do coordenador nas reuniões');
  assert.equal(a.categoria, 'Assédio e discriminação');
  assert.equal(a.prioridade, 'critica');
  assert.equal(classificar('O desconto no holerite veio errado').categoria, 'Remuneração e folha');
  assert.equal(classificar('O ar-condicionado está quebrado e a sala está quente').categoria, 'Condições de trabalho');
  assert.equal(classificar('Preciso de ajuda').categoria, 'Outros');
});

test('Caso de uso: reclamação anônima não guarda autor e gera protocolo + chave', () => {
  const estado = novoEstado();
  const r = abrirReclamacao(estado, { texto: 'Meu gestor grita comigo e me humilha na frente da equipe.', anonima: true, autorId: 'e04' }, { rng: rngFixo });
  assert.ok(r.ok);
  const salva = estado.ouvidoria.find((o) => o.protocolo === r.protocolo);
  assert.equal(salva.autorId, null);
  assert.equal(salva.anonima, true);
  assert.equal(r.chave.length, 8);
  assert.equal(salva.prioridade, 'critica');
  assert.ok(!JSON.stringify(estado.auditoria[0]).includes('e04'));
});

test('Acompanhamento exige protocolo e chave corretos', () => {
  const estado = novoEstado();
  const r = abrirReclamacao(estado, { texto: 'O banheiro do terceiro andar está sem manutenção.', anonima: true }, { rng: rngFixo });
  assert.ok(consultar(estado, r.protocolo, r.chave));
  assert.ok(consultar(estado, r.protocolo.toLowerCase(), r.chave.toLowerCase()));
  assert.equal(consultar(estado, r.protocolo, 'ERRADA12'), null);
  assert.equal(consultar(estado, 'OUV-2026-9999', r.chave), null);
});

test('Reclamação identificada não pode ser consultada pelo canal anônimo', () => {
  const estado = novoEstado();
  assert.equal(consultar(estado, 'OUV-2026-0001', ''), null);
});

test('Validações: texto curto e identificada sem autor são recusadas', () => {
  const estado = novoEstado();
  assert.equal(abrirReclamacao(estado, { texto: 'curto', anonima: true }).ok, false);
  assert.equal(abrirReclamacao(estado, { texto: 'Texto longo o suficiente para registrar.', anonima: false }).ok, false);
});

test('Atualização de status exige nota e registra histórico', () => {
  const estado = novoEstado();
  assert.equal(atualizarStatus(estado, { id: 'o3', status: 'em_analise', nota: '', porId: 'e01' }).ok, false);
  assert.ok(atualizarStatus(estado, { id: 'o3', status: 'em_analise', nota: 'Manutenção acionada.', porId: 'e01' }).ok);
  const o3 = estado.ouvidoria.find((o) => o.id === 'o3');
  assert.equal(o3.status, 'em_analise');
  assert.equal(o3.historico.length, 2);
});

test('Prazo: caso crítico aberto há 18 dias está atrasado; caso normal recente não', () => {
  const estado = novoEstado();
  assert.equal(estaAtrasada(estado.ouvidoria.find((o) => o.id === 'o2')), true);
  assert.equal(estaAtrasada(estado.ouvidoria.find((o) => o.id === 'o3')), false);
  assert.equal(estaAtrasada(estado.ouvidoria.find((o) => o.id === 'o4')), false);
});

test('Resumo por categoria soma todas as reclamações', () => {
  const estado = novoEstado();
  const total = resumoPorCategoria(estado).reduce((s, c) => s + c.total, 0);
  assert.equal(total, estado.ouvidoria.length);
});
