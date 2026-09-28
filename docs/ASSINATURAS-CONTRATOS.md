# Assinatura digital de contratos

## Preparação da instalação

1. Configure `INTEGRATION_ENCRYPTION_KEY` com uma chave Fernet estável, por exemplo a saída de `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Faça cópia segura da chave: perdê-la impede a leitura dos certificados A1 já cadastrados. Ela não é o arquivo do certificado.
2. Coloque **somente certificados das ACs Raiz da ICP-Brasil** (`.pem`, `.crt`, `.cer` ou `.der`) em `data-documents/trust-roots/` junto ao `compose.yaml`. Os exemplos de instalação montam `data-documents/` em `/data`, e a aplicação lê `/data/trust-roots` por padrão. Pode-se definir `SIGNATURE_TRUST_ROOTS_DIR` para outro caminho já acessível pelo processo. Obtenha e confira as versões atuais no [repositório oficial do ITI](https://www.gov.br/iti/pt-br/assuntos/repositorio/repositorio-ac-raiz). Não coloque chaves privadas nesse diretório.
3. Na escola, a direção/administração envia o A1 `.pfx`/`.p12` e senha em **Certificado A1**. O servidor testa a chave privada, validade, CNPJ (quando cadastrado) e cadeia contra as raízes configuradas. O arquivo e a senha são guardados cifrados no banco; os endpoints de leitura nunca os retornam. Rotacione antes de expirar.

## Fluxo de cada contrato

Ao emitir um modelo que exige assinatura, a aplicação assina o PDF com o A1 da escola em uma revisão PAdES incremental. Sem A1 configurado e válido, a emissão falha com `409`; nenhum PDF não assinado é entregue ao responsável. A via original e cada revisão assinada ficam em arquivos separados com SHA-256 e histórico de auditoria.

O responsável baixa a via assinada pela escola, assina no [portal oficial Gov.br](https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica/assinatura-eletronica/) e reenvia o PDF. O servidor exige preservação exata dos bytes da via da escola, uma assinatura incremental adicional e integridade criptográfica de ambas. PDF reescrito, adulterado ou sem assinatura é recusado. A direção/administração confere o PDF no [VALIDAR/ITI](https://validar.iti.gov.br/), confronta a identidade do responsável com a matrícula e anexa o relatório PDF e sua referência. Só após essa revisão o status vira `verified` e a matrícula pode prosseguir. Uma via rejeitada fica no histórico; o responsável baixa novamente a revisão A1 e pode enviar uma nova via assinada.

O fluxo operacional desta instalação usa o portal de assinatura Gov.br e o reenvio do PDF. Há também um [adaptador interno preparado para a API direta](ASSINATURA-GOVBR.md), sem rota ou botão de autorização habilitados. O [credenciamento oficial da API](https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/latest/iniciarintegracao.html) depende das credenciais do serviço público integrador. A conferência local diferencia integridade criptográfica de confiança na cadeia; ela desabilita consulta externa de revogação e não substitui o relatório do VALIDAR/ITI. O comprovante da revisão humana é vinculado ao hash do PDF conferido.

O certificado A1 fica no servidor para a assinatura automática. Limite o acesso administrativo, mantenha a chave Fernet fora do repositório e preserve banco, chave e arquivos juntos no plano de backup. Alterar `INTEGRATION_ENCRYPTION_KEY` sem migrar os segredos bloqueia as novas assinaturas.
