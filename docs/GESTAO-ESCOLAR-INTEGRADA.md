# E-mail, administração e rotina escolar

Esta evolução preserva a aplicação Vue/FastAPI existente e os dados da escola. O pacote `PIGE360-1.1.2-self-hosted-final-bundle` fornecido como referência contém outra arquitetura; ele não substitui o projeto atual nem determina a versão desta release.

## Uso cotidiano

- **Meu e-mail:** aparece para o titular de uma caixa institucional provisionada e ativa. Oferece entrada, enviados, rascunhos, spam, lixeira, pastas pessoais, busca, anexos, respostas e encaminhamento. A leitura apresenta conteúdo como texto; imagens externas e código recebido não são executados. Detalhes de configuração em [EMAIL-INTEGRADO.md](EMAIL-INTEGRADO.md).
- **E-mail institucional:** configuração e provisionamento ficam com o administrador. Os textos de atendimento não expõem o nome do fornecedor. As rotas existentes e os códigos técnicos de diagnóstico são preservados para compatibilidade.
- **Cobranças:** uma cobrança manual pode ser criada sem conta bancária, chave de integração ou CPF do pagador. O recebimento manual exige data, valor integral e meio de pagamento; disponibiliza recibo. Envio ao banco continua condicionado à configuração do provedor. A primeira implementação não registra recebimento parcial.
- **Arquivar ou excluir:** cadastros de pessoas, perfis e estrutura acadêmica oferecem prévia dos vínculos, arquivamento, restauração e exclusão definitiva conforme a autorização e os vínculos existentes. Não apaga matrículas, documentos, lançamentos financeiros ou histórico em cascata. O filtro “Exibir registros” permite localizar arquivados. Um cadastro arquivado precisa ser restaurado antes de novas associações.
- **Instituição:** áreas de dados da escola, identidade, segurança e atendimento. A estrutura acadêmica apresenta categorias, quantidades, busca e filtros de ano, unidade, série e turno.
- **Matrícula:** formulário amplo no computador, com seções de aluno/responsável, turma/datas e complementos. O resumo mostra aluno, unidade, período, turma, vagas e data. Em celular, campos em coluna e ações acessíveis. A data inicial considera America/Bahia; salvar continua criando rascunho, sem reservar vaga ou ignorar a ativação existente.

## Certificados

O certificado A1 existente também assina XML nos perfis fiscais implementados: NF-e/NFC-e 4.00 e DPS nacional 1.00/1.01, com validação da estrutura e do emitente. Assinar um XML não transmite, emite, cancela ou autoriza uma nota. Leiautes municipais de NFS-e diferentes do padrão nacional precisam de um perfil específico.

Avisos internos de validade são discretos no topo e na instituição. E-mail e WhatsApp exigem preferência de canal, destinatário e configuração de envio. A fila revalida o certificado e a autorização antes de enviar; não inclui a chave privada nem a senha na mensagem. A homologação desta alteração usa certificados e destinatários sintéticos, sem comunicações externas reais.

## Administração e restrições

Diagnóstico, Auditoria e Portabilidade têm itens distintos em **Administração do sistema**. O backend aplica as mesmas restrições do menu.

| Ferramenta | Produção | Imagem develop |
| --- | --- | --- |
| Diagnóstico | Administrador | Administrador |
| Auditoria | Administrador | Administrador |
| Portabilidade | Administrador e `PORTABILITY_ENABLED=true` | Administrador, habilitada pelo manifesto da imagem |

`PORTABILITY_ENABLED` é falsa por padrão nos quatro adaptadores de instalação. Alterações de ambiente exigem reinício. `APP_ENV` ou uma versão informada somente em runtime não transformam uma imagem estável em develop.

Diagnóstico oferece recortes por data, serviço, nível, evento, código, tarefa, rota e referência, além de detalhes e agrupamento de ocorrências. Auditoria oferece filtros de autor, operação, entidade, período e correlação. Exportações identificam instituição e data/hora/segundo, respeitando limites e proteção de dados. Veja [ADMINISTRACAO-DO-SISTEMA.md](ADMINISTRACAO-DO-SISTEMA.md).

## Banco e implantação

A cadeia de migrações é única:

`0027_school_community` → `0027_email_client` → `0028_fiscal_certificate_alerts` → `0029_record_lifecycle` → `0030_manual_school_charges`.

As migrações adicionam tabelas de conexão e recibos de envio de e-mail, documentos fiscais e preferências de avisos, metadados de arquivamento e suporte a cobrança manual. Não apagam cadastros existentes. A dependência `lxml==6.1.0` é fixada para canonicalização XML. Os arquivos XSD fiscais versionados têm origem e hash documentados junto aos schemas.

Antes de implantar, faça backup conferido do banco e dos documentos e use o fluxo de imagens existente do repositório. Publique o conjunto completo de código e ativos, aplique as migrações da imagem e confira saúde da aplicação e dos workers. Homologue leitura e envio da caixa institucional e os canais de avisos com contas autorizadas da escola. Nenhum merge, release ou deploy está implícito nesta documentação.

## Reversão

O rollback desta evolução não se limita à interface: a versão anterior não conhece as novas tabelas e cobranças manuais sem conexão bancária. Suspenda novas operações e confira os dados criados depois da atualização antes de planejar qualquer retorno. Não execute downgrade automático ou restaure um backup por cima de operações posteriores sem conciliação. Quando for necessário restaurar, banco e documentos precisam pertencer ao mesmo ponto de recuperação; prefira correção progressiva quando existirem novos registros.

## Validação

Testes cobrem isolamento entre titulares/escolas, idempotência de envio, protocolos TLS locais simulados, XML adulterado, permissões administrativas, opt-in de avisos, vínculos que impedem exclusão, restauração, cobranças manuais e regressões da aplicação. Os E2Es usam dados sintéticos e exercitam os fluxos pelo navegador. Os resultados de uma execução específica são registrados no checkpoint e na PR; execução local não comprova conexão com os servidores externos da escola ou teclado nativo em Safari/iOS.
