# Como contribuir

## Fluxo de branches

- `main`: versões estáveis, marcadas com tag (`v0.2.0`).
- `develop`: integração. Todo trabalho entra aqui por merge com `--no-ff`.
- `feature/<nome>`, `chore/<nome>`, `docs/<nome>`, `test/<nome>`: uma branch por assunto, criada a partir de `develop`.

```bash
git checkout develop && git pull
git checkout -b feature/nome-curto
# trabalhe, rode npm test
git commit -m "feat(escopo): descrição no imperativo"
git checkout develop && git merge --no-ff feature/nome-curto
```

## Mensagens de commit (Conventional Commits)

`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`. Escopo opcional, por exemplo `feat(ferias): bloqueia início antes de feriado`.

## Antes de abrir o merge

1. `npm test` passando.
2. Regra de negócio nova tem teste em `tests/`.
3. Regra legal nova está descrita em `docs/REGRAS-DE-NEGOCIO.md`.
4. Nada de `document` ou `window` dentro de `src/js/domain`.
