<p align="center">
  <img src="https://github.com/MartinDawgor/VacNet-Toolkit-Extension/blob/main/public/icon.png?raw=true" alt="VACNET Toolkit" width="96">
</p>

<h1 align="center">VACNET Toolkit Extension</h1>

<p align="center">
  VACNET Toolkit turns the CS2 VACNet labeling portal into a focused workspace with the Graphite & Ice theme, Plyr player, presets, keyboard shortcuts, and local clip history.<br>
  Spend less time waiting and repeating actions, and more time reviewing the replay.
</p>

<p align="center">
  <a href="https://github.com/pensiya5/VacNet-Toolkit-Extension/releases"><img alt="Version 4.2.1" src="https://img.shields.io/badge/version-4.2.1-8fb8ff?style=flat-square"></a>
  <a href="https://github.com/MartinDawgor/VacNet-Toolkit-Extension/blob/main/LICENSE"><img alt="GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-356ea8?style=flat-square"></a>
  <img alt="Chromium Manifest V3" src="https://img.shields.io/badge/Chromium-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white">
  <img alt="Firefox 128+" src="https://img.shields.io/badge/Firefox-128%2B-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white">
</p>

<p align="center">
  <a href="https://github.com/pensiya5/VacNet-Toolkit-Extension/releases"><b>Download</b></a> ·
  <a href="https://github.com/MartinDawgor/VacNet-Toolkit-Extension/issues"><b>Report an issue</b></a> ·
  <a href="README.md"><b>Русский</b></a>
</p>

<p align="center">
  <img src="docs/images/review-panel-4.2.0.jpg" alt="VACNET Toolkit 4.2.0 interface: Plyr player and four-category verdict panel" width="100%">
</p>

<p align="center">
  <img src="docs/images/welcome-page-4.2.0.jpg" alt="Updated VACNET welcome page in the Graphite & Ice theme" width="49%">
  <img src="docs/images/invite-page-4.2.0.jpg" alt="VACNET invite creation page in the Graphite & Ice theme; sample link shown" width="49%">
</p>

<p align="center"><sub>Interface examples from version 4.2.0. The invitation link shown is a demo.</sub></p>

## 🚀 Quick start

### New interface (4.2.0)

Graphite & Ice refreshes the portal, verdict panel, history, presets, metrics, welcome page, and invitation page. Graphite surfaces, an ice-blue accent, and restrained glow replace the previous green palette. Plyr code, controls, and styling are preserved.

New reviews have one cheating question; legacy clips retain four independent categories. Answers fill the panel width, with a highlight that slides between options and changes color. Reduced-motion preferences disable the animation. New reviews allow changing an answer before confirmation without pressing Cancel separately; watched-progress restrictions and submission locking remain in place.

History records the verdict and `verdict_tick` when a different task opens in the same tab. Until then, the record is pending for 10 minutes; no history entry is created if there is no next task. Presets are stored separately for each mode. Compatibility was checked against saved pages and local scenarios.

> Active access to the official VACNet labeling portal is required.

