# Histórico de versões

## 0.3.0 — 22–23/09/2026

- Removido template original da distribuição.
- Adicionados portal dos responsáveis e processos de pré-matrícula online.
- Acrescentados análise, mensagens, documentos, conferência de vínculos e efetivação.
- Adicionados cobrança ASAAS, conector HTTP parametrizável Connect API e worker persistente.
- Adicionados códigos de contato/recuperação, proteção de idempotência, webhook e conciliação.
- Acrescentada migration 0003; preservadas migrations 0001/0002 e ativos oficiais.
- Expandido o cadastro único: uma Pessoa pode acumular Aluno, Professor, Funcionário, Responsável e tipos cadastrais adicionais sem misturar login/perfil de acesso.
- Adicionadas telas e APIs próprias para Professor e Funcionário, perfis profissionais, foto privada e vínculo docente por Pessoa antes da criação de usuário.
- Acrescentada migration 0007, com compatibilidade para atribuições docentes existentes.
- Reorganizados os deploys em `deploy/docker`, `deploy/dockge`, `deploy/portainer` e `deploy/cloudpanel`, cada um com ambientes develop/production e Compose image-only.
- Atualização preserva chaves; backup/restauração consideram efeitos externos e worker.

## 0.2.0 — Base recebida

Branding oficial, expansão de protocolos, edição da pré-matrícula interna e pendências documentais. Recursos mantidos pela versão atual.

## 0.1.0 — Base inicial

Cadastros, estrutura acadêmica, matrícula, documentos, Secretaria Web/PWA e Docker self-hosted.
