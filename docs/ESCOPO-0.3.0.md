# Escopo efetivamente entregue

| Área | Situação |
|---|---|
| Secretaria interna 0.2 | Preservada: cadastros, responsáveis, estrutura acadêmica, matrículas/rematrículas, movimentações, documentação, protocolos, relatórios e auditoria |
| Cadastro único operacional | Expandido: Pessoa central com visões próprias de Aluno, Professor, Funcionário e Responsável; uma mesma pessoa pode acumular tipos e perfis profissionais |
| Professor e funcionário | Formulários completos com dados pessoais, foto privada, matrícula funcional, vínculo, situação, datas e dados profissionais/funcionais |
| Deploy self-hosted | Compose image-only separado em Docker, Dockge, Portainer e CloudPanel, cada um com exemplos develop/production, bind mounts relativos e uma única porta pública |
| Template original | Removido da distribuição e da árvore da aplicação |
| Portal dos responsáveis | Implementado: conta própria, acesso, recuperação, perfil e múltiplas inscrições |
| Pré-matrícula online | Implementada: processo, ofertas, rascunho, documentos, termos e envio |
| Análise da Secretaria | Implementada: conferência, correções, lista de espera, indeferimento, aprovação e efetivação |
| Reuso de pessoas existentes | Implementado mediante seleção explícita e conferência pela equipe; sem associação automática por CPF |
| Matrícula/documentos no portal | Implementados após efetivação autorizada |
| Comunicação interna | Histórico, mensagens da família e notas internas segregadas |
| Connect API | Transporte configurável, fila, criptografia e callback implementados; contrato real não homologado |
| ASAAS Pix/boleto | Adaptador API v3, cobranças avulsas/lote mensal, consulta, cancelamento, webhooks e conciliação implementados; sandbox/produção não homologados com conta real |
| Verificação e recuperação | Código único e expiração implementados; entrega depende de SMTP ou Connect reais |
| PWA | Shell/cache atualizado, responsividade; não armazena dados privados offline; instalação em dispositivo pendente |
| Docker/PostgreSQL | Arquivos e testes preparados; runtime não executado no ambiente de construção |

Esta versão não entrega: motor acadêmico completo de notas/frequência, histórico acadêmico certificado, assinatura digital, contratos jurídicos eletrônicos, NFS-e, Educacenso, cobrança de cartão, Pix Automático, Pix de saída, CNAB/OFX, contabilidade, bibliotecas de drivers para todos os bancos ou gestão de conversas/instâncias da Connect API. Não há aplicativos nativos Android/iOS/desktop.

A expansão permite o ciclo administrativo online de matrícula, mas não deve ser descrita como conclusão de todas as áreas do ERP educacional original. Recursos externos só entram em operação após configuração e homologação da instituição.
