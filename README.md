# AI Cartoon Generator

An end-to-end AI cartoon and animation pipeline combining **Google Gemini** for animated storytelling / script generation and **Remotion** (React) for programmatic vector video rendering.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Generating Animation Scripts](#generating-animation-scripts)
  - [CLI Options](#cli-options)
  - [Programmatic API](#programmatic-api)
- [Animation Studio (Remotion)](#animation-studio-remotion)
  - [Studio Scenes](#studio-scenes)
  - [Preview in Browser](#preview-in-browser)
  - [Render Video (MP4)](#render-video-mp4)
  - [Typecheck & Build](#typecheck--build)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The AI Cartoon Generator helps you produce animated video shorts (such as "What If..." explainer series) from prompt to finished animation:
1. **Script & Storyboard Generator (`generate.js`)**: Leverages the Google Gemini API to produce high-retention cartoon scripts with timed scenes, narration, sound effects, and animator notes.
2. **Animation Studio (`studio/`)**: A React + Remotion environment with procedurally animated vector characters and scenes (`DeskScene`, `StaircaseScene`, `CitySkylineScene`, and `ObservatoryScene`).

---

## Architecture & Directory Structure

```
.
├── cartoon_script.json         # Sample generated script payload
├── generate.js                 # Gemini script generation script & module
├── package.json                # Root package configuration & workflow scripts
├── studio/                     # Remotion animation studio workspace
│   ├── package.json            # Remotion studio dependencies
│   ├── remotion.config.ts      # Remotion output & rendering configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── src/
│       ├── Character.tsx       # Procedural SVG character component (breathe, panic, expressions)
│       ├── CitySkylineScene.tsx# Scene 3: Skyline and temporal rift animation
│       ├── DeskScene.tsx       # Scene 1: Anomaly discovery at computer console
│       ├── MainSequence.tsx    # Video composition sequencing all scenes
│       ├── ObservatoryScene.tsx# Scene 4: Control room desync emergency
│       ├── Root.tsx            # Remotion Composition root
│       ├── StaircaseScene.tsx  # Scene 2: Floating gravity anomaly hallway
│       └── index.ts            # Remotion entry point
├── test/
│   └── generate.test.js        # Automated unit tests for script generation
└── what-if-moon.mp4            # Sample rendered animation output
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Google Generative AI API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/).

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aagaman-karki/-ai-cartoon-generator.git
   cd -ai-cartoon-generator
   ```

2. **Install studio dependencies:**
   ```bash
   cd studio
   npm install
   cd ..
   ```

3. **Configure your API key:**
   Create a `.env` file in the root directory:
   ```bash
   GOOGLE_GENERATIVE_API_KEY=your_gemini_api_key_here
   ```
   Or export it in your environment:
   ```bash
   export GOOGLE_GENERATIVE_API_KEY="your_gemini_api_key_here"
   ```

---

## Configuration

| Environment Variable | Description | Default |
| :--- | :--- | :--- |
| `GOOGLE_GENERATIVE_API_KEY` | Google Gemini API key | *(Required)* |
| `GEMINI_MODEL` | Google Gemini model identifier | `gemini-1.5-flash` |

---

## Generating Animation Scripts

Generate an animation script and visual storyboard using Google Gemini:

```bash
# Using environment variable
npm run generate

# Or specify custom options
node generate.js --prompt="What if gravity stopped working for 10 seconds?" --output=gravity_script.json
```

### CLI Options

| Flag | Description | Example |
| :--- | :--- | :--- |
| `--key=<KEY>` | Pass Gemini API key directly | `--key=AIzaSy...` |
| `--model=<MODEL>` | Override Gemini model name | `--model=gemini-1.5-pro` |
| `--output=<PATH>` | Save generated JSON response to file | `--output=my_script.json` |
| `--prompt=<TEXT>` | Custom prompt for the animation script | `--prompt="What if the sun turned blue?"` |
| `-h, --help` | Display CLI help and instructions | `node generate.js --help` |

### Programmatic API

You can also import the generator into other Node.js scripts:

```javascript
const { generateCartoonScript } = require('./generate');

async function main() {
  const script = await generateCartoonScript({
    prompt: "Write a 15-second What If episode about oceans turning to soda.",
    outputPath: "./soda_script.json"
  });
  console.log("Generated:", script);
}

main();
```

---

## Animation Studio (Remotion)

The `studio/` directory houses the video compositions rendered using React and Remotion.

### Studio Scenes

- **`DeskScene`** (0 - 400 frames): Scientist at computer discovering anomalous lunar readings.
- **`StaircaseScene`** (400 - 800 frames): Anomaly hallway exhibiting zero-gravity floating effects.
- **`CitySkylineScene`** (800 - 1200 frames): City skyline with temporal sky rifts and glitching reality.
- **`ObservatoryScene`** (1200 - 1600 frames): Observatory flashing red override alerts and desynchronization warnings.

### Preview in Browser

Launch the interactive Remotion Studio to preview animations live with timeline controls:

```bash
npm run studio:start
# or: cd studio && npm run start
```
The studio will open at `http://localhost:3000`.

### Render Video (MP4)

Render the full composition to an MP4 video:

```bash
npm run studio:render
# or: cd studio && npm run render
```
The output file will be written to `studio/out/video.mp4`.

### Typecheck & Build

Ensure TypeScript types are correct and bundle Remotion assets:

```bash
# Typecheck React/Remotion code
npm --prefix studio run typecheck

# Bundle Remotion composition
npm run studio:build
```

---

## Testing

Run unit tests for script generation and TypeScript verification:

```bash
npm test
```

This runs:
1. `node test/generate.test.js`: Validates API key enforcement, prompt formatting, and error handling.
2. `tsc --noEmit` in `studio`: Verifies all React and Remotion TypeScript components compile cleanly.

---

## Contributing

1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
