import { paginaLogin } from './pages/login.js'; //@nucleo
import { paginaPonto } from './pages/ponto.js'; //@ponto
import { paginaFerias } from './pages/ferias.js'; //@ferias
import { paginaFolha } from './pages/folha.js'; //@folha
import { paginaOuvidoria, paginaOuvidoriaPublica } from './pages/ouvidoria.js'; //@ouvidoria
import { paginaDesligamentos } from './pages/desligamentos.js'; //@desligamentos
import { paginaCursos } from './pages/cursos.js'; //@cursos

export const ROTAS = [
  paginaLogin, //@nucleo
  paginaOuvidoriaPublica, //@ouvidoria
  paginaPonto, //@ponto
  paginaFerias, //@ferias
  paginaFolha, //@folha
  paginaOuvidoria, //@ouvidoria
  paginaDesligamentos, //@desligamentos
  paginaCursos, //@cursos
];
