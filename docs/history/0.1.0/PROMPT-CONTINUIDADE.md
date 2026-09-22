# Continuidade do PIGE360 Self — base entregue

Trabalhe sobre esta versão local, não sobre a plataforma V8 inteira. Preserve arquivos, dados, rotas, regras e evidências existentes. A entrega atual é uma Secretaria em FastAPI/Python e Vue 3, exclusiva Web/PWA, com implantação self-hosted em uma porta. Não adicionar Control Plane, financeiro, apps móveis, Tauri, filas distribuídas ou dezenas de containers para aparentar abrangência.

Antes de alterações, leia README, MANUAL-SECRETARIA, RELATORIO-ENTREGA, ADAPTACAO-TEMPLATE e testes. Execute as verificações disponíveis. Não declare Docker, PostgreSQL, PWA ou integrações validados sem execução real.

Prioridade imediata: homologar o Compose no PostgreSQL 17; executar o teste concorrente de última vaga; validar instalação PWA e sessão em navegação HTTP/HTTPS real; testar backup/restore; aplicar o branding oficial quando disponibilizado. Corrigir problemas reais no fluxo aluno → responsável → documentação → matrícula → turma → movimentação → emissão.

O backend atual é síncrono; o frontend usa compilação local TypeScript/Vue, não Vite/Pinia/Router. Qualquer retorno à stack completa originalmente planejada deve ser uma migração deliberada, compatível e testada, não uma troca silenciosa. Preserve o frontend já compilado como artefato reprodutível com as ferramentas declaradas.

Não inferir recursos pela existência do template original. Não ativar módulos financeiros antigos, não integrar uma plataforma remota, não publicar imagens nem modificar repositórios sem autorização explícita. A instalação de cada cliente é independente; empresas/escolas são divisões internas com autorização server-side.

Não sobrescrever matrícula anterior na rematrícula, não contar rascunho como vaga confirmada, não apagar histórico, não converter PDF recebido em documento validado automaticamente, não expor storage ou dados de outra escola. Recursos fora desse fluxo devem permanecer explicitamente fora do escopo, sem telas vazias.
