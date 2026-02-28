# i18n Manager

## Description
Translation consistency checker for multi-language projects.

## Triggers
- User adds new UI text
- Sprint review i18n check
- User asks about missing translations
- Before release to verify all strings are translated

## Commands
```bash
npm run i18n          # Full i18n consistency check
npm run i18n:check    # Check only (same as default)
npm run i18n:sync     # Add [NEEDS TRANSLATION] placeholders for missing keys
```

## Checks
- **Missing Keys**: Keys in one locale but not another
- **Orphaned Keys**: Keys in locale files not used in any component
- **Hardcoded Strings**: Text in JSX that should use t() (h1-h6, p, span, button, label, placeholder, title, alt, aria-label)
- **Interpolation Mismatches**: Variables like {name} present in one locale but missing in another

## Auto-detection
- Detects i18n framework from package.json (next-intl, react-i18next, vue-i18n)
- Finds locale files in messages/, locales/, src/locales/
- Scans .tsx/.jsx/.ts/.js files for t() and useTranslations() calls
