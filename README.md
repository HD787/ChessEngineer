# Chess Engineer Web UI

Next.js chess training UI for playing against a local Python checkpoint server.

## Run

Start the model websocket server from the repo root:

```bash
human-chess-serve-ws \
  --checkpoint-dir checkpoints/tournament-best-models \
  --host 127.0.0.1 \
  --port 8787
```

Start the UI:

```bash
npm install
npm run dev
```

Open http://localhost:3001.
