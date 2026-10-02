# Administração do sistema

As ferramentas de diagnóstico, auditoria e portabilidade têm telas próprias no grupo **Administração do sistema**. Somente administradores da instalação recebem acesso; a verificação também ocorre nas rotas da API.

## Disponibilidade

| Ferramenta | Imagem estável | Imagem develop |
| --- | --- | --- |
| Diagnóstico | Administrador | Administrador |
| Auditoria | Administrador | Administrador |
| Portabilidade | Administrador e `PORTABILITY_ENABLED=true` | Administrador, habilitada automaticamente |

A portabilidade permanece desabilitada por padrão na versão estável. Configure `PORTABILITY_ENABLED=true` no ambiente do serviço da aplicação e recrie o serviço para habilitá-la. `APP_ENV=develop` não habilita a portabilidade. A identificação da imagem develop usa o manifesto `frontend/build-info.json`, produzido durante o build, com produto, pipeline e versão `MAJOR.MINOR.PATCH-develop.N[.N]`. Manifesto ausente, inválido ou estável não concede essa exceção.

A sessão publica `user.admin_tools` para a interface. Uma sessão ou interface antiga não contorna o bloqueio no backend. Perfis Direção, Coordenação e Secretaria deixam de receber `audit.read`.

## Diagnóstico

O painel reúne disponibilidade dos dados, armazenamento local, registro de eventos, atividade dos serviços, filas e pendências de matrícula online. Informações de implementação ficam em detalhes recolhidos para o suporte.

Filtros disponíveis: período em horário local, serviço, nível, referência da requisição, evento, código de erro, caminho da operação, tarefa e código mínimo da resposta. Os filtros de evento e caminho aceitam trechos; código, tarefa e referência correspondem exatamente. As estatísticas e recorrências consideram o recorte filtrado, limitado aos 10.000 eventos retidos mais recentes. **Relacionar** permite seguir uma requisição ou tarefa entre eventos e serviços.

O pacote respeita os mesmos filtros e mantém resumo, manifesto, eventos sanitizados e hashes. Os nomes são gerados no servidor, por exemplo:

`diagnostico-colegio-exemplo-2026-10-02_02-00-01-UTC-aabbcc.zip`

O nome contém o nome normalizado da identidade principal da instituição, data e horário UTC com segundos e um sufixo aleatório para diferenciar downloads no mesmo segundo. O navegador respeita esse nome com validação contra caminhos e caracteres de controle.

A atividade observada de um processo não comprova sua saúde completa. A coleta não inclui logs do host, proxy ou banco, nem testa credenciais de serviços externos. Falhas anteriores à implantação da coleta ou já fora da retenção não são reconstruídas.

## Auditoria

A consulta é isolada à instituição selecionada. O administrador pode incluir explicitamente acessos e configurações globais da instalação; registros de outras instituições continuam excluídos.

São oferecidos filtros de período, operação, tipo e identificador do registro, autor e referência. Em telas de até 600 pixels, os filtros começam recolhidos para dar espaço ao histórico e podem ser expandidos a qualquer momento. Cada operação apresenta autor, data, origem, referência e detalhes. Quando o evento contém estados anterior e posterior, as alterações aparecem comparadas por campo. O histórico de um registro e as operações de uma mesma referência podem ser consultados diretamente. O vínculo **Investigar diagnóstico** transporta a referência para os eventos técnicos.

A exportação CSV respeita os filtros, aplica proteção contra fórmulas e omite valores de campos sensíveis. Recortes acima de 10.000 operações devem ser refinados antes da exportação. A exportação em si é registrada na auditoria. Não existem novas rotas de alteração ou exclusão da trilha de auditoria.

## Validação

- `backend/tests/test_admin_console.py`: bloqueio por papel, ambiente estável/desenvolvimento, filtros, correlação, isolamento por instituição, redação de segredos e nomes de download.
- `backend/tests/test_portal_diagnostics.py`: hashes e composição dos pacotes, retenção, sanitização e permissões.
- `backend/tests/test_legacy_import.py`: importação seletiva com habilitação explícita da portabilidade no ambiente de teste.
- `frontend/tests/api-download.mjs`: nomes do servidor, Unicode e rejeição de caminhos/caracteres de controle.
- `scripts/e2e-diagnostics.py`: navegação administrativa, diagnóstico e auditoria, downloads reais e larguras de 320 a 1440 pixels.

Sem migração de dados neste conjunto de alterações. A revogação da portabilidade exige somente desabilitar a variável em imagens estáveis e recriar o serviço; nenhum histórico ou arquivo é removido por essa alteração.
