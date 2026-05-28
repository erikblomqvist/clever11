# CSS Property Order

Order CSS properties by group, following the Chrome DevTools Computed tab grouping (source: [PropertyNameCategories.ts](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/panels/elements/PropertyNameCategories.ts)).

Separate each group with a blank line. Omit groups that have no properties in the rule. Within a group, order properties logically (shorthand before longhand).

## Groups (in order)

### 1. Layout

`display`, `position`, `top`, `right`, `bottom`, `left`, `z-index`, `float`, `clear`, `overflow`, `resize`, `clip`, `visibility`, `box-sizing`, `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `inline-size`, `block-size`, `min-inline-size`, `max-inline-size`, `min-block-size`, `max-block-size`, `margin`, `padding`, `align-content`, `align-items`, `align-self`, `justify-content`, `order`

### 2. Text

`font`, `font-family`, `font-size`, `font-size-adjust`, `font-stretch`, `font-style`, `font-variant`, `font-weight`, `font-smoothing`, `direction`, `tab-size`, `text-align`, `text-align-last`, `text-decoration`, `text-decoration-color`, `text-decoration-line`, `text-decoration-style`, `text-indent`, `text-justify`, `text-overflow`, `text-shadow`, `text-transform`, `text-size-adjust`, `line-height`, `vertical-align`, `letter-spacing`, `word-spacing`, `white-space`, `word-break`, `word-wrap`

### 3. Appearance

`color`, `background`, `border`, `border-image`, `outline`, `outline-color`, `outline-offset`, `outline-style`, `outline-width`, `box-shadow`, `cursor`, `tap-highlight-color`

### 4. Animation

`animation`, `animation-delay`, `animation-direction`, `animation-duration`, `animation-fill-mode`, `animation-iteration-count`, `animation-name`, `animation-play-state`, `animation-timing-function`, `transition`, `transition-delay`, `transition-duration`, `transition-property`, `transition-timing-function`

### 5. CSS Variables

All `--*` custom properties.

### 6. Grid

`grid`, `grid-column`, `grid-row`, `order`, `place-items`, `place-content`, `place-self`

### 7. Flex

`flex`, `flex-basis`, `flex-direction`, `flex-flow`, `flex-grow`, `flex-shrink`, `flex-wrap`, `order`, `place-items`, `place-content`, `place-self`

### 8. Table

`border-collapse`, `border-spacing`, `caption-side`, `empty-cells`, `table-layout`

### 9. Generated Content

`content`, `quotes`, `counter-reset`, `counter-increment`

### 10. Other

Everything not listed above.

## Example

```css
.sidebar {
	/* Layout */
	display: flex;
	position: fixed;
	top: 0;
	left: 0;
	width: 240px;
	height: 100dvh;
	padding: 16px;

	/* Text */
	font-family: var(--font-sans);
	font-size: 14px;

	/* Appearance */
	color: lch(90% 0 0);
	background: lch(8% 2 280);
	border-right: 1px solid lch(20% 2 280);

	/* Flex */
	flex-direction: column;
}
```

## Color format

Use `lch()` for all colors. Do not use hex codes, `rgb()`, or `hsl()`.
