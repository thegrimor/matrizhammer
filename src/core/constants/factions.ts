// Copied from cogitador-consulta's public/data/catalog/factions.json (no runtime dependency).
export interface FactionInfo {
  id: string
  name: string
}

export const FACTIONS: FactionInfo[] = [
  { id: "adepta-sororitas", name: "Adepta Sororitas" },
  { id: "adeptus-custodes", name: "Adeptus Custodes" },
  { id: "adeptus-mechanicus", name: "Adeptus Mechanicus" },
  { id: "adeptus-titanicus", name: "Adeptus Titanicus" },
  { id: "aeldari", name: "Aeldari" },
  { id: "astra-militarum", name: "Astra Militarum" },
  { id: "black-templars", name: "Black Templars" },
  { id: "blood-angels", name: "Blood Angels" },
  { id: "chaos-daemons", name: "Chaos Daemons" },
  { id: "chaos-knights", name: "Chaos Knights" },
  { id: "chaos-space-marines", name: "Chaos Space Marines" },
  { id: "dark-angels", name: "Dark Angels" },
  { id: "death-guard", name: "Death Guard" },
  { id: "deathwatch", name: "Deathwatch" },
  { id: "drukhari", name: "Drukhari" },
  { id: "emperors-children", name: "Emperor’s Children" },
  { id: "genestealer-cults", name: "Genestealer Cults" },
  { id: "grey-knights", name: "Grey Knights" },
  { id: "imperial-agents", name: "Imperial Agents" },
  { id: "imperial-knights", name: "Imperial Knights" },
  { id: "leagues-of-votann", name: "Leagues of Votann" },
  { id: "necrons", name: "Necrons" },
  { id: "orks", name: "Orks" },
  { id: "space-marines", name: "Space Marines" },
  { id: "space-wolves", name: "Space Wolves" },
  { id: "tau-empire", name: "T’au Empire" },
  { id: "thousand-sons", name: "Thousand Sons" },
  { id: "tyranids", name: "Tyranids" },
  { id: "world-eaters", name: "World Eaters" },
]

export function factionName(id: string): string {
  return FACTIONS.find((f) => f.id === id)?.name ?? ''
}

