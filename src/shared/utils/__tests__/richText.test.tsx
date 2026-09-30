import React from 'react';
import { renderTemplateWithBold } from '../richText';

describe('renderTemplateWithBold', () => {
  const bold = { fontWeight: '800' as const };

  test('splits a template into literal strings and bold-styled Text nodes for each substituted token', () => {
    const parts = renderTemplateWithBold(
      'Shop {n} more to get {r} cashback',
      { n: '₹700', r: '₹50' },
      bold,
    );

    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('Shop ');
    expect(React.isValidElement(parts[1])).toBe(true);
    expect((parts[1] as React.ReactElement<any>).props.children).toBe('₹700');
    expect((parts[1] as React.ReactElement<any>).props.style).toBe(bold);
    expect(parts[2]).toBe(' more to get ');
    expect((parts[3] as React.ReactElement<any>).props.children).toBe('₹50');
    expect(parts[4]).toBe(' cashback');
  });

  test('leaves an unmatched token as literal text when no var is supplied', () => {
    const parts = renderTemplateWithBold('Add VIP for {f}', {}, bold);
    expect(parts).toEqual(['Add VIP for ', '{f}']);
  });

  test('a plain template with no tokens returns a single literal string', () => {
    const parts = renderTemplateWithBold('Ready to place your order!', {}, bold);
    expect(parts).toEqual(['Ready to place your order!']);
  });
});
