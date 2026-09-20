# User Stories: Catálogo de Produtos

Catálogo canônico de comportamento para o catálogo de produtos. Complementa `_prd.md`; consumido por
`_techspec.md` (mapeamento de componentes) e `_tests.md` (matriz de cobertura).

## Resumo

| Story                              | Critério de Aceite Principal                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| US-001: Cadastrar produto          | Produto com SKU único, nome e preço > 0 aparece na listagem                   |
| US-002: Listar produtos            | Listagem paginada exibe SKU, nome e preço, do mais recente ao mais antigo     |
| US-003: Consultar produto          | Detalhe exibe SKU, nome, descrição e preço                                    |
| US-004: Editar produto             | Nome, descrição e preço são atualizados; SKU permanece inalterado             |
| US-005: Excluir produto            | Após confirmação, produto some definitivamente e o SKU fica livre             |

## Personas

- **Administrador** — pessoa responsável pela loja que mantém o catálogo. Precisa cadastrar, consultar, corrigir e remover produtos com segurança. É a única persona desta funcionalidade.

## Índice de Stories

| ID     | Área da Funcionalidade | Persona       | Story                                  |
| ------ | ---------------------- | ------------- | -------------------------------------- |
| US-001 | Gestão de produtos     | Administrador | Cadastrar um produto                   |
| US-002 | Gestão de produtos     | Administrador | Listar produtos paginados              |
| US-003 | Gestão de produtos     | Administrador | Consultar um produto                   |
| US-004 | Gestão de produtos     | Administrador | Editar nome, descrição e preço         |
| US-005 | Gestão de produtos     | Administrador | Excluir definitivamente um produto     |

## Gestão de produtos

### US-001: Cadastrar produto

**Como** Administrador, **eu quero** cadastrar um produto com SKU, nome, descrição e preço, **para que** ele passe a fazer parte do catálogo.

Critérios de aceite:

- AC-1: Dado SKU inédito, nome preenchido e preço maior que zero, quando o Administrador confirma o cadastro, então o produto é criado e aparece na listagem.
- AC-2: Dado descrição em branco, quando o Administrador confirma o cadastro, então o produto é criado com descrição vazia.
- AC-3: Dado preço informado em reais, quando o produto é salvo, então o preço é guardado com 2 casas decimais em BRL.

Casos de borda:

- EC-1: SKU já existente → cadastro rejeitado com mensagem de SKU duplicado; nenhum produto é criado.
- EC-2: SKU em branco ou só com espaços → rejeitado com mensagem de SKU obrigatório.
- EC-3: Nome em branco ou só com espaços → rejeitado com mensagem de nome obrigatório.
- EC-4: Preço zero, negativo ou não numérico → rejeitado com mensagem de preço inválido.
- EC-5: Preço com mais de 2 casas decimais → rejeitado com mensagem de preço inválido.
- EC-6: Campos acima do tamanho máximo (SKU 64, nome 200, descrição 5000 caracteres) → rejeitado com mensagem do limite excedido.
- EC-7: SKU com diferença apenas de maiúsculas/minúsculas ou espaços nas pontas de um existente → tratado como duplicado (SKU é normalizado: sem espaços nas pontas, comparação sem distinção de maiúsculas).
- EC-8: Duas submissões simultâneas com o mesmo SKU → apenas uma cria o produto; a outra recebe a mensagem de SKU duplicado.
- EC-9: Clique duplo/reenvio do mesmo formulário após sucesso → não cria segundo produto (a segunda tentativa é rejeitada como SKU duplicado).
- EC-10: Sessão expirada ou usuário sem papel de Administrador → cadastro negado com mensagem de acesso não autorizado.
- EC-11: Conexão perdida durante o envio → nenhum produto parcial é criado; o Administrador pode tentar de novo.
- EC-12: Entrada com HTML/script hostil em nome ou descrição → armazenada como texto e exibida sem ser executada.

### US-002: Listar produtos

**Como** Administrador, **eu quero** ver os produtos em uma listagem paginada, **para que** eu navegue pelo catálogo.

Critérios de aceite:

- AC-1: Dado produtos cadastrados, quando o Administrador abre a listagem, então vê SKU, nome e preço, do mais recente ao mais antigo.
- AC-2: Dado mais de 20 produtos, quando abre a listagem, então vê 20 por página e controles para as demais páginas.

Casos de borda:

