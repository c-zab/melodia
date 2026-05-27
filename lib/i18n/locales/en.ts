export const en = {
  common: {
    language: "Language",
    close: "Close",
    help: "Help",
    helpAria: "Help — how Melodia works",
    gotIt: "Got it",
    delete: "Delete",
    done: "Done",
    now: "Now",
    cues: "Cues",
    cue: "cue",
    cuesPlural: "cues",
    unassigned: "Unassigned",
    inStep: "in step",
  },
  brand: {
    logoAlt: "Melodia de Bolivia",
    title: "Melodia",
  },
  header: {
    rehearsalPlayer: "Rehearsal player",
    threeSongMix: "3-song mix",
    chooseMix: "Choose mix",
    loadingMix: "Loading {name}…",
  },
  cues: {
    sectionTitle: "Choreography cues",
    showingSteps: "· showing {visible} of {total} steps",
    emptyBefore: "No markers yet. Tap",
    emptyAfter: "while playing to add one.",
  },
  marker: {
    cue: "Cue",
    note: "Note",
    newMarker: "New marker",
    tapJumpHoldEdit: "Tap to jump ({seconds}s before) · Hold to edit",
    atTimeNote: "{title} at {time}, note",
    titleAtTime: "{title} · {time} (note)",
    titleAtTimeHint: "{title} at {time}. {hint}",
  },
  markerModal: {
    title: "Edit marker",
    jumpTo: "jump to",
    fieldTitle: "Title",
    fieldType: "Type",
    fieldStep: "Step (paso)",
    unclassified: "Unclassified",
    cueEnd: "Cue end (rehearsal sec, optional)",
    cueEndPlaceholder: "Window end — leave empty for a single hit",
    cueEndHint:
      "Same clock as “Rehearsal” above. After start, optional end for a timed segment inside the step.",
    fieldNote: "Note",
    titlePlaceholder: "e.g. Raise hats",
    notePlaceholder: "Add cues, formation notes, reminders…",
  },
  playback: {
    loadingMusic: "Loading music…",
    musicNotReady: "Music not ready",
    loopLast: "Loop last {seconds}s",
    looping: "Looping",
    loopOff: "Loop off",
    loopRange: "Loop {start}–{end}",
    clearLoop: "Clear loop",
    back5: "Back 5 seconds",
    forward5: "Forward 5 seconds",
    pause: "Pause",
    play: "Play",
    addMarker: "Add marker at playhead",
  },
  waveform: {
    gettingReady: "Getting your mix ready…",
    threeSongMix: "3-song mix",
  },
  audioError: {
    title: "Couldn't load this mix",
    hintBefore: "Add your MP3 as",
    hintAfter: ", then switch mix and try again.",
  },
  transition: {
    mixBlocks: "Mix blocks",
    songsTotal: "{count} songs · {total} total",
  },
  timeline: {
    loadAudio: "Load audio to place cues on the waveform…",
  },
  info: {
    aboutTitle: "About Melodia",
    aboutDescription:
      "A simple rehearsal player for dance mixes and choreography notes.",
    danceCategories: "Dance categories",
    mixSelectorHint: "Use the mix selector in the header to switch between them.",
    markers: "Markers",
    markersIntroBefore: "Tap",
    markersIntroAfter:
      "while playing to add a marker at the playhead. Two types:",
    cueIntro:
      "Jump points — tap a cue on the waveform or in the list to jump",
    cueLeadSuffix: "before",
    cueMid: "that moment (so you have time to get ready).",
    cueOutro: "a cue to open the editor.",
    hold: "Hold",
    noteDescription:
      "Documentation — reminders and formation notes at a time; shown for reference, not for jumping playback.",
    playback: "Playback",
    playbackDescription:
      "Play, skip ±5s, loop a section, and scrub the waveform. Cues are grouped by rehearsal step when steps are defined for a mix. A quick tap on a cue starts playback from the lead-in; it does not open the edit screen.",
  },
  dances: {
    morenadaDescription: "3-song mix · song-1, song-2, song-3",
    caporalesDescription: "caporales-julia",
  },
  meta: {
    title: "Melodia — Rehearsal Timeline",
    description:
      "A lightweight choreography timeline editor and rehearsal assistant.",
  },
};

export type Messages = typeof en;
