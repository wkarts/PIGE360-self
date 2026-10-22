# Contrato do smoke de publicação do website

No merge 433710d (PR67), o run 39805787798, tentativa 2, falhou no smoke
isolado: ele exigia readiness 200 de um website iniciado sem API. A readiness
consulta o backend e corretamente respondeu 503. A incompatibilidade já estava
na base 1e3b464; não foi introduzida pelos layouts V2. Imagens candidatas foram
criadas, mas não promovidas. Isso é distinto do CI aprovado da PR.

O helper website-isolated-smoke.sh é compartilhado pelo CI da PR e publisher:
- /health/live deve responder com sucesso;
- /health/ready deve responder exatamente 503 quando a origem interna é a porta
  1 do loopback do próprio container (sem servidor, DNS ou dependência externa);
- falhas encerram o job; logs são emitidos e o container descartável é removido.

Depois dele, o smoke integrado obrigatório scripts/ci/smoke.sh inicia a stack
real. surfaces-smoke.py exige 200 de live E ready com a API disponível e verifica
conteúdo público, isolamento de conteúdo privado e domínio desconhecido.
Somente depois do smoke integrado o publisher pode alcançar a promoção.
Nenhum endpoint, imagem de aplicação, readiness ou gate foi flexibilizado.

Regressões executam o helper com comandos Docker/curl sintéticos para provar
sucesso, resposta inesperada, falha de transporte e cleanup. O CI executa o mesmo
helper com a imagem Docker real e depois a stack integrada. Sem Docker local,
não atribuir a simulação a execução real; consultar o CI do SHA da PR.

Sem migrations, secrets, versão ou impacto em dados. Reverter este patch restaura
o erro do smoke, não altera a aplicação. Merge, promoção e deploy não são parte
desta correção autorizada; não rerodar o publisher antigo como substituto.
