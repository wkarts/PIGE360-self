# Checkpoint da correção de inscrição online

Origem preservada: develop `61205ab81875458539f7f3f6580fd7179e278a81`.
Branch: `fix/online-enrollment-documents-whatsapp`.
A PR 67 já estava mesclada antes deste trabalho. O pacote 1.1.2 anexado foi tratado como referência histórica; não substituiu o código atual.

Resultados: jornada HTTP/Chromium em results.json; testes de regressão em backend/tests/test_online_manual_whatsapp.py. Provedores reais e PostgreSQL locais não foram homologados. Checks do SHA publicado ficam vinculados à PR. Contratos e diagnóstico reais do cliente permanecem fora do Git.

Complemento de troca de contrato: parte do HEAD remoto `e1f1811944de43ec2ab901c600eeda50b3595e43`, cujo CI `40343864826` concluiu com sucesso. A nova jornada valida alteração da revisão, troca de modelo, três PDFs preservados e campanha intacta. Os 34 testes focados e o E2E do complemento passaram localmente. O novo SHA exige seus próprios checks.
