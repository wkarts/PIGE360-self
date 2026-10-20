# PR 57 — fechamento das correções auditadas

Origem revisada: `bc26d8183b46bb77350d69418ac32c1f3a92a044`.
Branch preservada: `feature/academic-admission-completion`; destino `develop`.
Escopo exclusivo PIGE360 Self. Esta entrega não executa merge, release ou deploy da escola.

## Correções e provas

| Achado | Correção | Regressão |
| --- | --- | --- |
| Restore visual bloqueado quando o acervo atual está avariado | Proteção prévia conserva dump, arquivos legíveis e bytes corrompidos; manifesto registra ausências, hashes/tamanhos esperados e efetivos. Erros de rede/permissão continuam bloqueantes. | `test_backup_recovery_regressions.py`; `backup-smoke.py`; `surfaces-smoke.py` destrói arquivo local e corrompe MinIO antes de confirmar restore pela UI. |
| Dropbox legado cria upload sem autorização | Depois da conciliação, ambos os provedores respeitam `allow_new_upload=false`. | Regressão com flag falsa/verdadeira e transporte isolado. |
| Envio legado `sending` sem recuperação visual | API informa `can_recover` apenas após 30 minutos e sem job ativo; UI utiliza essa capacidade. | Backend, cancelamento/confirmação no `e2e-completion.py`. |
| Refresh perde convite | Token é trocado por cookie HttpOnly restrito à API, com validade original; URL conserva somente UUID não secreto, isolando múltiplos convites. | Testes de convite e refresh em `e2e-continuity.py`. |
| Upgrade muda projeto Compose | Não preencher nome ausente com o exemplo; resolver identidade antes da atualização e fixá-la nos comandos. | Testes do helper/deployer e fixture Docker de upgrade. |
| Update concorre com restore | Lock compartilhado por identidade Compose; manutenção bloqueante após falha/interrupção. | Testes de concorrência e histórico legado. |
| OCR efetivo limitado pelo upload geral | Exceção estrita para os dois POST OCR, com envelope limitado e validação individual de arquivo. | 12/16 MiB, streaming, excesso e preservação do limite geral. |
| Portal agrega IP de usuários | Origem assinada por HMAC dedicado; X-Forwarded-For só é aceito de proxy explicitamente confiável. | Assinatura inválida/expirada, spoofing e origens distintas. |
| Porta alternativa Windows falha por Origin | Mesmo número de porta nos extremos do túnel; Origin continua exato. | HTTP local real e montagem do túnel. |
| Identidade visual parcial | Nome/logo/cores/fontes configurados, ícones e manifest por superfície; primeiro acesso usa a mesma identidade. Os três modelos são preservados. | Testes de identidade e E2E com configuração sintética. |

## Proteção degradada antes do restore

Backups normais continuam estritos: qualquer objeto ausente ou divergente impede sua conclusão. Somente a proteção automática imediatamente anterior à restauração permite registrar dano conhecido.

O ZIP de proteção permanece no diretório `backups`, identificado por `previous_backup_id` no journal da restauração. `manifest.json.protection.damage` registra cada objeto ausente ou corrompido; os bytes corrompidos legíveis são preservados com seu hash real, ao lado do dump que mantém o cadastro anterior. Nenhum objeto alheio é apagado.

Uma proteção degradada é uma cópia forense do estado existente, não um backup íntegro. O verificador e o upload/preparo normal recusam restaurá-la automaticamente (`BACKUP_DEGRADED_PROTECTION_NOT_RESTORABLE`). A inspeção operacional pode usar `verify_bundle(path, allow_degraded=True)`, sem executar restore. Arquivos já inexistentes não podem ser reconstruídos pela proteção anterior: sua recuperação vem do pacote íntegro selecionado.

`AccessDenied`, falha de rede, bucket inexistente, dump incompleto ou ZIP inválido não são convertidos em ausência tolerada. Nesses casos o restore continua bloqueado antes das escritas de restauração. Após falha/interrupção destrutiva, o deployer conserva manutenção até uma recuperação concluída.

## Configuração e compatibilidade

- `PORTAL_INTERNAL_TOKEN`: segredo dedicado entre portal e núcleo, gerado na instalação/upgrade; não é chave administrativa. Preservar valores existentes. Nunca publicar seu valor.
- `PORTAL_TRUSTED_PROXY_IPS`: redes/endereço do proxy imediatamente anterior, configurados explicitamente. Vazio não confia em X-Forwarded-For. Não usar confiança irrestrita.
- As configurações existentes de Mailcow, SMTP, WhatsApp, imagens, serviços, portas e volumes são preservadas. Convite continua dirigido a `User.email`, separado da caixa institucional.
- Não há migrations novas, alteração de bancos por escola, redesign dos modelos ou dependência externa de IA/OCR. Versão permanece `0.12.1`, já reconciliada pela PR.

## Evidências adicionais do escopo original

- Importação sintética com 600 registros: progresso persistido em múltiplos lotes, interrupção após lote, rollback e retomada sem duplicação. E2E inclui worker interrompido e botão de retomada após refresh.
- Reserva paga com prazo vencido e documento obrigatório pendente: matrícula só é liberada após validação documental.
- Rascunho de inscrição reaberto em outra sessão, incluindo retry idempotente.
- OCR sintético ampliado inclui imagem degradada, PDF multipágina, PDF ativo, acima do limite e malformado. Baixa qualidade é registrada honestamente; não equivale a autenticidade nem permite dispensar revisão humana.

## Testes executados e limites

A validação local utiliza Python 3.13 e Node 22, com SQLite descartável, dados sintéticos e provedores simulados. Comandos principais:

- `PYTHONPATH=backend python -m pytest backend/tests -q`
- `python -m unittest discover -s tests/ci -v`
- `npm run typecheck --prefix frontend`
- `npm run build --prefix frontend`
- `python scripts/ci/validate.py`
- `git diff --check`

Resultado local final: 591 testes backend aprovados, 3 casos dependentes de PostgreSQL ignorados e 5 subtestes aprovados; 205 testes de infraestrutura aprovados. Typecheck, build Node 22, validate e diff-check aprovados. A avaliação OCR sintética obteve 18/21 campos, com 0/3 na imagem degradada, mantida como caso de revisão humana.

Os resultados finais e o SHA remoto exato são registrados no relatório da PR após execução. Testes adicionados não devem ser confundidos com testes executados. Docker/PostgreSQL, E2E Chromium e executável Windows são verificados pelo GitHub Actions; este ambiente local não possui Docker e seu Chromium está bloqueado pelo sandbox.

Homologações externas continuam separadas: certificado A1/ICP real e revogação, documentos reais autorizados, Drive/Dropbox reais, DNS/TLS/proxy da escola e Windows interativo. Mailcow funcional na instalação é informação confirmada pelo usuário; nenhuma conta real foi criada aqui.

## Rollout e rollback

Revisar e aprovar a PR antes da promoção existente. Fazer backup íntegro e preservar configuração/chaves antes de qualquer atualização da escola. A atualização usa o mesmo projeto Compose e os volumes existentes. Não executar rollout em paralelo com restore. Rollback de código utiliza o conjunto anterior de imagens compatíveis e a configuração preservada; restauração de dados permanece procedimento separado, explícito e offline, nunca uma consequência automática de rollback de imagem.
