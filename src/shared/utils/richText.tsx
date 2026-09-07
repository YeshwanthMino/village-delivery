// src/shared/utils/richText.tsx
//
// Renders a `{token}` template with each substituted value styled as its
// own bold <Text>, so a sentence like "Shop {n} more to get {r} cashback"
// can highlight both amounts without the caller hand-splitting the string.

import React from 'react';
import { Text, TextStyle } from 'react-native';

export function renderTemplateWithBold(
  template: string,
  vars: Record<string, string>,
  boldStyle: TextStyle,
): React.ReactNode[] {
  const parts = template.split(/(\{\w+\})/g);
  return parts
    .filter((part) => part !== '')
    .map((part, index) => {
      const match = part.match(/^\{(\w+)\}$/);
      if (match && vars[match[1]] !== undefined) {
        return (
          <Text key={index} style={boldStyle}>
            {vars[match[1]]}
          </Text>
        );
      }
      return part;
    });
}
