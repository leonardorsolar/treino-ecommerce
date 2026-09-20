# PRD: Catálogo de Produtos (product-catalog)

## Resumo

- **O quê:** módulo administrativo para cadastrar, listar, consultar, editar e excluir produtos simples (SKU, nome, descrição, preço).
- **Para quem:** Administrador da loja, única persona.
- **Por que agora:** o e-commerce é greenfield e não tem catálogo; ele é a base para todas as funcionalidades seguintes.

## Visão Geral

O projeto ainda não possui nenhum registro de produto. Esta funcionalidade cria o catálogo mínimo com o qual o Administrador mantém os itens vendáveis da loja. Cada produto é uma unidade única com SKU, sem variantes. Não há vitrine pública nesta entrega. O valor é dar à loja uma fonte única e confiável de produtos e preços.

## Objetivos

- O Administrador passa a cadastrar, consultar, corrigir e remover produtos, o que antes não era possível.
- O sistema garante que nenhum SKU se repita e que todo preço seja válido.
- O Administrador percorre o catálogo em uma listagem paginada.

## User Stories

- US-001 a US-005 (Gestão de produtos): cadastro, listagem paginada, consulta, edição e exclusão definitiva de produtos.

[User stories completas](_user_stories.md)

## Funcionalidades Principais

- **Cadastro de produto:** cria produto com SKU, nome, descrição (opcional) e preço. Rejeita dados inválidos com mensagem clara.
- **Listagem paginada:** exibe SKU, nome e preço, 20 itens por página, do mais recente ao mais antigo. Sem busca nem filtros.
- **Consulta de produto:** exibe todos os campos de um produto.
- **Edição de produto:** altera nome, descrição e preço; o SKU é imutável.
- **Exclusão definitiva:** remove o produto após confirmação explícita; ação irreversível.

Interação: listagem leva a consulta, edição e exclusão; após cadastro, edição ou exclusão, a listagem reflete o novo estado.

## Regras de Negócio

- **RN-01 SKU único:** o SKU é único em todo o catálogo. A comparação ignora maiúsculas/minúsculas e espaços nas pontas; o SKU é guardado sem espaços nas pontas.
- **RN-02 SKU imutável:** depois de criado, o SKU não pode ser alterado.
- **RN-03 SKU liberado na exclusão:** ao excluir um produto, seu SKU pode ser reutilizado em um novo produto.
- **RN-04 Nome obrigatório:** não pode ser vazio nem só espaços.
- **RN-05 Preço:** obrigatório, maior que zero, em BRL, com no máximo 2 casas decimais.
- **RN-06 Descrição:** opcional; pode ficar vazia.
- **RN-07 Limites de tamanho:** SKU até 64, nome até 200 e descrição até 5000 caracteres.
- **RN-08 Produto simples:** um produto corresponde a exatamente um SKU; não há variantes, categorias, estoque nem imagens.
- **RN-09 Exclusão:** é definitiva e exige confirmação explícita; não há lixeira, restauração nem status ativo/inativo.
- **RN-10 Listagem:** 20 itens por página, ordenada por criação decrescente com desempate determinístico; página inválida assume a primeira.
- **RN-11 Permissão:** somente o Administrador acessa qualquer operação; demais acessos recebem mensagem de não autorizado.
- **RN-12 Texto seguro:** nome e descrição são tratados como texto puro e nunca executados.

## Experiência do Usuário

- **Persona:** Administrador, que quer manter o catálogo correto com poucos passos.
- **Fluxo de cadastro:** abre o formulário, preenche SKU, nome, descrição e preço, confirma e vê o produto na listagem.
- **Fluxo de correção:** na listagem, abre o produto, edita nome, descrição ou preço e salva.
- **Fluxo de exclusão:** na listagem ou no detalhe, solicita exclusão, lê o aviso de irreversibilidade e confirma ou cancela.
- Mensagens de erro em português (Brasil), indicando o campo com problema. A listagem tem estado vazio informativo.
- Os campos do formulário têm rótulos claros e são acessíveis por teclado.

## Restrições Técnicas de Alto Nível

- Acesso restrito ao Administrador; exige identificação prévia do Administrador (ver Perguntas em Aberto).
- Moeda única: BRL.
- Listagem responsiva com grandes volumes, carregando só a página atual.
- Dados de nome e descrição nunca são executados como código.

## Não-Objetivos (Fora de Escopo)

Decisões do usuário nesta conversa:

- Vitrine pública para clientes, com navegação e consulta do catálogo (ADR-001).
- Variantes de produto; cada versão é um produto separado (ADR-001).
- Categorias e qualquer organização hierárquica (decisão do usuário).
- Estoque e imagens de produto (decisão do usuário: campos limitados a SKU, nome, descrição e preço).
- Busca e filtros na listagem de gestão (decisão do usuário).
- Inativação/reativação e restauração de produtos excluídos (ADR-002).

## Registro de Decisões de Produto

- [ADR-001: Catálogo administrativo com produto simples (1 produto = 1 SKU)](adrs/adr-001.md) — apenas Administrador; produto simples com SKU, nome, descrição e preço.
- [ADR-002: Exclusão definitiva de produtos](adrs/adr-002.md) — exclusão permanente, sem status ativo/inativo.

## Glossário

| Termo | Definição |
|---|---|
| Administrador | Pessoa responsável pela loja que gerencia o catálogo. |
| Produto | Item vendável do catálogo; corresponde a exatamente um SKU. |
| SKU | Código único e imutável que identifica um produto. |
| Catálogo | Conjunto de todos os produtos cadastrados. |
| Exclusão definitiva | Remoção permanente e irreversível de um produto. |
| Variante | Versão de um produto (cor, tamanho); fora de escopo. |
| BRL | Real brasileiro, moeda única dos preços. |

## Perguntas em Aberto

- Como o Administrador é identificado/autenticado? O projeto não tem autenticação; assumiu-se que a identificação existirá, ou que outra funcionalidade a fornecerá.
- Os limites de tamanho (64/200/5000) e a página de 20 itens foram propostos por padrão e aguardam confirmação.
- Vários Administradores podem coexistir, ou há só um?
