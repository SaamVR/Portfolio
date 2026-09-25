const clamp01=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));

export const DETAIL_STEPS=['cushion','headband','controls'];

export function detailStepForProgress(progress){
  const p=clamp01(progress);
  if(p<.34) return 'cushion';
  if(p<.68) return 'headband';
  return 'controls';
}

export function detailProgressForStep(step){
  return {
    cushion:.24,
    headband:.52,
    controls:.78
  }[step] ?? .24;
}
