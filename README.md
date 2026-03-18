# Scratch Card Generator

CLI scripts for generating scratch card assets (spritesheets, videos, sound effects, container backgrounds). All **visual** generation flows use a single style input, `**--visual-style`**, so you can copy the same creative content from a Creative Director manifest into any CLI. To anchor style to a moodboard (e.g. from `generate-moodboard`), pass `**--reference-image <path>`** to the spritesheet, title-image, container-image, and background CLIs. Config (cols, rows, width, height, duration) comes from flags or pipeline config.

## Prerequisites

- Node.js >= 22
- Required API keys in `.env` (see [.env.example](.env.example))

---

## CLI Commands

All examples below write generated files under `./output/`. Create the directory if needed (e.g. `mkdir output`).

### Extract Alpha

Extract transparent PNG from white + black background images (for spritesheet pipeline).

```bash
npm run extract-alpha -- --white white.png --black black.png --output ./output/alpha.png
```


| Option     | Description                                           |
| ---------- | ----------------------------------------------------- |
| `--white`  | Path to image on white (#FFFFFF) background           |
| `--black`  | Path to identical image on black (#000000) background |
| `--output` | Path for output PNG with transparent background       |


---

### Generate Spritesheet

Generate a spritesheet animation from a text description (requires `GEMINI_API_KEY`). Visual style is controlled via `--visual-style`; omit it to use the default (2D flat illustration).

```bash
npm run generate-spritesheet -- --subject "chocolate chip cookie" --action "crumbling" --cols 4 --rows 3 --width 1024 --height 768 --output ./output/spritesheet.png
```

**With custom visual style:**

```bash
npm run generate-spritesheet -- --subject "Dinosaur" --action "walking" --cols 4 --rows 2 --width 512 --height 256 --visual-style "pixel art, 16-bit game style" --output ./output/dino.png
```


| Option              | Description                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `--subject`         | Subject of the animation                                                                                                          |
| `--action`          | Animation action                                                                                                                  |
| `--cols`            | Number of columns                                                                                                                 |
| `--rows`            | Number of rows                                                                                                                    |
| `--width`           | Canvas width in pixels                                                                                                            |
| `--height`          | Canvas height in pixels                                                                                                           |
| `--output`          | Output path for transparent PNG                                                                                                   |
| `--visual-style`    | Art style for the spritesheet (e.g. "2D flat illustration style", "pixel art", "watercolor"). Default: 2D flat illustration style |
| `--reference-image` | Optional: path to a moodboard/reference image to anchor visual style (e.g. from `generate-moodboard`)                             |


---

### Generate Particle Spritesheet

Generate a **particle spritesheet** (grid of static variants) for confetti/particles in the win overlay (requires `GEMINI_API_KEY`). Each cell is a different static variant of the subject (e.g. many small cookie crumbs), not an animation timeline.

```bash
npm run generate-particle-spritesheet -- --subject "small chocolate chip cookie crumb" --cols 4 --rows 2 --width 512 --height 256 --output ./output/particles-cookie.png
```


| Option              | Description                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `--subject`         | Subject for each cell (e.g. "small cookie crumb", "coin")                                              |
| `--cols`            | Number of columns                                                                                      |
| `--rows`            | Number of rows                                                                                         |
| `--width`           | Canvas width in pixels                                                                                 |
| `--height`          | Canvas height in pixels                                                                                |
| `--output`          | Output path for transparent PNG                                                                        |
| `--visual-style`    | Art style for the spritesheet (e.g. "2D flat illustration style", "pixel art", "watercolor"). Optional |
| `--reference-image` | Optional: path to a moodboard/reference image to anchor visual style                                   |


---

### Generate Kling Video

Generate video from text and/or images using Kling 3.0 (requires `KLING_API_KEY`).

**Text-to-video:**

```bash
npm run generate-kling-video -- --prompt "A cat playing piano in a jazz club"
```

**Image-to-video (with start frame):**

```bash
npm run generate-kling-video -- --prompt "Sunset over the ocean" --start-frame ./frame.png --output ./output/video.mp4
```

**Image-to-video (with start and end frame):**

```bash
npm run generate-kling-video -- --prompt "Morph from A to B" --start-frame ./start.png --end-frame ./end.png --output ./output/morph.mp4
```


| Option          | Description                                             |
| --------------- | ------------------------------------------------------- |
| `--prompt`      | Video description (required)                            |
| `--start-frame` | Start frame image (path or URL). Omit for text-to-video |
| `--end-frame`   | End frame image (path or URL). Optional                 |
| `--duration`    | Duration in seconds (3-15). Default: 5                  |
| `--output`      | Output video path. Default: `./output/output.mp4`       |


---

### Generate Sound Effect

Generate sound effects from text using Eleven Labs (requires `ELEVENLABS_API_KEY`).

**1s SFX (e.g. game item open):**

```bash
npm run generate-sound-effect -- --prompt "short magical reveal chime" --duration 1 --output ./output/open-sfx.mp3
```

**30s looping BGM:**

```bash
npm run generate-sound-effect -- --prompt "calm ambient background loop" --duration 30 --loop --output ./output/bgm.mp3
```

**Custom duration:**

```bash
npm run generate-sound-effect -- --prompt "thunder rumbling in the distance" --duration 5 --output ./output/thunder.mp3
```


| Option       | Description                                            |
| ------------ | ------------------------------------------------------ |
| `--prompt`   | Sound effect description (required)                    |
| `--duration` | Duration in seconds (0.5-30). Default: 1               |
| `--loop`     | Generate seamlessly looping sound (for BGM)            |
| `--output`   | Output file path. Default: `./output/sound-effect.mp3` |


---

### Generate Title Image

Generate a title image for the scratch card header from text using Gemini (requires `GEMINI_API_KEY`). Uses a single style field `--visual-style` (same as Creative Director `titleImage.visualStyle`).

```bash
npm run generate-title-image -- --text "Happy Holidays" --visual-style "luxury, gold and black, elegant" --output ./output/holiday-title.png
```

```bash
npm run generate-title-image -- --text "Win Big" --visual-style "bold typography, gold and dark" --output ./output/win-title.png
```


| Option              | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `--text`            | Title text to render in the image (required)                                  |
| `--visual-style`    | Style description for the image (required). Same as Creative Director output. |
| `--output`          | Output file path. Default: `./title-image.png`                                |
| `--reference-image` | Optional: path to a moodboard/reference image to anchor visual style          |


---

### Generate Win Message Image

Generate a transparent win-message graphic for the win popup from fixed wording ("You Won!") using Gemini (requires `GEMINI_API_KEY`). Uses a single style field `--visual-style` (same as Creative Director `winMessageImage.visualStyle`).

```bash
npm run generate-win-message-image -- --visual-style "luxury typography, gold and black" --output ./output/win-message.png
```

```bash
npm run generate-win-message-image -- --text "You Won!" --visual-style "bold typography, gold and dark" --output ./output/win-message.png
```


| Option              | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `--text`            | Win message text to render in the image (optional). Default: `You Won!`       |
| `--visual-style`    | Style description for the image (required). Same as Creative Director output. |
| `--output`          | Output file path. Default: `./win-message.png`                                |
| `--reference-image` | Optional: path to a moodboard/reference image to anchor visual style          |


---

### Generate Background

Generate a scratch-card background as **image only** or **image + video**. The image is always produced with Gemini using `--visual-style`. With `--mode video`, the script then attempts a looped video via VEO 3.1 using the same image as first and last frame; **if video generation fails** (e.g. VEO not available), the image is still written so you are not left without an asset. Same vocabulary as Creative Director `videoBackground.visualStyle` and `videoBackground.animationPrompt`. Portrait (9:16) by default; use `--aspect-ratio 16:9` for landscape.

**Image only:**

```bash
npm run generate-background -- --mode image --visual-style "luxury, golden particles" --output ./output/background.png
```

**Image + video (fallback to image on VEO failure):**

```bash
npm run generate-background -- --mode video --visual-style "luxury, golden particles" --animation-prompt "subtle golden particles drifting" --output ./output/background.mp4
```

```bash
npm run generate-background -- --visual-style "underwater, blue gradient" --animation-prompt "gentle bubbles rising" --duration 8 --output ./output/underwater.mp4
```

**From existing image (skip image generation; `--mode video` only):**

```bash
npm run generate-background -- --image ./frame.png --animation-prompt "soft light flicker" --output ./output/loop.mp4
```


| Option               | Description                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--mode`             | `image` = PNG only (default output: `./output/background.png`). `video` = image + attempt VEO video; on failure, only the image is written (as `<output-stem>-frame.png`). Default: `video`. |
| `--visual-style`     | Style for the background image (required unless `--image`). Same as Creative Director output.                                                                                                |
| `--animation-prompt` | Description for video motion (required for `--mode video` unless `--image`). Same as Creative Director output.                                                                               |
| `--duration`         | Video length in seconds: 4, 6, or 8. Default: 6                                                                                                                                              |
| `--aspect-ratio`     | `9:16` (portrait, default) or `16:9` (landscape)                                                                                                                                             |
| `--output`           | Output path: for `--mode image` the PNG path; for `--mode video` the MP4 path. Defaults: `./output/background.png` (image) or `./output/background.mp4` (video).                             |
| `--image`            | Use this image as first and last frame (skip image generation). Only used when `--mode video`.                                                                                               |
| `--reference-image`  | Optional: path to a moodboard/reference image to anchor visual style (ignored when `--image` is used).                                                                                       |


---

### Generate Container Image

Generate a subtle background image for game containers. **Solid** is procedural (Sharp only, no API key). **Gradient** and **pattern** use Gemini for high-quality results and require `GEMINI_API_KEY`; style is controlled by a single `--visual-style` (same as Creative Director `containerBackground.visualStyle`). Output can be used as `GameContainer` background via `variant="image"` and `backgroundImageUrl`.

**Solid color (no API key):**

```bash
npm run generate-container-image -- --type solid --color "#2d1b4e" --output ./output/bg.png
```

**Gradient (requires GEMINI_API_KEY):**

```bash
npm run generate-container-image -- --type gradient --color "#1a1a2e" --color-end "#0f3460" --visual-style "luxury, elegant" --output ./output/gradient.png
```

**Pattern (requires GEMINI_API_KEY):**

```bash
npm run generate-container-image -- --type pattern --pattern dots --visual-style "minimal, subtle" --color "#1a1a2e" --output ./output/pattern.png
```


| Option              | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `--type`            | One of: solid, gradient, pattern (required)                                     |
| `--width`           | Width in pixels. Default: 400                                                   |
| `--height`          | Height in pixels. Default: 300                                                  |
| `--color`           | Primary color (hex, e.g. #1a1a2e). Default: #1a1a2e                             |
| `--color-end`       | End color for gradient. Default: #16213e                                        |
| `--angle`           | Gradient angle in degrees (linear). Default: 135                                |
| `--pattern`         | For type=pattern: dots, lines, or grid. Default: dots                           |
| `--pattern-scale`   | Pattern tile size in px (legacy). Default: 24                                   |
| `--visual-style`    | Style for LLM (gradient/pattern). Same as Creative Director output.             |
| `--reference-image` | Optional: path to a moodboard/reference image (used for gradient/pattern only). |
| `--output`          | Output file path. Default: ./output/container-image.png                         |


**API:** `POST /api/container-image` with JSON body `{ "type": "solid" | "gradient" | "pattern", "width?", "height?", "color?", "colorEnd?", "angle?", "pattern?", "patternScale?", "visualStyle?" }` (or `visual_style`) returns the image as PNG. Gradient and pattern require `GEMINI_API_KEY`. When `CONTAINER_IMAGE_DEBUG_OUTPUT_DIR` is set, each generated image is also written there with sequential IDs and logged to `container-image-log.txt`.

---

### Generate Glyph Sheet

Generate a stylized, transparent glyph sheet from a predefined grid of 12 characters (`$`, `,`, `0`–`9`) for compositing prize strings like `$5` or `$1,000`. Requires `GEMINI_API_KEY`. Style is controlled by `--visual-style` (same as Creative Director `glyphSheet.visualStyle`). When `GLYPH_SHEET_DEBUG_OUTPUT_DIR` is set, intermediate white/black and final transparent PNGs plus a log are written there.

```bash
npm run generate-glyph-sheet -- --input ./base-font.png --visual-style "cookie theme: warm browns, cream" --output ./output/glyph-cookies.png
```

**With optional grid and slice:**

```bash
npm run generate-glyph-sheet -- --input ./base-font.png --visual-style "dinosaur theme" --output ./output/glyph-dino.png --cols 12 --rows 1 --slice
```


| Option           | Description                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--input`        | Path to the predefined glyph sheet image (12 glyphs: $ , 0–9 on solid background) (required)                      |
| `--visual-style` | Style for stylization (required). Same as Creative Director output.                                               |
| `--output`       | Output path for the transparent PNG (required)                                                                    |
| `--cols`         | Number of columns in the grid. Default: 12                                                                        |
| `--rows`         | Number of rows in the grid. Default: 1                                                                            |
| `--slice`        | Also write 12 per-glyph PNGs (e.g. `glyph-dino-00.png` … `glyph-dino-11.png` in the same directory as `--output`) |


---

### Generate Moodboard

Generate a **master moodboard** image from a theme description (requires `GEMINI_API_KEY`). This runs Phase 1 of the Creative Director (meta: artStyle, colorPalette, mood) then produces the moodboard. By default the server uses the reference moodboard at `**apps/server/assets/reference-moodboard.png`** (a deconstructed collage) and re-themes it with the meta. Pass `**--source-image <path>`** to use a different reference image for that run. The moodboard is used to anchor visual style when running the full theme pipeline (`generate-theme`); you can also run this script alone to preview or debug the style anchor.

```bash
npm run generate-moodboard -- --theme "cookies" --output ./output/cookies/moodboard.png
```

**Re-theme a reference image (e.g. deconstructed collage):**

```bash
npm run generate-moodboard -- --theme "cookies" --source-image ./my-collage.png --output ./output/cookies/moodboard.png
```

```bash
npm run generate-moodboard -- --theme "retro space arcade"
```

When `MOODBOARD_DEBUG_OUTPUT_DIR` is set, a copy of the moodboard and a log line are written there (e.g. `0001-cookies.png`, `moodboard-log.txt`).


| Option           | Description                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--theme`        | Theme description (required) (e.g. "cookies", "retro space arcade")                                                                 |
| `--output`       | Output file path for the moodboard PNG. Default: `./moodboard.png`                                                                  |
| `--source-image` | Optional: path to a reference image to re-theme into the moodboard (overrides default `apps/server/assets/reference-moodboard.png`) |


---

### Creative Director (theme pipeline)

The Creative Director turns a theme description into a structured manifest and a **moodboard**, then the orchestrator generates all enabled assets using the moodboard as a style reference so visuals stay consistent. The pipeline is **two-step**: (1) meta (art direction) → (2) moodboard image → (3) element descriptions (written to match the moodboard). Technical params (canvas sizes, grid dimensions, enabled/disabled toggles) live in pipeline config; the LLM only decides verbal/creative content (subjects, actions, visualStyle, sounds, etc.).

**Full pipeline (meta → moodboard → elements → manifest + all assets):**

```bash
npm run generate-theme -- --theme "cookies" --output ./output/cookies
```

With a custom reference image as moodboard source:

```bash
npm run generate-theme -- --theme "cookies" --output ./output/cookies --source-image ./my-collage.png
```

This writes `manifest.json`, `moodboard.png`, and all generated assets into the output directory. Each visual asset is generated with the moodboard as reference to reduce style drift. When `--source-image` is omitted, the default reference at `apps/server/assets/reference-moodboard.png` is used; when provided, that image is re-themed with the meta to produce the moodboard.

When `THEME_DEBUG_OUTPUT_DIR` is set, a copy of the manifest and a log line are written there (e.g. `0001-cookies-manifest.json`, `theme-log.txt`).

**Manifest only (for review and edit before generating assets):**

```bash
npm run generate-theme-manifest -- --theme "cookies" --output ./output/cookies/manifest.json
```

Runs the same two-step flow (meta → moodboard → elements) but only writes the manifest; the moodboard is not saved to disk for this command.

When `THEME_MANIFEST_DEBUG_OUTPUT_DIR` is set, a copy of the manifest and a log line are written there (e.g. `0001-cookies-manifest.json`, `theme-manifest-log.txt`).

**Assets from existing manifest:**

```bash
npm run generate-theme-assets -- --manifest ./output/cookies/manifest.json --output ./output/cookies
```

Reads an existing manifest and generates assets. **No moodboard is used** (you would need to have run the full pipeline or provide a moodboard separately for style anchoring).

When `THEME_ASSETS_DEBUG_OUTPUT_DIR` is set, a log line is appended to `theme-assets-log.txt` (timestamp, manifest path, output dir, list of generated files).


| Option           | Description                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--theme`        | Theme description (e.g. "cookies", "retro space arcade")                                                                                                  |
| `--output`       | Output directory (generate-theme, generate-theme-assets) or path to manifest.json (generate-theme-manifest)                                               |
| `--manifest`     | Path to manifest.json (generate-theme-assets only)                                                                                                        |
| `--source-image` | Optional (generate-theme only): path to a reference image to re-theme into the moodboard (overrides default `apps/server/assets/reference-moodboard.png`) |


---

## Environment Variables


| Variable                             | Scripts                                                                                                                                                                                                                        | Description                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                     | generate-spritesheet, generate-particle-spritesheet, generate-title-image, generate-background, generate-container-image (gradient/pattern), generate-glyph-sheet, generate-moodboard, generate-theme, generate-theme-manifest | Gemini API for image, VEO video, and Creative Director (manifest + moodboard)            |
| `KLING_API_KEY`                      | generate-kling-video                                                                                                                                                                                                           | Kling 3.0 video generation                                                               |
| `ELEVENLABS_API_KEY`                 | generate-sound-effect                                                                                                                                                                                                          | Eleven Labs sound effects                                                                |
| `SPRITESHEET_QA_DEBUG_OUTPUT_DIR`    | generate-spritesheet                                                                                                                                                                                                           | Optional: debug output for QA attempts                                                   |
| `SOUND_EFFECT_DEBUG_OUTPUT_DIR`      | generate-sound-effect                                                                                                                                                                                                          | Optional: debug output with sequential IDs                                               |
| `TITLE_IMAGE_DEBUG_OUTPUT_DIR`       | generate-title-image                                                                                                                                                                                                           | Optional: debug output (0001-slug.png, …) and title-image-log.txt                        |
| `WIN_MESSAGE_IMAGE_DEBUG_OUTPUT_DIR` | generate-win-message-image                                                                                                                                                                                                     | Optional: debug output (0001-slug.png, …) and win-message-image-log.txt                  |
| `BACKGROUND_DEBUG_OUTPUT_DIR`        | generate-background                                                                                                                                                                                                            | Optional: debug output (0001-slug-frame.png, optional 0001-slug.mp4, background-log.txt) |
| `CONTAINER_IMAGE_DEBUG_OUTPUT_DIR`   | generate-container-image, POST /api/container-image                                                                                                                                                                            | Optional: debug output (0001-slug.png, …) and container-image-log.txt                    |
| `GLYPH_SHEET_DEBUG_OUTPUT_DIR`       | generate-glyph-sheet                                                                                                                                                                                                           | Optional: intermediate white/black and final transparent PNGs and glyph-sheet-log.txt    |
| `THEME_DEBUG_OUTPUT_DIR`             | generate-theme                                                                                                                                                                                                                 | Optional: copy of manifest (NNNN-slug-manifest.json) and theme-log.txt                   |
| `THEME_MANIFEST_DEBUG_OUTPUT_DIR`    | generate-theme-manifest                                                                                                                                                                                                        | Optional: copy of manifest (NNNN-slug-manifest.json) and theme-manifest-log.txt          |
| `THEME_ASSETS_DEBUG_OUTPUT_DIR`      | generate-theme-assets                                                                                                                                                                                                          | Optional: theme-assets-log.txt (timestamp, manifest path, output dir, asset list)        |
| `MOODBOARD_DEBUG_OUTPUT_DIR`         | generate-moodboard, generate-theme                                                                                                                                                                                             | Optional: moodboard PNGs (0001-slug.png, …) and moodboard-log.txt                        |


### Debug output folders

When the optional `*_DEBUG_OUTPUT_DIR` variables are set (e.g. in `.env`), generated assets are written under that directory with sequential IDs and optional log files. Example layout using defaults from [.env.example](.env.example):

- `./debug/sound-effect/` — `0001-slug.mp3`, … and `sound-effect-log.txt`
- `./debug/title-image/` — `0001-slug.png`, … and `title-image-log.txt`
- `./debug/win-message-image/` — `0001-slug.png`, … and `win-message-image-log.txt`
- `./debug/background/` — `0001-slug-frame.png`, optional `0001-slug.mp4`, … and `background-log.txt`
- `./debug/container-image/` — `0001-slug.png`, … and `container-image-log.txt`
- `./debug/spritesheet/` — QA attempt images and `qa-log.txt`
- `./debug/glyph-sheet/` — stylized white, black, transparent PNGs and `glyph-sheet-log.txt`
- `./debug/theme/` — Creative Director full run: `NNNN-slug-manifest.json`, `theme-log.txt`
- `./debug/theme-manifest/` — Manifest-only run: `NNNN-slug-manifest.json`, `theme-manifest-log.txt`
- `./debug/theme-assets/` — Assets-from-manifest run: `theme-assets-log.txt`
- `./debug/moodboard/` — Moodboard-only run: `0001-slug.png`, … and `moodboard-log.txt`

Create the `./debug` directory (or any custom path) as needed; scripts create the target subdirectory recursively.