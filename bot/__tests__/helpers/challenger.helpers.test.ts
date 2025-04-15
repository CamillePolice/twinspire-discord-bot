import { calculatePrestigePoints } from '../../helpers/challenger.helpers';

describe('calculatePrestigePoints', () => {
  // Test cases for when challenger wins
  describe('when challenger wins', () => {
    test('against higher tier (tier 2 vs tier 3)', () => {
      const result = calculatePrestigePoints(true, 2, 3);
      expect(result).toEqual({
        challengerPrestige: 10,
        defendingPrestige: 3,
      });
    });

    test('against same tier (tier 2 vs tier 2)', () => {
      const result = calculatePrestigePoints(true, 2, 2);
      expect(result).toEqual({
        challengerPrestige: 6,
        defendingPrestige: 2,
      });
    });
  });

  // Test cases for when defender wins
  describe('when defender wins', () => {
    test('against lower tier (tier 2 vs tier 3)', () => {
      const result = calculatePrestigePoints(false, 2, 3);
      expect(result).toEqual({
        challengerPrestige: 3,
        defendingPrestige: 4, // Defender (tier 3) wins against lower tier (tier 2)
      });
    });

    test('against same tier (tier 2 vs tier 2)', () => {
      const result = calculatePrestigePoints(false, 2, 2);
      expect(result).toEqual({
        challengerPrestige: 2,
        defendingPrestige: 6,
      });
    });

    test('against higher tier (tier 2 vs tier 1)', () => {
      // This is your specific case: tier 2 challenger loses to tier 1 defender
      const result = calculatePrestigePoints(false, 2, 1);
      expect(result).toEqual({
        challengerPrestige: 3, // Higher tier team (challenger) loses
        defendingPrestige: 10, // Lower tier team (defender) wins against higher tier
      });
    });
  });

  // Test cases with larger tier differences
  describe('edge cases with different tier differences', () => {
    test('challenger wins with large tier difference (tier 1 vs tier 3)', () => {
      const result = calculatePrestigePoints(true, 1, 3);
      expect(result).toEqual({
        challengerPrestige: 10,
        defendingPrestige: 3,
      });
    });

    test('defender wins with large tier difference (tier 1 vs tier 3)', () => {
      const result = calculatePrestigePoints(false, 1, 3);
      expect(result).toEqual({
        challengerPrestige: 3,
        defendingPrestige: 4, // Defender (tier 3) wins against lower tier (tier 1)
      });
    });

    test('defender wins against much higher tier (tier 3 vs tier 1)', () => {
      const result = calculatePrestigePoints(false, 3, 1);
      expect(result).toEqual({
        challengerPrestige: 3,
        defendingPrestige: 10, // Defender (tier 1) wins against higher tier (tier 3)
      });
    });
  });
});
