# `/public/audio/`

Drop your MP3 files here.

By default Melodia loads `song-1.mp3` from this folder:

```
public/audio/song-1.mp3
```

If you want to use a different file, either:

1. Rename your file to `song-1.mp3`, or
2. Edit the default track in `store/useTimelineStore.ts` (the `initialProject.tracks` array).

These files are served as static assets by Next.js, so they're available at
`/audio/<filename>` from the browser.
