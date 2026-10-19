# SKILLS Core HCM

Protótipo navegável de um sistema unificado de **Gestão de RH e DP** que centraliza o ciclo de vida do colaborador: dados operacionais (ponto, faltas, férias), financeiros (folha) e estratégicos (clima, ouvidoria, desligamentos). Projeto Integrador (PI).

## O que o protótipo faz

| Módulo | O que demonstra |
| --- | --- |
| Login por perfil | RH/Diretoria, Gestor e Colaborador, com usuários fictícios de cada tipo de contrato |
| Início (dashboard) | Visão por perfil: turnover, reclamações abertas, aniversariantes da semana, alertas |
| Jornada e ponto | Marcação por biometria/app, tolerância, atraso, hora extra, espelho mensal, justificativas |
| Férias e alertas | Validação automática por regras legais e do contrato, exceção ao RH, alertas de vencimento |
| Folha de pagamento | Cálculo por contrato (CLT, aprendiz, estagiário), painel de fechamento mensal, holerite |
| Ouvidoria | Reclamação anônima ou identificada, classificação automática, protocolo, acompanhamento |
| Desligamentos | Turnover, motivos, tempo de casa, registro de saída |
| Mini cursos | Trilha de soft skills, pontos, recompensas, currículo, feedback e ranking |

## Como executar

Os módulos ES exigem um servidor HTTP (não abre por duplo clique):

```bash
npm start            # servidor em http://localhost:5173
npm test             # testes de regras de negócio e telas (Node 20+)
npm install && npm run test:e2e   # fluxos completos em jsdom
```

Sem Node/Python: use a extensão "Live Server" do VS Code ou publique a pasta no GitHub Pages.

## Estrutura de pastas

```
index.html              ponto de entrada
assets/img/             marca e imagens
src/css/                tokens, base, layout e componentes
src/js/
  config.js             data de referência e parâmetros da empresa
  main.js, routes.js    shell, roteador por hash e controle de acesso por perfil
  ui.js                 componentes de interface reutilizáveis
  core/                 datas, formatação, HTML seguro, store, sessão, auditoria
  data/                 tabelas legais 2026 e dados de demonstração
  domain/               regras de negócio puras (ponto, férias, folha, ouvidoria, métricas)
  pages/                uma tela por módulo
tests/                  testes unitários, de telas e e2e
docs/                   arquitetura, regras de negócio, plano e relatório de testes
```

A regra central é a separação: **`domain/` não conhece o navegador**, por isso é testado direto no Node e pode virar API no futuro.

## Dados e privacidade

Todos os dados são fictícios e ficam no `localStorage` do navegador. O botão "Restaurar dados" recria o cenário de demonstração. A data de referência do protótipo é 16/10/2026 (`src/js/config.js`).

## Documentação

- [Arquitetura](docs/ARQUITETURA.md)
- [Regras de negócio](docs/REGRAS-DE-NEGOCIO.md)
- [Plano e relatório de testes](docs/TESTES.md)
- [Como contribuir (Git)](docs/CONTRIBUINDO.md)
