# `/public/audio/`

Melodia has **two mix categories** in the dropdown:

## Morenada (one mix, three MP3s)

`song-1.mp3`, `song-2.mp3`, and `song-3.mp3` play **in sequence** on one rehearsal timeline (with in/out windows per block). Use the **Mix blocks** strip to jump between songs.

| File | Block |
|------|--------|
| `song-1.mp3` | Song 1 (0:00–2:09) |
| `song-2.mp3` | Song 2 (1:00–2:11) |
| `song-3.mp3` | Song 3 (0:50–3:00) |

## Caporales (one song)

| File | In the app |
|------|------------|
| `caporales-julia.mp3` | **Caporales** — full file playback |

Configure mixes in `initialMixes` inside `store/useTimelineStore.ts`.
