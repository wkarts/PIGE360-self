# Confiança ICP-Brasil para A1

## Uso normal

O pacote inclui as raízes públicas ICP-Brasil **v5 e v12 (RSA)**. Para um PFX/P12 que contenha sua cadeia intermediária e termine nessas raízes, basta selecionar o certificado e informar a senha. Não é necessário instalar raízes manualmente. Nenhuma chave privada real acompanha o pacote.

O cadastro continua verificando senha, chave privada, vigência, CNPJ da mantenedora, assinatura de prova e confiança independente do PFX. Certificados trazidos dentro do PFX são somente candidatos à construção da cadeia: **nunca são promovidos a âncoras**. A assinatura institucional verifica novamente a confiança da nova assinatura antes de persistir a revisão. A assinatura fiscal usa o mesmo conjunto de raízes e mantém suas verificações próprias de chave RSA, uso, validade e CNPJ.

## Origem e autenticidade

- Índice oficial: https://www.gov.br/iti/pt-br/assuntos/repositorio/repositorio-ac-raiz
- Evidência autenticada dos fingerprints: https://www.gov.br/iti/pt-br/assuntos/comite-gestor/extratos-de-auditoria/WebTrust_for_CA_C.pdf, páginas 7–8 (Attachment A).
- Consulta e conferência: 21/10/2026.
- Os endpoints HTTPS de download da AC-Raiz retornaram 503 durante a coleta. Os bytes foram obtidos nos endpoints HTTP oficiais publicados pelo ITI, **sem confiar no transporte HTTP**: o SHA-256 do certificado DER foi confrontado integralmente com o fingerprint do relatório acima, obtido via HTTPS com validação TLS. Autoassinatura, BasicConstraints e keyCertSign também foram verificados.

| Raiz | SHA-256 do DER | Validade final |
|---|---|---|
| v5 | caa53fc6091c6951887c976e378f6ef89aa6377c55d97b6475422b71ed7e9b17 | 02/03/2029 |
| v12 | d8478e37ce19c690cf657381e68fe600e4e1a042536830f06847e03e554c4b01 | 22/10/2037 |

`backend/app/trust/icp-brasil/manifest.json` registra URLs, fingerprints DER, datas e hash do relatório usado como evidência. Os PEM são cópias públicas dos certificados, sem alteração do DER assinado. O loader valida hashes, autoassinatura e propriedades de CA antes de usá-los; pacote ausente/corrompido falha fechado. O manifesto e seus pins fazem parte do código revisado da release, não são uma assinatura independente contra adulteração completa da imagem.

## Cobertura e limites

Não é um pacote de todas as ACs/intermediárias da ICP-Brasil. As raízes v5/v12 são citadas na política atual de assinatura em https://repositorio.iti.gov.br/instrucoes-normativas/IN2021_03_DOC-ICP-15.03.htm. Não se afirma conformidade integral com essa política: este produto mantém validação offline e não implementa todos os requisitos de carimbo do tempo e revogação.

O runtime atual não aceita chaves EC com parâmetros explícitos presentes em v4/v13, nem o algoritmo de v7; esses certificados não foram incluídos. v6 (Ed448) também não integra este pacote restrito a raízes RSA v5/v12. Raízes revogadas/expiradas e raízes dedicadas a TLS/código (v10/v11) não são incluídas.

A cadeia intermediária precisa estar no PFX/PDF. A aplicação não baixa certificados por AIA, não importa toda AC como raiz e não faz atualização silenciosa de confiança. PFX sem intermediárias, cadeia desconhecida ou algoritmo não suportado deve produzir erro de validação; reexporte a cadeia completa pelo fornecedor do certificado. Confiança offline não verifica revogação (`revocation_checked=false`), não substitui VALIDAR/ITI nem libera matrícula sem a conferência existente.

## Compatibilidade e atualização

`SIGNATURE_TRUST_ROOTS_DIR` continua em `/data/trust-roots`; seu conteúdo administrado é adicional e deduplicado por DER. Certificado inválido nesse diretório continua bloqueando a operação. Nada é escrito nesse volume ou no trust store do sistema operacional. Backups/restauração conservam o caminho e comportamento anteriores; as raízes empacotadas vêm da versão da aplicação.

Antes de cada release e quando o ITI publicar nova raiz, revogação ou substituição:

1. Revisar o índice oficial e a evidência HTTPS independente dos fingerprints. Não aprovar apenas por nome/subject, autoassinatura ou conteúdo de um PFX.
2. Obter o certificado oficial e comparar o SHA-256 DER com essa evidência autenticada. Divergência bloqueia a atualização. Novos fingerprints precisam de revisão de código; não há comando que os aceite automaticamente.
3. Verificar CA, uso, autoassinatura, vigência, algoritmo suportado e finalidade. Não promover intermediárias a âncoras.
4. Atualizar PEM e manifesto em PR; registrar origem/data e exclusões. Rodar `python scripts/verify-signature-trust.py`, testes de confiança e suítes PDF/fiscal/portal, além dos gates do repositório.
5. Publicar nova versão somente pelo fluxo normal de release autorizado. A implantação dessa versão continua a cargo do operador; esta correção não altera a instalação existente.

Uma raiz nova não é confiada em runtime automaticamente. Para rollback, retornar à versão de imagem anterior conforme o procedimento operacional, preservando banco e volumes; nenhuma migration é necessária. Revogar confiança comprometida não deve ser revertido sem análise específica.
