// Copied from cogitador-consulta's public/data/catalog/factions.json (no runtime dependency).
export interface FactionInfo {
  id: string
  name: string
  /** Short label for tight spaces (matrix headers), as players usually say it. */
  short: string
}

export const FACTIONS: FactionInfo[] = [
  { id: "adepta-sororitas", name: "Adepta Sororitas", short: "AS" },
  { id: "adeptus-custodes", name: "Adeptus Custodes", short: "AC" },
  { id: "adeptus-mechanicus", name: "Adeptus Mechanicus", short: "AdMech" },
  { id: "adeptus-titanicus", name: "Adeptus Titanicus", short: "Titanicus" },
  { id: "aeldari", name: "Aeldari", short: "Aeldari" },
  { id: "astra-militarum", name: "Astra Militarum", short: "AM" },
  { id: "black-templars", name: "Black Templars", short: "BT" },
  { id: "blood-angels", name: "Blood Angels", short: "BA" },
  { id: "chaos-daemons", name: "Chaos Daemons", short: "CD" },
  { id: "chaos-knights", name: "Chaos Knights", short: "CK" },
  { id: "chaos-space-marines", name: "Chaos Space Marines", short: "CSM" },
  { id: "dark-angels", name: "Dark Angels", short: "DA" },
  { id: "death-guard", name: "Death Guard", short: "DG" },
  { id: "deathwatch", name: "Deathwatch", short: "DW" },
  { id: "drukhari", name: "Drukhari", short: "Drukhari" },
  { id: "emperors-children", name: "Emperor’s Children", short: "EC" },
  { id: "genestealer-cults", name: "Genestealer Cults", short: "GSC" },
  { id: "grey-knights", name: "Grey Knights", short: "GK" },
  { id: "imperial-agents", name: "Imperial Agents", short: "AoI" },
  { id: "imperial-knights", name: "Imperial Knights", short: "IK" },
  { id: "leagues-of-votann", name: "Leagues of Votann", short: "Votann" },
  { id: "necrons", name: "Necrons", short: "Necrons" },
  { id: "orks", name: "Orks", short: "Orks" },
  { id: "space-marines", name: "Space Marines", short: "SM" },
  { id: "space-wolves", name: "Space Wolves", short: "SW" },
  { id: "tau-empire", name: "T’au Empire", short: "T'au" },
  { id: "thousand-sons", name: "Thousand Sons", short: "TS" },
  { id: "tyranids", name: "Tyranids", short: "Tyranids" },
  { id: "world-eaters", name: "World Eaters", short: "WE" },
]

export function factionName(id: string): string {
  return FACTIONS.find((f) => f.id === id)?.name ?? ''
}

export function factionShort(id: string): string {
  return FACTIONS.find((f) => f.id === id)?.short ?? ''
}
