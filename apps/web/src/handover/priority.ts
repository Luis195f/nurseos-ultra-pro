export function computePriority({news2=0, invasive=false, falls=false, isolation=false}:{news2?:number;invasive?:boolean;falls?:boolean;isolation?:boolean;}){
  let score = news2;
  if (invasive) score += 2;
  if (falls) score += 1;
  if (isolation) score += 1;
  return score; // mayor = más crítico
}
