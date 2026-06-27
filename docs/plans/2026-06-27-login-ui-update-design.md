# Login Page UI/UX Update Design
**Date:** 2026-06-27

## Overview
Update the login/profile page with the official logo and improve the Google sign-in button styling.

## Changes

### 1. Logo Implementation
- **Current:** Text-based logo ("Pingo" + "de luz" in italics)
- **New:** Replace with `logo-transparente.png` from `/public`
- **Size:** ~180-200px height, responsive
- **Position:** Centered, above "Bem-vinda de volta" heading
- **Implementation:** Replace `.pdl-login-logo` div content with `<Image>` component

### 2. Google Button Border Enhancement
- **Current:** 1px solid border, white background
- **New:** Increase border width to 2px, darken border color
- **Border Color:** Change from `var(--border)` to `var(--ink)` or `#333`
- **Other Styles:** Keep padding, border-radius, and layout unchanged
- **File:** Update `.pdl-google-btn` in `src/app/globals.css`

## Files to Modify
1. `src/app/perfil/page.tsx` - Replace logo JSX
2. `src/app/globals.css` - Update `.pdl-google-btn` border styles

## Validation
- Logo displays correctly and is responsive
- Button border is clearly visible at all screen sizes
- No layout shifts or broken spacing
