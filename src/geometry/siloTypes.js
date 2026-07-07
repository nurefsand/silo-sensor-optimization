// Tek kaynak: hem ControlPanel (hangi alanları göstereceğini) hem de
// createSiloGeometry (hangi tipi nasıl kuracağını) burayı referans alır.

export const SILO_TYPES = [
  { value: "cylinder", label: "Silindirik", fields: ["height", "diameter"] },
  { value: "horizontal", label: "Yatay Silindir", fields: ["diameter", "length"] },
  { value: "rect", label: "Dikdörtgen", fields: ["height", "diameter", "length"] },
  { value: "cone_roof", label: "Konik Çatılı", fields: ["height", "diameter", "coneHeight"] },
  { value: "cone_bottom", label: "Konik Tabanlı", fields: ["height", "diameter", "coneHeight"] },
];

export const FIELD_LABELS = {
  height: "Gövde Yüksekliği ",
  diameter: "Çap ",
  length: "Uzunluk ",
  coneHeight: "Koni Yüksekliği ",
};

export const FIELD_RANGES = {
  height: { min: 2, max: 20, step: 0.1 },
  diameter: { min: 1, max: 12, step: 0.1 },
  length: { min: 2, max: 25, step: 0.1 },
  coneHeight: { min: 0.5, max: 8, step: 0.1 },
};

export function getSiloTypeConfig(value) {
  return SILO_TYPES.find((t) => t.value === value) ?? SILO_TYPES[0];
}