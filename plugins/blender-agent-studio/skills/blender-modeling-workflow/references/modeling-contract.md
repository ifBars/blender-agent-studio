# Modeling contract

Write a compact JSON or Markdown contract before substantial modeling:

```json
{
  "asset": "manual tablet press",
  "purpose": "game-ready animated station prop",
  "required_parts": [
    "frame",
    "lever",
    "rack",
    "punch",
    "die",
    "feed shoe",
    "collection tray"
  ],
  "relations": [
    "lever drives rack",
    "rack drives punch",
    "feed shoe remains supported by rails",
    "tablet exits into tray"
  ],
  "style": ["stylized", "worn painted metal"],
  "limits": {
    "triangle_max": 5000,
    "maximum_extent_m": 1.5
  },
  "animation": {
    "required": true,
    "critical_frames": [1, 18, 36, 60, 84, 96]
  },
  "review_questions": [
    "Does every moving part have a readable mechanical connection?",
    "Does the operating sequence communicate material flow?"
  ]
}
```

Use task-specific requirements. Do not require watertightness for a multi-object machine or forbid disconnected components that intentionally articulate.

Separate:

- hard gates: execution, export, required parts, numeric limits;
- measurable quality: topology, dimensions, material coverage, motion continuity;
- perceptual review: style, visual coherence, physical plausibility, polish.
