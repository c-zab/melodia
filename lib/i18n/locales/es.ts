import type { Messages } from "./en";

export const es: Messages = {
  common: {
    language: "Idioma",
    close: "Cerrar",
    help: "Ayuda",
    helpAria: "Ayuda — cómo funciona Melodia",
    gotIt: "Entendido",
    delete: "Eliminar",
    done: "Listo",
    now: "Ahora",
    cues: "Señales",
    cue: "señal",
    cuesPlural: "señales",
    unassigned: "Sin asignar",
    inStep: "en el paso",
  },
  brand: {
    logoAlt: "Melodia de Bolivia",
    title: "Melodia",
  },
  header: {
    rehearsalPlayer: "Reproductor de ensayo",
    threeSongMix: "mix de 3 canciones",
    chooseMix: "Elegir mix",
    loadingMix: "Cargando {name}…",
  },
  cues: {
    sectionTitle: "Señales de coreografía",
    showingSteps: "· mostrando {visible} de {total} pasos",
    emptyBefore: "Aún no hay marcadores. Toca",
    emptyAfter: "mientras reproduce para añadir uno.",
  },
  marker: {
    cue: "Señal",
    note: "Nota",
    newMarker: "Nuevo marcador",
    tapJumpHoldEdit:
      "Toca para saltar ({seconds}s antes) · Mantén para editar",
    atTimeNote: "{title} a las {time}, nota",
    titleAtTime: "{title} · {time} (nota)",
    titleAtTimeHint: "{title} a las {time}. {hint}",
  },
  markerModal: {
    title: "Editar marcador",
    jumpTo: "ir a",
    fieldTitle: "Título",
    fieldType: "Tipo",
    fieldStep: "Paso",
    unclassified: "Sin clasificar",
    cueEnd: "Fin de señal (seg. de ensayo, opcional)",
    cueEndPlaceholder: "Fin de ventana — dejar vacío para un solo punto",
    cueEndHint:
      "Mismo reloj que “Ensayo” arriba. Tras el inicio, fin opcional para un segmento con duración dentro del paso.",
    fieldNote: "Nota",
    titlePlaceholder: "p. ej. Levantar sombreros",
    notePlaceholder: "Añade señales, notas de formación, recordatorios…",
  },
  playback: {
    loadingMusic: "Cargando música…",
    musicNotReady: "Música no lista",
    loopLast: "Repetir últimos {seconds}s",
    looping: "En bucle",
    loopOff: "Bucle desactivado",
    loopRange: "Bucle {start}–{end}",
    clearLoop: "Quitar bucle",
    back5: "Retroceder 5 segundos",
    forward5: "Avanzar 5 segundos",
    pause: "Pausa",
    play: "Reproducir",
    addMarker: "Añadir marcador en la posición actual",
  },
  waveform: {
    gettingReady: "Preparando tu mix…",
    threeSongMix: "mix de 3 canciones",
  },
  audioError: {
    title: "No se pudo cargar este mix",
    hintBefore: "Añade tu MP3 como",
    hintAfter: ", cambia de mix e inténtalo de nuevo.",
  },
  transition: {
    mixBlocks: "Bloques del mix",
    songsTotal: "{count} canciones · {total} en total",
  },
  timeline: {
    loadAudio: "Carga el audio para colocar señales en la forma de onda…",
  },
  info: {
    aboutTitle: "Acerca de Melodia",
    aboutDescription:
      "Un reproductor sencillo de ensayo para mixes de baile y notas de coreografía.",
    danceCategories: "Categorías de danza",
    mixSelectorHint:
      "Usa el selector de mix en la cabecera para cambiar entre ellas.",
    markers: "Marcadores",
    markersIntroBefore: "Toca",
    markersIntroAfter:
      "mientras reproduce para añadir un marcador en la posición actual. Dos tipos:",
    cueIntro:
      "Puntos de salto — toca una señal en la forma de onda o en la lista para saltar",
    cueLeadSuffix: "antes",
    cueMid: "ese momento (para tener tiempo de prepararte).",
    cueOutro: "una señal para abrir el editor.",
    hold: "Mantén",
    noteDescription:
      "Documentación — recordatorios y notas de formación en un momento; solo referencia, no salta la reproducción.",
    playback: "Reproducción",
    playbackDescription:
      "Reproduce, salta ±5 s, repite un tramo y desplázate en la forma de onda. Las señales se agrupan por paso de ensayo cuando el mix tiene pasos definidos. Un toque rápido en una señal inicia la reproducción con el adelanto; no abre la pantalla de edición.",
  },
  dances: {
    morenadaDescription: "Mix de 3 canciones · song-1, song-2, song-3",
    caporalesDescription: "caporales-julia",
  },
  meta: {
    title: "Melodia — Línea de tiempo de ensayo",
    description:
      "Editor ligero de línea de tiempo de coreografía y asistente de ensayo.",
  },
};
