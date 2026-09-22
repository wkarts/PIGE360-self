# Adaptação do template recebido

## Fonte

Anexo: `argws-multitenant-controlplane-template (2).zip`. Sua cópia byte a byte está em `reference/template-original.zip`; o hash consta em `MANIFEST.json` da entrega.

O original possui 662 entradas no arquivo ZIP. Contém backend FastAPI/SQLAlchemy, frontend Vue 3 e recursos de plataforma/control plane e domínio financeiro. Sua proposta original não deve ser confundida com a aplicação educacional criada nesta entrega.

## Preservado como referência

Organização geral backend/frontend, convenção de nomes de constraints SQLAlchemy e padrões de composição visual de cabeçalhos, cartões, diálogos, tabelas e badges. O runtime Vue 3.5.13 utilizado foi obtido da instalação local disponível, com licença MIT em `frontend/vendor/LICENSE-VUE.txt`; não é um logotipo ou ativo de branding da escola.

## Implementado para o escopo escolar

Foi criado núcleo operacional próprio em `backend/app`, sem ativar os endpoints do domínio financeiro do template. A interface escolar é nova, baseada nos padrões visuais inspecionados, não uma cópia das telas financeiras com rótulos trocados. A identidade PS é provisória.

## Decisões diferentes do template

- Remoção do Control Plane do runtime da Secretaria; o original foi arquivado, não sobrescrito no anexo.
- Um banco PostgreSQL por instalação com autorização de escopo escolar, não provisionamento de bancos por tenant.
- SQLAlchemy síncrono e endpoints de banco em `def`, em lugar do driver assíncrono do original.
- Frontend único Vue 3 com TypeScript e templates pré-compilados; não utiliza Vite/Pinia/Vue Router/Tailwind nesta versão ativa.
- Uma imagem de aplicação serve backend e frontend na mesma porta; PostgreSQL é o único serviço adicional obrigatório.
- Sem armazenamento S3/MinIO ou filas; arquivos locais privados com metadados e hash.

A restrição de rede e ausência de dependências npm/driver PostgreSQL no ambiente levou a uma entrega que pudesse ser compilada e exercitada com as ferramentas disponíveis. Essas escolhas estão documentadas; não são apresentadas como equivalência integral à arquitetura original.

## O que esta entrega não é

Não é um patch pronto para aplicar por cima de um banco da plataforma original. Não há migração de dados financeiros, conversão de contas, substituição de schema de Control Plane ou preservação de APIs SaaS existentes. Deve ser instalada em diretório, banco e volumes próprios. Para conciliar com um projeto escolar já em produção, primeiro será necessário obter e analisar aquela versão específica.
