# Scratch Card Generator

CLI scripts for generating scratch card assets (spritesheets, videos, sound effects, container backgrounds).

## Prerequisites

- Node.js >= 22
- Required API keys in `.env` (see [.env.example](.env.example))

---

## CLI Commands

### Extract Alpha

Extract transparent PNG from white + black background images (for spritesheet pipeline).

```bash
npm run extract-alpha -- --white white.png --black black.png --output output.png
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
npm run generate-spritesheet -- --subject "chocolate chip cookie" --action "crumbling" --cols 4 --rows 3 --width 1024 --height 768 --output ./output.png
```

**With custom visual style:**

```bash
npm run generate-spritesheet -- --subject "Dinosaur" --action "walking" --cols 4 --rows 2 --width 512 --height 256 --visual-style "pixel art, 16-bit game style" --output dino.png
```


| Option           | Description                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `--subject`      | Subject of the animation                                                                                                          |
| `--action`       | Animation action                                                                                                                  |
| `--cols`         | Number of columns                                                                                                                 |
| `--rows`         | Number of rows                                                                                                                    |
| `--width`        | Canvas width in pixels                                                                                                            |
| `--height`       | Canvas height in pixels                                                                                                           |
| `--output`       | Output path for transparent PNG                                                                                                   |
| `--visual-style` | Art style for the spritesheet (e.g. "2D flat illustration style", "pixel art", "watercolor"). Default: 2D flat illustration style |


---

### Generate Particle Spritesheet

Generate a **particle spritesheet** (grid of static variants) for confetti/particles in the win overlay (requires `GEMINI_API_KEY`). Each cell is a different static variant of the subject (e.g. many small cookie crumbs), not an animation timeline.

```bash
npm run generate-particle-spritesheet -- --subject "small chocolate chip cookie crumb" --cols 4 --rows 2 --width 512 --height 256 --output ./particles-cookie.png
```

| Option           | Description                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `--subject`      | Subject for each cell (e.g. "small cookie crumb", "coin")                                           |
| `--cols`         | Number of columns                                                                                    |
| `--rows`         | Number of rows                                                                                       |
| `--width`        | Canvas width in pixels                                                                               |
| `--height`       | Canvas height in pixels                                                                              |
| `--output`       | Output path for transparent PNG                                                                      |
| `--visual-style` | Art style for the spritesheet (e.g. "2D flat illustration style", "pixel art", "watercolor"). Optional |


---

### Generate Kling Video

Generate video from text and/or images using Kling 3.0 (requires `KLING_API_KEY`).

**Text-to-video:**

```bash
npm run generate-kling-video -- --prompt "A cat playing piano in a jazz club"
```

**Image-to-video (with start frame):**

```bash
npm run generate-kling-video -- --prompt "Sunset over the ocean" --start-frame ./frame.png --output ./video.mp4
```

**Image-to-video (with start and end frame):**

```bash
npm run generate-kling-video -- --prompt "Morph from A to B" --start-frame ./start.png --end-frame ./end.png
```


| Option          | Description                                             |
| --------------- | ------------------------------------------------------- |
| `--prompt`      | Video description (required)                            |
| `--start-frame` | Start frame image (path or URL). Omit for text-to-video |
| `--end-frame`   | End frame image (path or URL). Optional                 |
| `--duration`    | Duration in seconds (3-15). Default: 5                  |
| `--output`      | Output video path. Default: `./output.mp4`              |


---

### Generate Sound Effect

Generate sound effects from text using Eleven Labs (requires `ELEVENLABS_API_KEY`).

**1s SFX (e.g. game item open):**

```bash
npm run generate-sound-effect -- --prompt "short magical reveal chime" --duration 1 --output open-sfx.mp3
```

**30s looping BGM:**

```bash
npm run generate-sound-effect -- --prompt "calm ambient background loop" --duration 30 --loop --output bgm.mp3
```

**Custom duration:**

```bash
npm run generate-sound-effect -- --prompt "thunder rumbling in the distance" --duration 5 --output thunder.mp3
```


| Option       | Description                                     |
| ------------ | ----------------------------------------------- |
| `--prompt`   | Sound effect description (required)             |
| `--duration` | Duration in seconds (0.5-30). Default: 1        |
| `--loop`     | Generate seamlessly looping sound (for BGM)     |
| `--output`   | Output file path. Default: `./sound-effect.mp3` |


