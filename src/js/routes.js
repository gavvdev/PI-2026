import { paginaLogin } from './pages/login.js';
import { paginaDashboard } from './pages/dashboard.js';
import { paginaPonto } from './pages/ponto.js';
import { paginaFerias } from './pages/ferias.js';
import { paginaFolha } from './pages/folha.js';
import { paginaOuvidoria, paginaOuvidoriaPublica } from './pages/ouvidoria.js';
import { paginaDesligamentos } from './pages/desligamentos.js';
import { paginaCursos } from './pages/cursos.js';

export const ROTAS = [
  paginaLogin,
  paginaOuvidoriaPublica,
  paginaDashboard,
  paginaPonto,
  paginaFerias,
  paginaFolha,
  paginaOuvidoria,
  paginaDesligamentos,
  paginaCursos,
];