1. Download the archive for your browser from [Releases](https://github.com/pensiya5/VacNet-Toolkit-Extension/releases).
2. Extract it into a dedicated folder.
3. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
4. Select the extracted folder and open the VACNet portal.

<details>
<summary><b>Install in Firefox</b></summary>

1. Use Firefox 128 or newer and download the Firefox build.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `manifest.json` from the extracted build.

Temporary add-ons must be loaded again after restarting Firefox. A signed package is required for permanent installation.
</details>

| Browser | Support |
| --- | --- |
| Chrome | Primary Manifest V3 build |
| Edge, Brave, Opera | Current Chromium-based versions |
| Firefox | Dedicated MV3 build, version 128+ |

## Development

Building from source requires Node.js 22.12 or newer and npm.

```sh
npm ci
npm run check
```

`check` runs TypeScript checks, builds for Chrome and Firefox, and validates the permissions, scripts, assets, and translations in both packages.

After adding or removing keys in `public/_locales`, run `npm run generate:i18n` to update the typed translation key list.

| Command | Result |
| --- | --- |
| `npm run dev` | Chrome development with automatic reloads |
| `npm run dev:firefox` | Firefox development |
| `npm run build:all` | Both builds in `.output/chrome-mv3` and `.output/firefox-mv3` |
| `npm run typecheck` | Type checking without a build |
| `npm run zip` | Chrome archive in `.output` |
| `npm run zip:firefox` | Firefox archive in `.output` |

For manual installation, select the corresponding build directory instead of the repository root. The Firefox build uses a separate local ID, `vacnet-toolkit-local@extensions.invalid`, so its settings and history are separate from the published add-on. Use history export and import to transfer records if needed. The local Firefox archive is unsigned.

## What's new in 4.2.1

- Fixed playback stopping again about 250 ms after resuming with a verdict selected.
- The clip history and developer metrics panels now match the right-hand verdict panel at different screen sizes.

## What's new in 4.2.0

Graphite & Ice gives the portal one consistent interface: dark graphite surfaces, a cool blue accent, and a soft glow for available actions. The update covers the review panel, history, presets, metrics, welcome page, and invitation page. Plyr and its controls remain unchanged.

### Two review formats

| Clip type | How to choose a verdict |
| --- | --- |
| New clip | One question: **Cheating**, **Uncertain**, or **No cheating**. Change the answer before confirmation; the site still controls when answers and submission become available. |
| Legacy clip | Four independent categories: **Aim Assist**, **Wall Hack**, **Auto BHop**, and **Bot**. Each offers **Yes**, **Uncertain**, or **No**, with all three choices spanning the panel. |

The active highlight glides between choices and takes on the selected answer's color. When the system requests reduced motion, the transition becomes immediate. Redundant cancel and skip buttons have been removed from the review panel.

### Review tools

- **Plyr player:** speeds from 0.25× to 4×, frame stepping, 2× zoom, volume controls, and a marker when the site supplies a suspicious-event time.
- **Presets:** up to nine saved verdict sets, available with number keys 1–9. Instant submission can be enabled separately for each preset.
- **History:** up to 1,000 tasks, grouped by match. Review earlier verdicts and repeated clips, or import and export history as JSON.
- **Metrics:** diagnostic details about the current clip and player.
- **English and Russian:** the interface follows the browser language.

## Keyboard controls

| Key | Action |
| --- | --- |
| 1–9 | Apply the preset at that position |
| Space | Play or pause the video |
| R | Return to the start of the clip |
| ← / → | Step one frame backward or forward |
| [ / ] | Decrease or increase playback speed |
| Z | Toggle 2× zoom |
| E | Jump to a marked event, when available |
| Enter | Submit or confirm a verdict when the site allows it |
| Esc | Close an open panel |

Shortcuts are inactive while typing, using form controls, viewing a dialog, or submitting a verdict. A preset with instant submission enabled sends its saved answers immediately.

## Privacy and data

- Settings, presets, and history are stored in the browser's local storage.
- The extension has no analytics or telemetry and does not send data to the developer.
- Network requests support the portal's verdict submission, task loading, metadata, and Valve video playback.
- The clipboard is used only after you explicitly click a copy button.

History exports and guest links can contain URLs with access parameters. Do not post them with bug reports or screenshots.

## Important

VACNET Toolkit helps review replays and submit answers chosen by a person. It does not detect cheating on its own. Follow the portal's access rules and do not redistribute review materials.

This project is not affiliated with Valve Corporation. Counter-Strike, Counter-Strike 2, and VACNet are trademarks of Valve Corporation.

## Author and contact

The original project was created by [MartinDawgor](https://github.com/MartinDawgor) and is distributed under the [GPL-3.0 license](https://github.com/MartinDawgor/VacNet-Toolkit-Extension/blob/main/LICENSE). Report issues in the [Issues section](https://github.com/pensiya5/VacNet-Toolkit-Extension/issues). You can support the original author with an optional [CloudTips donation](https://pay.cloudtips.ru/p/f1a3b6c9).

<p align="center"><sub>VACNET Toolkit Extension · 4.2.1</sub></p>
