export type DanceCategoryId = "morenada" | "caporales";

export const DANCE_MIX_GROUPS: Array<{
  id: DanceCategoryId;
  label: string;
  description: string;
}> = [
  {
    id: "morenada",
    label: "Morenada",
    description: "3-song mix · song-1, song-2, song-3",
  },
  {
    id: "caporales",
    label: "Caporales",
    description: "Single song · caporales-julia",
  },
];

export function inferDanceCategory(item: {
  id?: string;
  category?: DanceCategoryId;
}): DanceCategoryId {
  if (item.category === "morenada" || item.category === "caporales") {
    return item.category;
  }
  const id = item.id ?? "";
  if (id.includes("caporales")) return "caporales";
  if (id.includes("morenada")) return "morenada";
  return "morenada";
}

export function categoryLabel(category: DanceCategoryId): string {
  return DANCE_MIX_GROUPS.find((g) => g.id === category)?.label ?? category;
}
