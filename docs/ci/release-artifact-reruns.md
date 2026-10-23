# Artefato de bases em reexecuções de release

`container-bases.yml` expõe o `artifact-id` do upload do lock pelas saídas do
job e do workflow reutilizável. `release.yml` depende diretamente de `bases`
e baixa esse ID no run atual, sem procurar artefatos por padrão, nome de outra
tentativa ou execução externa. O produtor e o checkout da release continuam
usando o SHA verificado por `version`.

- Rerun parcial: o consumidor usa o ID retido do produtor que realmente executou.
- Rerun completo: o produtor cria outro artefato, com nome da nova tentativa,
  e entrega seu novo ID. O artefato anterior não é sobrescrito.
- ID vazio/inválido ou lock ausente: falha fechada, antes da promoção.
- Artefato expirado/removido: o download deve falhar; não há fallback para bases
  móveis, outros runs ou reconstrução silenciosa.

A correção não muda permissões, digests, tags, verificação de publicação ou
rollback. Não tenta resolver o HTTP 403 observado na verificação GHCR: isso
exige diagnóstico independente, sem tratar negação de acesso como ausência.

## Validação

`python -m unittest discover -s tests/ci -p test_release_artifact.py -v`
valida os contratos reais dos arquivos e executa o guard Bash, incluindo os
handoffs simulados de rerun parcial (produtor 1 / consumidor 2 ou 3) e completo.
Não é uma execução do scheduler GitHub nem uma publicação GHCR.

Depois de integrar pelo fluxo `fix/* -> develop -> main`, uma execução futura
com a definição corrigida poderá validar o comportamento remoto. Reexecutar
um run antigo continua usando seu SHA/ref original; esta PR não altera
retroativamente a definição do run 39948542038. Não disparar publicação ou
promover release sem autorização explícita.
