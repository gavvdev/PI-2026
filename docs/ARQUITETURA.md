# Arquitetura

## Camadas

1. **Apresentação** (`src/js/pages`, `ui.js`, `main.js`): cada tela exporta `{ caminho, titulo, perfis, render(ctx), bind(root, ctx) }`. `render` devolve HTML como texto; `bind` liga os eventos.
2. **Domínio** (`src/js/domain`): funções puras que recebem o estado e devolvem resultado. Não usam `document` nem `window`.
3. **Núcleo** (`src/js/core`): datas (UTC ao meio-dia para evitar erro de fuso), formatação, `html` com escape automático, store com `localStorage`, sessão e auditoria.
4. **Dados** (`src/js/data`): tabelas legais de 2026 e o `criarSeed()` determinístico.

## Decisões

- **Sem build**: HTML, CSS e módulos ES nativos. Qualquer pessoa da equipe roda com um servidor estático.
- **Escape por padrão**: o template `html` escapa toda interpolação; só `raw()` insere HTML. Texto digitado (ex.: ouvidoria) não executa script.
- **Controle de acesso por rota**: cada rota declara os `perfis` permitidos e o menu é gerado a partir disso. É só interface: a segurança real exigirá back-end.
- **Estado imutável por ação**: `atualizar(fn)` clona o estado, aplica a mudança e persiste.
- **Auditoria**: ações sensíveis (férias, folha, ouvidoria, desligamento) registram quem, quando e o quê. Na ouvidoria anônima o autor é gravado como `anonimo`.
- **Parâmetros legais separados do código**: `data/tabelas-2026.js` pode ser trocado a cada ano sem tocar nas regras.

## Evolução sugerida

Trocar `store.js` por chamadas a uma API, mover `domain/` para o servidor e substituir o classificador por léxico (`ombudsman.classificar`) por um modelo de linguagem mantendo a mesma assinatura de retorno.
