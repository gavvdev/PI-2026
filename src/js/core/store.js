import { CONFIG } from '../config.js';
import { criarSeed } from '../data/seed.js';

let estado = null;
const ouvintes = new Set();

function armazenamento() {
  try {
    const t = '__skills_teste__';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return null;
  }
}

function persistir() {
  const disco = armazenamento();
  if (!disco) return;
  try { disco.setItem(CONFIG.chaveArmazenamento, JSON.stringify(estado)); } catch { /* cota cheia */ }
}

function carregar() {
  const disco = armazenamento();
  if (!disco) return null;
  try {
    const salvo = JSON.parse(disco.getItem(CONFIG.chaveArmazenamento));
    return salvo && salvo.versao === CONFIG.versaoDados ? salvo : null;
  } catch {
    return null;
  }
}

export function iniciarStore() {
  estado = carregar() || criarSeed();
  return estado;
}

export function getState() {
  if (!estado) iniciarStore();
  return estado;
}

export function atualizar(fn) {
  const proximo = structuredClone(getState());
  const resultado = fn(proximo);
  estado = proximo;
  persistir();
  ouvintes.forEach((o) => o(estado));
  return resultado;
}

export function restaurarDemo() {
  estado = criarSeed();
  persistir();
  ouvintes.forEach((o) => o(estado));
  return estado;
}

export function assinar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
