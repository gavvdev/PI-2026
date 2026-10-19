import { criarSeed } from '../src/js/data/seed.js';

export const novoEstado = () => criarSeed();
export const emp = (estado, id) => estado.funcionarios.find((f) => f.id === id);
export const rngFixo = () => 0.25;
