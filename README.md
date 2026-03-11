# Scratch Card Generator

CLI scripts for generating scratch card assets (spritesheets, videos, sound effects).

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

| Option        | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| `--white`     | Path to image on white (#FFFFFF) background                  |
| `--black`     | Path to identical image on black (#000000) background        |
| `--output`    | Path for output PNG with transparent background              |

---

### Generate Spritesheet

Generate a spritesheet animation from a text description (requires `GEMINI_API_KEY`).

```bash
npm run generate-spritesheet -- --subject "chocolate chip cookie" --action "crumbling" --cols 4 --rows 3 --width 1024 --height 768 --output ./output.png
```

| Option      | Description                    |
| ----------- | ------------------------------ |
| `--subject` | Subject of the animation       |
| `--action`  | Animation action               |
| `--cols`    | Number of columns              |
| `--rows`    | Number of rows                 |
| `--width`   | Canvas width in pixels         |
| `--height`  | Canvas height in pixels        |
| `--output`  | Output path for transparent PNG |

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

| Option           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `--prompt`       | Video description (required)                     |
| `--start-frame`  | Start frame image (path or URL). Omit for text-to-video |
| `--end-frame`    | End frame image (path or URL). Optional          |
| `--duration`     | Duration in seconds (3-15). Default: 5          |
| `--output`       | Output video path. Default: `./output.mp4`        |

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

| Option        | Description                                      |
| ------------- | ------------------------------------------------ |
| `--prompt`    | Sound effect description (required)              |
| `--duration`  | Duration in seconds (0.5-30). Default: 1        |
| `--loop`      | Generate seamlessly looping sound (for BGM)      |
| `--output`    | Output file path. Default: `./sound-effect.mp3`  |

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

| Option      | Description                                                       |
| ----------- | ------------------------------------------------------------------ |
| `--text`    | Title text to render in the image (required)                        |
| `--prompt`  | Extra style or description for the image                            |
| `--theme`   | Theme keyword (e.g. luxury, playful). Default: elegant              |
| `--colors`  | Color palette (e.g. gold and black). Default: gold and dark        |
| `--output`  | Output file path. Default: `./title-image.png`                     |

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

| Option               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `--theme`            | Theme for the background image (e.g. luxury, underwater). Default: elegant |
| `--prompt`           | Extra description for the image (optional)                        |
| `--animation-prompt` | Description for video motion (e.g. "subtle clouds drifting"). Default when using `--image` |
| `--duration`         | Video length in seconds: 4, 6, or 8. Default: 6                  |
| `--aspect-ratio`     | `9:16` (portrait, default) or `16:9` (landscape)                  |
| `--output`           | Output MP4 path. Default: `./video-background.mp4`                |
| `--image`            | Use this image as first and last frame (skip image generation)    |

---

## Environment Variables

| Variable                     | Scripts                      | Description                                |
| ---------------------------- | ---------------------------- | ------------------------------------------ |
| `GEMINI_API_KEY`             | generate-spritesheet, generate-title-image, generate-video-background | Gemini API for image and VEO video generation |
| `KLING_API_KEY`              | generate-kling-video         | Kling 3.0 video generation                 |
| `ELEVENLABS_API_KEY`         | generate-sound-effect        | Eleven Labs sound effects                  |
| `SPRITESHEET_QA_DEBUG_OUTPUT_DIR` | generate-spritesheet  | Optional: debug output for QA attempts     |
| `SOUND_EFFECT_DEBUG_OUTPUT_DIR`   | generate-sound-effect  | Optional: debug output with sequential IDs |
| `TITLE_IMAGE_DEBUG_OUTPUT_DIR`    | generate-title-image   | Optional: debug output (0001-slug.png, …) and title-image-log.txt |
| `VIDEO_BACKGROUND_DEBUG_OUTPUT_DIR` | generate-video-background | Optional: debug output (0001-slug.mp4, 0001-slug-frame.png, video-background-log.txt) |
