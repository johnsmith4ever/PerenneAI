/**
 * Converts raw LaTeX math/chemistry notation into clean, human-readable Unicode text.
 * Prevents raw LaTeX syntax like `\[ \text{6CO}_2... \]` from displaying to students.
 */
export function formatReadableMathAndLatex(text: string): string {
  if (!text || typeof text !== "string") return text || "";

  // If the text is JSON, do not modify it so keys and syntax remain valid
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return text;
  }

  const subMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  };

  const supMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "n": "ⁿ", "i": "ⁱ", "x": "ˣ", "y": "ʸ"
  };

  let s = text;

  // 1. Unwrap display and inline math blocks: \[ ... \], \( ... \), $$ ... $$, $ ... $
  s = s.replace(new RegExp("\\\\\\[([\\s\\S]*?)\\\\\\]", "g"), "$1");
  s = s.replace(new RegExp("\\\\\\(([\\s\\S]*?)\\\\\\)", "g"), "$1");
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  // Only unwrap single $ if not a currency amount (e.g. $5.99)
  s = s.replace(/(^|[^0-9\\])\$([^$\n]+)\$/g, "$1$2");

  // 2. Fractions: \frac{num}{den} -> (num / den)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");

  // 3. Square roots: \sqrt{x} -> √(x)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // 4. Text wrappers: \text{...}, \mathrm{...}, \mathbf{...}, \ce{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|ce|operatorname)\{([^}]+)\}/g, "$1");

  // 5. Common arrows & relations
  s = s.replace(/\\(?:rightarrow|to)/g, "→")
       .replace(/\\leftarrow/g, "←")
       .replace(/\\rightleftharpoons/g, "⇌")
       .replace(/\\leftrightarrow/g, "↔")
       .replace(/\\Rightarrow/g, "⇒")
       .replace(/\\Leftarrow/g, "⇐")
       .replace(/\\Leftrightarrow/g, "⇔");

  // 6. Operators & symbols
  s = s.replace(/\\times/g, "×")
       .replace(/\\div/g, "÷")
       .replace(/\\pm/g, "±")
       .replace(/\\mp/g, "∓")
       .replace(/\\cdot/g, "·")
       .replace(/\\leq?/g, "≤")
       .replace(/\\geq?/g, "≥")
       .replace(/\\neq/g, "≠")
       .replace(/\\approx/g, "≈")
       .replace(/\\equiv/g, "≡")
       .replace(/\\propto/g, "∝")
       .replace(/\\infty/g, "∞")
       .replace(/\\degree/g, "°")
       .replace(/\\Delta/g, "Δ")
       .replace(/\\delta/g, "δ")
       .replace(/\\pi/g, "π")
       .replace(/\\theta/g, "θ")
       .replace(/\\alpha/g, "α")
       .replace(/\\beta/g, "β")
       .replace(/\\gamma/g, "γ")
       .replace(/\\lambda/g, "λ")
       .replace(/\\mu/g, "μ")
       .replace(/\\sigma/g, "σ")
       .replace(/\\omega/g, "ω")
       .replace(/\\Omega/g, "Ω");

  // 7. Subscripts: _{12} or _2 -> ₁₂ or ₂
  // Matches explicit chemistry brackets like H_{2}O or CO_{2}
  s = s.replace(/_\{([0-9+-]+)\}/g, (_, chars) =>
    chars.split("").map((c: string) => subMap[c] || c).join("")
  );
  // Matches single digits in formulas like H_2O, CO_2 — never matches letters (preserves snake_case identifiers)
  s = s.replace(/_([0-9])/g, (_, c) => subMap[c] || c);

  // 8. Superscripts: ^{2+} or ^2 -> ²⁺ or ²
  s = s.replace(/\^\{([0-9a-zA-Z+-]+)\}/g, (_, chars) =>
    chars.split("").map((c: string) => supMap[c] || c).join("")
  );
  s = s.replace(/\^([0-9a-zA-Z])/g, (_, c) => supMap[c] || c);

  // 9. Remove delimiters: \left, \right
  s = s.replace(/\\left([([{|.])/g, "$1")
       .replace(/\\right([\])}|.])/g, "$1")
       .replace(/\\left\./g, "")
       .replace(/\\right\./g, "");

  // 10. Spacing macros: \quad, \qquad, \;, \:, \,, \!
  s = s.replace(/\\qquad/g, "  ")
       .replace(/\\quad/g, " ")
       .replace(/\\[,;:!]/g, " ")
       .replace(/\\ /g, " ");

  // 11. Catch any trailing single backslashes on letters: e.g. \over
  s = s.replace(/\\([a-zA-Z]+)/g, "$1");

  return s;
}
