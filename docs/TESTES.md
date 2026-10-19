# Plano e relatório de testes

Este documento separa o que **já foi verificado automaticamente** do que **ainda precisa ser feito com pessoas da equipe**. Teste de usabilidade só vale com usuários reais, então a Parte B é um roteiro para preencher.

## Parte A. Verificação automática (executada)

Comandos: `npm test` (63 testes de regras e telas) e `npm run test:e2e` (17 verificações em fluxos completos, com jsdom). Resultado na última execução: **todos passaram, sem erros de JavaScript**.

### Casos de uso pedidos na proposta

| # | Caso | Resultado esperado | Situação |
| --- | --- | --- | --- |
| 1 | Estagiário solicita recesso fora das férias escolares | Bloqueio com opção de exceção; exceção exige justificativa, fica pendente e só o RH decide | Funcionou |
| 2 | Aprendiz solicita férias fora do período escolar | Bloqueio sem opção de exceção | Funcionou |
| 3 | Simular atraso de 25 min na entrada | Alerta imediato; acima de 5 min desconta todos os minutos na folha | Funcionou |
| 4 | Reclamação anônima | Nenhum autor gravado, protocolo + chave, consulta só com os dois, classificada como crítica se tratar de assédio | Funcionou |
| 5 | Hora extra de aprendiz | Não é paga; alerta ao gestor | Funcionou |
| 6 | Férias CLT começando 2 dias antes de feriado/domingo | Bloqueio (art. 134, §3º) | Funcionou |
| 7 | Dois colaboradores de TI com férias sobrepostas | Bloqueio por conflito de escala | Funcionou |
| 8 | Fechar folha com marcação inconsistente ou justificativa pendente | Fechamento bloqueado com lista de pendências | Funcionou |
| 9 | Folha por contrato | CLT com INSS/IRRF/VT e FGTS 8%; aprendiz com FGTS 2%; estagiário sem descontos legais | Funcionou |
| 10 | Falha de segurança: texto com HTML na ouvidoria | Exibido como texto, não executado | Funcionou |

### Ajustes de regra feitos durante a construção

1. **Estagiário e férias escolares**: a lei diz "preferencialmente". Em vez de bloquear sem saída, criamos o fluxo de **exceção** aprovada pelo RH. Para aprendiz a regra é obrigatória e não tem exceção.
2. **Classificador da ouvidoria**: a primeira versão dava confiança alta a textos com uma única palavra-chave (um elogio foi classificado como "Liderança" com 82%). Removemos termos genéricos, passamos a considerar a quantidade de termos distintos e incluímos palavras positivas.
3. **Suspensão disciplinar**: passou a contar apenas dias úteis, para ficar coerente com o espelho de ponto.
4. **Atraso em tempo real**: a primeira batida do dia já mostra o atraso, sem esperar a saída.
5. **Suspensão para estagiário**: bloqueada, pois estágio não tem vínculo empregatício.

## Parte B. Teste com a equipe (a fazer)

Sugestão: 5 pessoas, 20 minutos cada, perfis diferentes (RH, gestor, colaborador). Peça que pensem em voz alta e **não ajude**.

### Roteiro

| Tarefa | Perfil | Sucesso quando |
| --- | --- | --- |
| T1. Entrar como estagiário e pedir férias em novembro | Colaborador (Thiago) | Entende o bloqueio e consegue pedir exceção |
| T2. Simular um atraso e ver o efeito no resumo | Colaborador (Rafael) | Encontra o alerta e o resumo do mês |
| T3. Registrar uma reclamação anônima e acompanhar depois | Sem login | Anota protocolo e chave e consulta o andamento |
| T4. Decidir a exceção de férias e uma justificativa | RH (Helena) | Encontra as duas pendências sem ajuda |
| T5. Fechar a folha de setembro e conferir o holerite do aprendiz | RH | Entende a lista de pendências e o resultado |
| T6. Dizer quantos desligamentos houve e o principal motivo | RH | Lê o dado no dashboard ou em Desligamentos |

### Ficha por participante

| Campo | Anotação |
| --- | --- |
| Perfil / tarefa | |
| Concluiu? Tempo gasto | |
| Onde hesitou ou errou | |
| O que funcionou bem | |
| Frase marcante | |
| Gravidade (1 leve a 4 impede o uso) | |

### Consolidação (preencher após os testes)

- O que funcionou:
- Falhas de usabilidade (com gravidade):
- Ajustes necessários nas regras:
- Sugestões para a próxima versão:

## Parte C. Sugestões já levantadas para a próxima versão

- Back-end e autenticação reais, com perfis e permissões no servidor.
- Modelo de linguagem na classificação da ouvidoria, mantendo revisão humana.
- Rescisão, 13º, abono de férias e integração com eSocial.
- Biometria e geolocalização reais no registro de ponto.
- Notificações por e-mail para aprovações e alertas de vencimento.
- Revisão das tabelas e regras pelo DP/contador responsável.
