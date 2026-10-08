# Arena Brasil · Gestão

Painel administrativo (desktop) da Arena Brasil, sobre a
[arena-brasil-scheduler-api](../arena-brasil-scheduler-api). React 18 + Vite + TypeScript + Tailwind v4,
com a identidade visual do app de reservas (`apresentacao-arena-icara`).

Funcionalidades:

- **Agenda** (somente consulta): ocupação por dia (todas as quadras) ou por semana (uma quadra),
  com o nome do mensalista em cada horário ocupado.
- **Mensalistas**: cadastro, edição da grade semanal, encerramento e reativação.
- **Quadras**: cadastro, edição de tipo/preço, desativação e reativação.
- **Horários**: horário de funcionamento semanal da arena.

O painel não cadastra administradores nem faz reservas.

## Rodando

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # tsc + vite build → dist/
```

### Qual API o painel usa

| `VITE_API_URL` | API usada |
|---|---|
| não definida (padrão) | produção: `https://arena-brasil-scheduler-api-production.up.railway.app` |
| `""` (vazia) | mesma origem: em dev, o Vite repassa `/api` para a API local em `http://localhost:8080` |
| qualquer URL | essa URL |

Por padrão, inclusive no `npm run dev`, o navegador chama a API de produção direto, então a origem
do front (ex.: `http://localhost:3000`) precisa estar em `CORS_ALLOWED_ORIGINS` da API.

Para desenvolver contra a API local:

```sh
# no repositório arena-brasil-scheduler-api
docker compose up -d --build
# crie o primeiro admin com scripts/create-admin.sh (veja o README da API)

# neste repositório
VITE_API_URL= npm run dev
```
