# Escola Horizonte — fixture pública

Dataset 100% sintético de uma escola privada de Educação Infantil em São Paulo/SP. Não contém nomes, dados de crianças ou qualquer PII real.

## História verificável

Entre julho de 2025 e julho de 2026, alunos e receita líquida crescem, mas a receita por aluno e a margem operacional caem. Descontos maiores, duas contratações e uma nova turma vespertina com 50% de ocupação explicam a pressão. Uma receita extraordinária em janeiro de 2026 mascara parte da deterioração no acumulado.

## Arquivos

- `dre_mensal.xlsx`: DRE mensal com fórmulas e checks.
- `turmas.csv`: capacidade e ocupação por turma/mês.
- `matriculas.csv`: contagens agregadas, sem dados pessoais.
- `equipe.csv`: IDs sintéticos, funções e custo mensal.
- `recebimentos.csv`: faturado, recebido, saldo aberto e baixa efetiva separados.
- `ground_truth.json`: somente testes/evals; proibido no runtime.

Regeneração: `npm run fixture:generate`. O XLSX requer o runtime bundlado do Codex com `@oai/artifact-tool`; passe `--artifact-tool-anchor=<arquivo dentro do diretório que resolve o pacote>` quando ele não estiver instalado no projeto.
