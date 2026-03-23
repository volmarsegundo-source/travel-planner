/**
 * ESLint rule: no-raw-tailwind-colors
 *
 * Warns when raw Tailwind color classes (bg-red-500, text-blue-600, etc.)
 * are used in JSX instead of atlas-* design tokens.
 *
 * Enforced from Sprint 38+ per UX-PARECER-DESIGN-SYSTEM.md.
 *
 * Allowed: atlas-*, bg-white, bg-black, bg-transparent, bg-current, text-white, text-black
 * Forbidden: bg-{color}-{shade}, text-{color}-{shade}, border-{color}-{shade}, ring-{color}-{shade}
 *   where {color} is: slate, gray, zinc, neutral, stone, red, orange, amber, yellow,
 *   lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose
 */

// Tailwind color names that should NOT be used directly
const FORBIDDEN_COLORS = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose",
];

const COLOR_PREFIXES = ["bg", "text", "border", "ring", "outline", "divide", "from", "via", "to", "fill", "stroke"];

// Build regex: (bg|text|border|...)-{color}-(50|100|...|950)
const shadePattern = `(${COLOR_PREFIXES.join("|")})-(${FORBIDDEN_COLORS.join("|")})-(50|100|200|300|400|500|600|700|800|900|950)`;
const RAW_COLOR_REGEX = new RegExp(shadePattern);

// Also catch focus:ring-0 (WCAG violation)
const FOCUS_RING_ZERO_REGEX = /focus:ring-0/;

// Also catch font-sans, font-serif when not atlas-*
const RAW_FONT_REGEX = /\bfont-(inter|sans|serif|mono)\b/;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce atlas-* design tokens instead of raw Tailwind colors",
      category: "Design System",
      recommended: true,
    },
    messages: {
      rawColor: "Use atlas-* design tokens instead of raw Tailwind color '{{class}}'. See UX-PARECER-DESIGN-SYSTEM.md.",
      focusRingZero: "Never use focus:ring-0 — use focus-visible:ring-2 ring-atlas-focus-ring instead. See WCAG 2.4.7.",
      rawFont: "Use font-atlas-headline or font-atlas-body instead of '{{class}}'. See UX Parecer Section 1.2.",
    },
    schema: [],
  },

  create(context) {
    function checkStringForViolations(node, value) {
      if (typeof value !== "string") return;

      // Split className string into individual classes
      const classes = value.split(/\s+/);
      for (const cls of classes) {
        if (RAW_COLOR_REGEX.test(cls)) {
          context.report({ node, messageId: "rawColor", data: { class: cls } });
        }
        if (FOCUS_RING_ZERO_REGEX.test(cls)) {
          context.report({ node, messageId: "focusRingZero" });
        }
        if (RAW_FONT_REGEX.test(cls)) {
          context.report({ node, messageId: "rawFont", data: { class: cls } });
        }
      }
    }

    return {
      // Check JSX className attributes
      JSXAttribute(node) {
        if (node.name.name !== "className") return;

        // String literal: className="bg-red-500"
        if (node.value && node.value.type === "Literal" && typeof node.value.value === "string") {
          checkStringForViolations(node, node.value.value);
        }

        // Template literal: className={`bg-red-500 ${other}`}
        if (node.value && node.value.type === "JSXExpressionContainer") {
          const expr = node.value.expression;
          if (expr.type === "TemplateLiteral") {
            for (const quasi of expr.quasis) {
              checkStringForViolations(node, quasi.value.raw);
            }
          }
          // Simple string in expression: className={"bg-red-500"}
          if (expr.type === "Literal" && typeof expr.value === "string") {
            checkStringForViolations(node, expr.value);
          }
        }
      },
    };
  },
};
