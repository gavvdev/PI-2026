# Regras de negócio implementadas

> Os valores legais (INSS, IRRF, salário mínimo) são de 2026 e foram conferidos em fontes públicas de contabilidade, não em publicação oficial. **O DP/contador deve validar antes de qualquer uso real.**

## Resumo por tipo de contrato

| Regra | CLT | Aprendiz | Estagiário |
| --- | --- | --- | --- |
| Remuneração | Salário | Salário mínimo/hora × jornada | Bolsa-auxílio |
| INSS e IRRF | Sim | INSS e IRRF (na prática IRRF zero) | Não |
| FGTS (encargo da empresa) | 8% | 2% | Não |
| Vale-transporte | Desconta até 6% | Desconta até 6% | Auxílio-transporte pago pela empresa |
| Hora extra | Sim, +50%, até 2h/dia | Proibida | Proibida |
| Falta injustificada | Dia + DSR da semana | Dia + DSR da semana | Proporcional da bolsa |
| Férias | 30 dias após 12 meses | 30 dias após 12 meses, só nas férias escolares | Recesso de 30 dias por ano, 2,5 dias/mês |
| Jornada máxima | 8h/dia | 6h/dia (8h com ensino médio completo) | 6h/dia, 30h/semana |

## Ponto (`timeclock.js`)

- Tolerância de 5 min por marcação: dentro dela nada é descontado; acima, **todos** os minutos contam.
- Hora extra só conta acima de 10 min/dia; para aprendiz e estagiário vira alerta ao gestor e não é paga.
- Dia sem marcação: falta (passado), aguardando (hoje). Falta com justificativa aprovada vira "falta abonada".
- Número de marcações diferente do esperado (2 ou 4) deixa o dia **inconsistente** e bloqueia o fechamento da folha.

## Férias (`vacation.js`)

- Direito: 30 dias por período aquisitivo completo; faltas injustificadas reduzem para 24/18/12 dias (art. 130 da CLT).
- Bloqueios automáticos: antecedência mínima de 30 dias, saldo, fim do contrato, início nos 2 dias antes de feriado ou domingo, mínimo de 5 dias por fração, no máximo 3 frações e uma com 14+ dias, conflito de escala (máx. 30% do setor, mínimo 1).
- Aprendiz: precisa estar dentro das férias escolares, sem exceção.
- Estagiário: fora das férias escolares o pedido exige **exceção**, que só o RH aprova, com justificativa.
- Gestor aprova o próprio time; ninguém aprova a própria solicitação.
- Alerta de vencimento: saldo a gozar com limite concessivo em até 90 dias (crítico até 30).

## Folha (`payroll.js`, `fechamento.js`)

- INSS progressivo com teto; IRRF com desconto simplificado, isenção até R$ 5.000 e redução até R$ 7.350.
- Admissão ou desligamento no mês gera salário proporcional.
- Fechamento só é permitido se a competência já terminou e não há marcações inconsistentes, justificativas pendentes ou férias pendentes. Ao fechar, a folha é congelada.

## Ouvidoria (`ombudsman.js`)

- Classificação por categoria, prioridade e sentimento (léxico de palavras). É um **substituto de IA**, com a mesma interface que um modelo teria.
- Prazos: crítica 2 dias, alta 5, normal 10.
- Anônima: não grava autor; acompanhamento por protocolo + chave de 8 caracteres.

## Limitações conhecidas

Não há rescisão e verbas, 13º salário, abono pecuniário de férias, IRRF e INSS separados sobre férias, banco de horas, dependentes além do campo simples, nem integração com eSocial. O auxílio-transporte do estagiário não é proporcional. A autenticação e a classificação por IA são simuladas.
