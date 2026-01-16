export const calculateWeight = (tm: number, percentage: number): number => {
  const raw = tm * percentage;
  // Round to nearest 2.5kg as per CSV instruction
  return Math.round(raw / 2.5) * 2.5;
};

export const calculateTM = (oneRM: number, ratio: number = 0.9): number => {
  return oneRM * ratio;
};

// E1RM = weight * (1 + reps/30) - Common Wendler formula
export const calculateE1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};
