import React from 'react';

export function EmojiFlag({ emoji, size = 16, style = {} }) {
  if (!emoji || emoji === "🏳️") {
    return <span style={{ fontSize: size, ...style }}>🏳️</span>;
  }

  // Convert Regional Indicator symbols to lowercase ascii
  let code = "";
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) {
      code += String.fromCharCode(cp - 0x1f1e6 + 97);
    }
  }

  if (code.length === 2) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${code}.png`}
        width={size * 1.3}
        height={size}
        style={{
          objectFit: "contain",
          verticalAlign: "middle",
          borderRadius: 2,
          display: "inline-block",
          ...style
        }}
        alt={emoji}
      />
    );
  }

  // Fallback to text if it's not a standard country flag emoji
  return <span style={{ fontSize: size, ...style }}>{emoji}</span>;
}
