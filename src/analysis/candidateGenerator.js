import { getFlatRoofZone, getConeRoofZone, getHorizontalZone } from "../geometry/PlacementZones";

export function generateCandidates(siloType, dims, box) {
  if (!box) return [];

  // Nokta yoğunluğunu (density) artırıyoruz: 
  // ringCount (iç içe halka sayısı) ve angularSteps (açısal dilim sayısı)
  switch (siloType) {
    case "cylinder":
    case "cone_bottom":
    case "rect":
      // 6 halka, 16 açısal dilim = 97 adet aday nokta
      return getFlatRoofZone(box, 6, 16);

    case "cone_roof":
    case "cone_top_flat_bottom":
      // Konik çatı üzerinde 6 halka, 16 dilim
      return getConeRoofZone(box, dims.coneHeight || 2, 6, 16);

    case "horizontal":
      // Yatay silindir için uzunlamasına 12 adım, açısal 9 adım = 108 aday nokta
      return getHorizontalZone(box, 12, 9);

    default:
      return getFlatRoofZone(box, 6, 16);
  }
}