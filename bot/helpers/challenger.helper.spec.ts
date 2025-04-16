import { calculatePrestigePoints } from './challenger.helpers';

describe('calculatePrestigePoints', () => {
  // Scenario 1: Challenger is higher tier (lower number) than defender
  it('should award 4 points to challenger and 3 points to defender when challenger is higher tier and wins', () => {
    const result = calculatePrestigePoints(true, 1, 3); // Challenger tier 1, Defender tier 3
    expect(result).toEqual({ challengerPoints: 4, defenderPoints: 3 });
  });

  it('should award 1 point to challenger and 10 points to defender when challenger is higher tier and loses', () => {
    const result = calculatePrestigePoints(false, 1, 3); // Challenger tier 1, Defender tier 3
    expect(result).toEqual({ challengerPoints: 1, defenderPoints: 10 });
  });

  // Scenario 2: Defender is higher tier (lower number) than challenger
  it('should award 10 points to challenger and 1 point to defender when defender is higher tier and challenger wins', () => {
    const result = calculatePrestigePoints(true, 3, 1); // Challenger tier 3, Defender tier 1
    expect(result).toEqual({ challengerPoints: 10, defenderPoints: 1 });
  });

  it('should award 3 points to challenger and 4 points to defender when defender is higher tier and challenger loses', () => {
    const result = calculatePrestigePoints(false, 3, 1); // Challenger tier 3, Defender tier 1
    expect(result).toEqual({ challengerPoints: 3, defenderPoints: 4 });
  });

  // Scenario 3: Both challenger and defender are same tier
  it('should award 6 points to challenger and 2 points to defender when same tier and challenger wins', () => {
    const result = calculatePrestigePoints(true, 2, 2); // Both tier 2
    expect(result).toEqual({ challengerPoints: 6, defenderPoints: 2 });
  });

  it('should award 2 points to challenger and 6 points to defender when same tier and challenger loses', () => {
    const result = calculatePrestigePoints(false, 2, 2); // Both tier 2
    expect(result).toEqual({ challengerPoints: 2, defenderPoints: 6 });
  });

  // Edge cases
  it('should handle very high tier differences correctly', () => {
    const result = calculatePrestigePoints(true, 1, 10); // Extreme tier difference
    expect(result).toEqual({ challengerPoints: 4, defenderPoints: 3 });
  });

  it('should handle negative tier values correctly', () => {
    const result = calculatePrestigePoints(false, -1, -3); // Challenger tier -1, Defender tier -3
    expect(result).toEqual({ challengerPoints: 3, defenderPoints: 4 });
  });

  it('should handle zero tier values correctly', () => {
    // Assuming tier 0 is valid in your system
    const result = calculatePrestigePoints(true, 0, 0); // Same tier
    expect(result).toEqual({ challengerPoints: 6, defenderPoints: 2 });
  });
});
