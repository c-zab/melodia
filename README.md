# Melodia

A lightweight choreography timeline editor and rehearsal assistant for dance
groups, designed mobile-first.

Melodia is **not** a DAW. It's a simple, visual rehearsal tool — load a song,
mark choreography cues on the timeline, loop a tricky section, rehearse from
your phone.

## Features (MVP)

- Waveform playback with [wavesurfer.js](https://wavesurfer.xyz/)
- Tap / drag the timeline to seek
- Markers above the waveform (`comment`, `action`, `flag`) with title + note
- Loop regions you can drag, resize, toggle, and clear
- Sticky playback controls on mobile
- Dark, modern UI built with Tailwind CSS

## Tech

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- wavesurfer.js + regions/timeline plugins
- Zustand (state)
- Radix UI Dialog (marker modal)
- lucide-react (icons)

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### Add your audio

Place an MP3 at `public/audio/song-1.mp3` and refresh the page.
See `public/audio/README.md` for details.

## Project structure

```
app/
  page.tsx          # main rehearsal screen
  layout.tsx        # html + fonts + dark theme
  globals.css
components/
  WaveformPlayer.tsx
  TimelineMarkers.tsx
  MarkerModal.tsx
  PlaybackControls.tsx
store/
  useTimelineStore.ts
lib/
  wavesurfer.ts
public/
  audio/
```
