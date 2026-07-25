import { rupees, toUnits, UNITS_PER_RUPEE } from '../currency';

describe('currency', () => {
  test('rupees renders internal units as a rupee string', () => {
    expect(rupees(1)).toBe('₹20');
    expect(rupees(45)).toBe('₹900');
  });

  test('rupees rounds to whole rupees', () => {
    expect(rupees(1.234)).toBe('₹25'); // 24.68 -> 25
  });

  test('rupees handles zero', () => {
    expect(rupees(0)).toBe('₹0');
  });

  test('toUnits and rupees round-trip a rupee amount', () => {
    expect(rupees(toUnits(900))).toBe('₹900');
    expect(rupees(toUnits(45))).toBe('₹45');
  });

  test('UNITS_PER_RUPEE is the single source of the factor', () => {
    expect(rupees(1)).toBe(`₹${UNITS_PER_RUPEE}`);
  });
});