---

### Generate Title Image

Generate a title image for the scratch card header from text using Gemini (requires `GEMINI_API_KEY`).

```bash
npm run generate-title-image -- --text "Happy Holidays" --theme luxury --output holiday-title.png
```

**With optional prompt and colors:**

```bash
npm run generate-title-image -- --text "Win Big" --theme playful --colors "gold and black" --prompt "bold typography" --output win-title.png
```


| Option     | Description                                                 |
| ---------- | ----------------------------------------------------------- |
| `--text`   | Title text to render in the image (required)                |
| `--prompt` | Extra style or description for the image                    |
| `--theme`  | Theme keyword (e.g. luxury, playful). Default: elegant      |
| `--colors` | Color palette (e.g. gold and black). Default: gold and dark |
| `--output` | Output file path. Default: `./title-image.png`              |


---

### Generate Video Background

Generate a looped video background for scratch cards: first a theme image is generated with Gemini, then VEO 3.1 animates it using the same image as first and last frame for a seamless loop (requires `GEMINI_API_KEY`). Image and video use **portrait (9:16)** by default; use `--aspect-ratio 16:9` for landscape.

**Theme + animation (image generated from theme):**

```bash
npm run generate-video-background -- --theme luxury --animation-prompt "subtle golden particles drifting" --output video-background.mp4
```

**With image description:**

```bash
npm run generate-video-background -- --theme underwater --prompt "blue gradient" --animation-prompt "gentle bubbles rising" --duration 8
```

**From existing image (skip image generation):**

```bash
npm run generate-video-background -- --image ./frame.png --animation-prompt "soft light flicker" --output loop.mp4
```


| Option               | Description                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `--theme`            | Theme for the background image (e.g. luxury, underwater). Default: elegant                 |
| `--prompt`           | Extra description for the image (optional)                                                 |
| `--animation-prompt` | Description for video motion (e.g. "subtle clouds drifting"). Default when using `--image` |
| `--duration`         | Video length in seconds: 4, 6, or 8. Default: 6                                            |
| `--aspect-ratio`     | `9:16` (portrait, default) or `16:9` (landscape)                                           |
| `--output`           | Output MP4 path. Default: `./video-background.mp4`                                         |
| `--image`            | Use this image as first and last frame (skip image generation)                             |


---

### Generate Container Image

Generate a subtle background image for game containers. **Solid** is procedural (Sharp only, no API key). **Gradient** and **pattern** use Gemini for high-quality results and require `GEMINI_API_KEY`. Output can be used as `GameContainer` background via `variant="image"` and `backgroundImageUrl`.

**Solid color (no API key):**

```bash
npm run generate-container-image -- --type solid --color "#2d1b4e" --output bg.png
```

**Gradient (requires GEMINI_API_KEY):**

```bash
npm run generate-container-image -- --type gradient --color "#1a1a2e" --color-end "#0f3460" --theme luxury --output gradient.png
```

**Pattern (requires GEMINI_API_KEY):**

```bash
npm run generate-container-image -- --type pattern --pattern dots --theme minimal --color "#1a1a2e" --output pattern.png
```


