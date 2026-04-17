# WCAG Contrast Checker

A browser-based tool for checking color palette contrast ratios against WCAG 2.1 accessibility standards. Each palette defines five color roles — `bg`, `bgAlt`, `text`, `textMuted`, and `accent` — and automatically tests all meaningful foreground/background pairs across AA and AAA levels.

## Color Pairs Checked

| Foreground | Background |
| ---------- | ---------- |
| text       | bg         |
| text       | bgAlt      |
| textMuted  | bg         |
| textMuted  | bgAlt      |
| accent     | bg         |
| accent     | bgAlt      |
| bg         | accent     |
| bgAlt      | accent     |
| bg         | text       |
| bgAlt      | text       |
