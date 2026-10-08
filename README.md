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
# 1. API (no repositório arena-brasil-scheduler-api)
docker compose up -d --build
# crie o primeiro admin com scripts/create-admin.sh (veja o README da API)

# 2. Front
npm install
npm run dev        # http://localhost:3000
```

Em desenvolvimento o Vite faz proxy de `/api` para `http://localhost:8080`, então não é preciso
configurar CORS. Em produção, defina `VITE_API_URL` com a URL da API (ex.: `https://api.arena.com`)
e inclua a origem do front em `CORS_ALLOWED_ORIGINS` da API.

```sh
npm run build      # tsc + vite build → dist/
```
