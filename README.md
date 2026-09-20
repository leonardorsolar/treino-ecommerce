# Catálogo de Produtos

API REST para cadastro, listagem, consulta, edição e exclusão de produtos (Node 24, TypeScript, Express 5, SQLite via better-sqlite3).

## Executando

```bash
npm install
npm run build
npm start          # sobe em http://127.0.0.1:3000 e aplica as migrations no boot
npm run dev        # modo desenvolvimento (tsx watch)
npm run migrate    # aplica as migrations sem subir o servidor
```

Variáveis de ambiente: `PORT` (padrão `3000`), `HOST` (padrão `127.0.0.1`), `DATABASE_PATH` (padrão `./data/catalog.db`), `LOG_LEVEL` (padrão `info`).

## Testes

```bash
npm test           # unitários + integração (SQLite em memória / arquivo temporário)
npm run test:e2e   # compila e sobe o servidor real com banco temporário
```

## Endpoints (`/api/v1`)

| Método e path | Sucesso | Falhas |
|---|---|---|
| `POST /products` `{ sku, name, description?, price }` | `201` | `400 validation_error`, `400 invalid_json`, `409 sku_already_exists` |
| `GET /products?page=N` (20 por página, `id` decrescente) | `200` | — |
| `GET /products/:id` | `200` | `404 product_not_found` |
| `PATCH /products/:id` `{ name?, description?, price? }` | `200` | `400 validation_error`, `404 product_not_found` |
| `DELETE /products/:id` | `204` | `404 product_not_found` |

O preço trafega como string decimal (`"19.90"`) e é guardado em centavos. O SKU é único sem distinção de maiúsculas e imutável. Erros seguem `{ "error": { "code", "message", "details?" } }`.

## Avisos importantes

- **Sem autenticação (ADR-005).** A API não autentica ninguém e o `DELETE` é irreversível. O servidor escuta por padrão apenas em `127.0.0.1`; **não exponha a API em rede** sem antes adicionar autenticação (o ponto de extensão está em `src/App.ts`).
- **Exclusão definitiva (ADR-002).** Reavalie esta decisão quando existir o módulo de pedidos: excluir um produto pode quebrar referências. O `id` inteiro nunca é reutilizado e é o identificador estável para outros módulos.
- **Confirmação de exclusão é da interface (ADR-006).** A API não pede confirmação; quem consumir o `DELETE` deve confirmar com o usuário antes.
- **Backup.** Todo o estado está no arquivo SQLite (`DATABASE_PATH`, padrão `./data/catalog.db`, em modo WAL: copie também `-wal` e `-shm`, ou pare o servidor antes). As migrations não têm rollback; a restauração é feita pelo backup do arquivo.
