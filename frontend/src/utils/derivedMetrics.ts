/** (buildable_area / parcel_area) * 100 */
export function buildablePercentage(buildableArea: number, parcelArea: number): number {
  if (parcelArea <= 0) return 0;
  return (buildableArea / parcelArea) * 100;
}

export function formatAcres(acres: number, decimals = 2): string {
  return `${acres.toFixed(decimals)} ac`;
}
