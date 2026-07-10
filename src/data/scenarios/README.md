# Scenarios and variants

Each JSON file defines one menu card. Its `variants` array defines the choices
shown in that card's dropdown.

```json
{
  "id": "greek-gift",
  "title": "Find the Greek Gift",
  "description": "Practice the classical bishop sacrifice.",
  "category": "Tactical pattern",
  "variants": [
    {
      "id": "french-structure",
      "label": "French structure",
      "detail": "White to move",
      "playerSide": "w",
      "setup": {
        "pgn": "1. e4 e6 *"
      },
      "temperature": {
        "mode": "argmax"
      },
      "solution": {
        "pgn": "1. e4 e6 2. d4 d5 3. Bxh7+ *",
        "moves": ["7.Bxh7+!", "Kxh7", "8.Ng5+"],
        "explanation": "Remove the king shelter, then bring the knight in with check."
      }
    }
  ]
}
```

Use `setup.pgn` for move playback or `setup.fen` for a synthetic position.
FEN takes precedence if both are present.

`solution` is optional. Its `pgn` drives the walkable solution timeline, while
`moves` is the concise line displayed above the explanation. For a FEN setup,
the solution PGN must include matching `SetUp` and `FEN` headers.

New variants only require another object in the existing JSON file. New
scenario cards require a JSON file and one import in `index.ts`.
