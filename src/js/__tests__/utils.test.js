import {
  clamp,
  lerp,
  calculatePageHue,
  calculateProgress,
  calculateRotation,
  calculateOpacity,
  calculateBlur,
  shouldSnap,
  getSnapTarget,
} from '../utils';

describe('Utility Functions', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(0, 100, 0)).toBe(0);
      expect(lerp(0, 100, 1)).toBe(100);
    });
  });

  describe('calculatePageHue', () => {
    it('should calculate correct hue values', () => {
      expect(calculatePageHue(0)).toBe(210);
      expect(calculatePageHue(1)).toBeGreaterThan(210);
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress within bounds', () => {
      expect(calculateProgress(100, 0)).toBeGreaterThanOrEqual(0);
      expect(calculateProgress(100, 0)).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateRotation', () => {
    it('should calculate rotation based on progress', () => {
      expect(calculateRotation(0)).toBeCloseTo(0);
      expect(calculateRotation(1)).toBe(-300);
    });
  });

  describe('calculateOpacity', () => {
    it('should handle opacity transitions', () => {
      expect(calculateOpacity(0)).toBe(1);
      expect(calculateOpacity(270)).toBe(0);
    });
  });

  describe('calculateBlur', () => {
    it('should handle blur transitions', () => {
      expect(calculateBlur(0)).toBe(0);
      expect(calculateBlur(270)).toBe(10);
    });
  });

  describe('shouldSnap', () => {
    it('should determine if page should snap', () => {
      expect(shouldSnap(0)).toBe(false);
      expect(shouldSnap(180)).toBe(true);
    });
  });

  describe('getSnapTarget', () => {
    it('should return correct snap target', () => {
      expect(getSnapTarget(0)).toBe(0);
      expect(getSnapTarget(180)).toBe(-300);
    });
  });
});
