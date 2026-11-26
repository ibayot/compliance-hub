export const roundRating = (value: number): number =>
  Math.floor((value + Number.EPSILON) * 100) / 100;

export const deriveSatisfactionRating = (likert: Array<number | string>): number | null => {
  const numericLikert = likert.filter(
    (value): value is number => typeof value === 'number' && value >= 1 && value <= 5,
  );
  return numericLikert.length > 0
    ? roundRating(numericLikert.reduce((sum, value) => sum + value, 0) / numericLikert.length)
    : null;
};
