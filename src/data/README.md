# Opening data

`openings.json` is generated from the CC0
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)
ECO tables.

Regenerate it after downloading `a.tsv` through `e.tsv` into one directory:

```bash
npm run build:openings -- /path/to/chess-openings
```