- EC-1: Nenhum produto cadastrado → listagem exibe estado vazio com mensagem informativa.
- EC-2: Página solicitada além da última → exibe a última página válida ou estado vazio com mensagem, sem erro.
- EC-3: Número de página inválido (zero, negativo, não numérico) → assume a primeira página.
- EC-4: Produto excluído enquanto o Administrador está na listagem → some ao recarregar; ações sobre ele resultam em mensagem de produto não encontrado.
- EC-5: Sessão expirada ou sem papel de Administrador → acesso negado com mensagem de não autorizado.
- EC-6: Milhares de produtos → paginação continua responsiva; apenas a página atual é carregada.
- EC-7: Perda de conexão ao carregar → mensagem de erro com opção de tentar de novo.
- EC-8: Produtos criados enquanto o Administrador navega entre páginas → podem deslocar itens entre páginas; nenhum erro é exibido.
- EC-9: Ordem estável para produtos criados no mesmo instante → desempate determinístico, sem itens repetidos ou perdidos entre páginas.

### US-003: Consultar produto

**Como** Administrador, **eu quero** abrir os detalhes de um produto, **para que** eu confira suas informações.

Critérios de aceite:

- AC-1: Dado um produto existente, quando o Administrador o abre, então vê SKU, nome, descrição e preço.

Casos de borda:

- EC-1: Produto sem descrição → campo de descrição exibido vazio, sem erro.
- EC-2: Identificador inexistente ou produto já excluído → mensagem de produto não encontrado.
- EC-3: Identificador malformado → mensagem de produto não encontrado.
- EC-4: Sessão expirada ou sem papel de Administrador → acesso negado.
- EC-5: Perda de conexão → mensagem de erro com opção de tentar de novo.
- EC-6: Link direto (deep link) para um produto por Administrador autenticado → abre o detalhe normalmente.

### US-004: Editar produto

**Como** Administrador, **eu quero** corrigir nome, descrição e preço de um produto, **para que** o catálogo fique correto.

Critérios de aceite:

- AC-1: Dado um produto existente, quando o Administrador altera nome, descrição ou preço válidos e salva, então os novos valores aparecem no detalhe e na listagem.
- AC-2: Dado um produto, quando o Administrador abre a edição, então o SKU é exibido e não pode ser alterado.

Casos de borda:

- EC-1: Nome em branco → rejeitado com mensagem de nome obrigatório; valores anteriores permanecem.
- EC-2: Preço zero, negativo, não numérico ou com mais de 2 casas → rejeitado com mensagem de preço inválido; valores anteriores permanecem.
- EC-3: Campos acima do tamanho máximo → rejeitado com mensagem do limite.
- EC-4: Tentativa de alterar o SKU (ex.: requisição manual) → rejeitada; SKU permanece.
- EC-5: Descrição apagada → salva como vazia.
- EC-6: Produto excluído por outro Administrador antes de salvar → mensagem de produto não encontrado; nada é recriado.
- EC-7: Dois Administradores editam o mesmo produto → a última gravação prevalece e ambos veem o valor final ao recarregar.
- EC-8: Salvar sem nenhuma alteração → sucesso sem efeito colateral.
- EC-9: Reenvio do mesmo salvamento → mesmo resultado (idempotente).
- EC-10: Sessão expirada ou sem papel de Administrador → edição negada; nada é alterado.
- EC-11: Conexão perdida ao salvar → nenhuma alteração parcial; produto mantém os valores anteriores.
- EC-12: HTML/script hostil em nome ou descrição → armazenado como texto e exibido sem ser executado.

### US-005: Excluir produto

**Como** Administrador, **eu quero** excluir definitivamente um produto, **para que** itens descontinuados saiam do catálogo.

Critérios de aceite:

- AC-1: Dado um produto existente, quando o Administrador solicita a exclusão, então uma confirmação explícita, com aviso de que é irreversível, é exibida antes de excluir.
- AC-2: Dado a confirmação, quando o Administrador confirma, então o produto deixa de aparecer na listagem e no detalhe.
- AC-3: Dado um produto excluído, quando o Administrador cadastra novo produto com o mesmo SKU, então o cadastro é aceito.

Casos de borda:

- EC-1: Administrador cancela na confirmação → nada é excluído.
- EC-2: Produto já excluído (outro Administrador ou reenvio) → mensagem de produto não encontrado; sem erro adicional.
- EC-3: Dois Administradores excluem o mesmo produto ao mesmo tempo → um sucede, o outro recebe produto não encontrado.
- EC-4: Identificador inexistente ou malformado → mensagem de produto não encontrado.
- EC-5: Sessão expirada ou sem papel de Administrador → exclusão negada; produto permanece.
- EC-6: Conexão perdida durante a exclusão → produto ou foi excluído por completo ou permanece; o Administrador vê o estado real ao recarregar.
- EC-7: Excluir o último produto da listagem → listagem passa ao estado vazio.
- EC-8: Excluir o único item da última página → Administrador é levado à página anterior válida.
- EC-9: Tentativa de restaurar produto excluído → não existe essa operação.