| Option            | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `--type`          | One of: solid, gradient, pattern (required)                        |
| `--width`         | Width in pixels. Default: 400                                      |
| `--height`        | Height in pixels. Default: 300                                     |
| `--color`         | Primary color (hex, e.g. #1a1a2e). Default: #1a1a2e                |
| `--color-end`     | End color for gradient. Default: #16213e                           |
| `--angle`         | Gradient angle in degrees (linear). Default: 135                   |
| `--pattern`       | For type=pattern: dots, lines, or grid (style hint). Default: dots |
| `--pattern-scale` | Pattern tile size in px (legacy). Default: 24                      |
| `--theme`         | Theme for LLM (e.g. luxury, minimal). For gradient/pattern.        |
| `--prompt`        | Extra prompt for LLM. For gradient/pattern.                        |
| `--output`        | Output file path. Default: ./container-image.png                   |


**API:** `POST /api/container-image` with JSON body `{ "type": "solid" | "gradient" | "pattern", "width?", "height?", "color?", "colorEnd?", "angle?", "pattern?", "patternScale?", "theme?", "prompt?" }` returns the image as PNG. Gradient and pattern require `GEMINI_API_KEY`. When `CONTAINER_IMAGE_DEBUG_OUTPUT_DIR` is set, each generated image is also written there with sequential IDs and logged to `container-image-log.txt`.

---

### Generate Glyph Sheet

Generate a theme-stylized, transparent glyph sheet from a predefined grid of 12 characters (`$`, `,`, `0`–`9`) for compositing prize strings like `$5` or `$1,000`. Requires `GEMINI_API_KEY`. When `GLYPH_SHEET_DEBUG_OUTPUT_DIR` is set, intermediate white/black and final transparent PNGs plus a log are written there.

```bash
npm run generate-glyph-sheet -- --input ./base-font.png --theme "cookie theme: warm browns, cream" --output ./glyph-cookies.png
```

**With optional grid and slice:**

```bash
npm run generate-glyph-sheet -- --input ./base-font.png --theme "dinosaur theme" --output ./out.png --cols 12 --rows 1 --slice
```

| Option     | Description                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `--input`  | Path to the predefined glyph sheet image (12 glyphs: $ , 0–9 on solid background) (required)            |
| `--theme`  | Theme for stylization (e.g. "cookie theme: warm browns, cream") (required)                              |
| `--output` | Output path for the transparent PNG (required)                                                        |
| `--cols`   | Number of columns in the grid. Default: 12                                                            |
| `--rows`   | Number of rows in the grid. Default: 1                                                                |
| `--slice`  | Also write 12 per-glyph PNGs (e.g. `out-00.png` … `out-11.png` in the same directory as `--output`)  |

---

## Environment Variables


| Variable                            | Scripts                                                                                                            | Description                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                    | generate-spritesheet, generate-particle-spritesheet, generate-title-image, generate-video-background, generate-container-image (gradient/pattern), generate-glyph-sheet | Gemini API for image and VEO video generation                                         |
| `KLING_API_KEY`                     | generate-kling-video                                                                                               | Kling 3.0 video generation                                                            |
| `ELEVENLABS_API_KEY`                | generate-sound-effect                                                                                              | Eleven Labs sound effects                                                             |
| `SPRITESHEET_QA_DEBUG_OUTPUT_DIR`   | generate-spritesheet                                                                                               | Optional: debug output for QA attempts                                                |
| `SOUND_EFFECT_DEBUG_OUTPUT_DIR`     | generate-sound-effect                                                                                              | Optional: debug output with sequential IDs                                            |
| `TITLE_IMAGE_DEBUG_OUTPUT_DIR`      | generate-title-image                                                                                               | Optional: debug output (0001-slug.png, …) and title-image-log.txt                     |
| `VIDEO_BACKGROUND_DEBUG_OUTPUT_DIR` | generate-video-background                                                                                          | Optional: debug output (0001-slug.mp4, 0001-slug-frame.png, video-background-log.txt) |
| `CONTAINER_IMAGE_DEBUG_OUTPUT_DIR`  | generate-container-image, POST /api/container-image                                                                | Optional: debug output (0001-slug.png, …) and container-image-log.txt                 |
| `GLYPH_SHEET_DEBUG_OUTPUT_DIR`     | generate-glyph-sheet                                                                                                 | Optional: intermediate white/black and final transparent PNGs and glyph-sheet-log.txt |


### Debug output folders

When the optional `*_DEBUG_OUTPUT_DIR` variables are set (e.g. in `.env`), generated assets are written under that directory with sequential IDs and optional log files. Example layout using defaults from [.env.example](.env.example):

- `./debug/sound-effect/` — `0001-slug.mp3`, … and `sound-effect-log.txt`
- `./debug/title-image/` — `0001-slug.png`, … and `title-image-log.txt`
- `./debug/video-background/` — `0001-slug.mp4`, `0001-slug-frame.png`, … and `video-background-log.txt`
- `./debug/container-image/` — `0001-slug.png`, … and `container-image-log.txt`
- `./debug/spritesheet/` — QA attempt images and `qa-log.txt`
- `./debug/glyph-sheet/` — stylized white, black, transparent PNGs and `glyph-sheet-log.txt`

Create the `./debug` directory (or any custom path) as needed; scripts create the target subdirectory recursively.