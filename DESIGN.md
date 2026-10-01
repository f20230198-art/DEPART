---
name: DEBUGGED
description: A friendly senior sketching on a napkin - marker lettering, ink outlines and highlighter swipes on dot-grid paper.
colors:
  paper: "#FFF6DC"
  paper-deep: "#FFEBB8"
  card: "#FFFDF4"
  ink: "#14110F"
  ink-soft: "#4A423A"
  highlighter-yellow: "#FFE14D"
  yellow-soft: "#FFF0A0"
  highlighter-pink: "#FF6FAE"
  pink-soft: "#FFC2DC"
  highlighter-teal: "#2DD4BF"
  teal-soft: "#A8F0E5"
  teal-ink: "#0B7A6C"
  pink-ink: "#B3125A"
typography:
  display:
    fontFamily: "'Caveat Brush', 'Patrick Hand SC', cursive"
    fontSize: "clamp(2.9rem, 15vw, 4.4rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline:
    fontFamily: "'Caveat Brush', 'Patrick Hand SC', cursive"
    fontSize: "2.3rem"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "'Patrick Hand SC', 'Caveat Brush', cursive"
    fontSize: "1.55rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "'Patrick Hand SC', 'Caveat Brush', cursive"
    fontSize: "1.15rem"
    fontWeight: 400
    lineHeight: 1.1
  code:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace"
    fontSize: "0.92rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  wobble-s: "9px 13px 10px 14px / 13px 9px 14px 10px"
  wobble-a: "14px 22px 16px 24px / 22px 14px 24px 16px"
  wobble-b: "24px 14px 22px 16px / 16px 24px 14px 22px"
  tag: "4px 7px 5px 8px"
  blob: "50% 46% 52% 48%"
spacing:
  xs: "0.3rem"
  sm: "0.65rem"
  md: "1rem"
  lg: "1.2rem"
  screen-x: "1rem"
components:
  button-marker:
    backgroundColor: "{colors.highlighter-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.wobble-b}"
    padding: "0.7rem 1.2rem"
    height: "3.6rem"
  button-marker-hover:
    backgroundColor: "#FFE866"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.wobble-s}"
    padding: "0.5rem 1rem"
    height: "2.9rem"
  button-outline-hover:
    backgroundColor: "{colors.paper-deep}"
  field:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    rounded: "{rounded.wobble-s}"
    padding: "0.6rem 0.9rem"
    height: "3.2rem"
  choice-btn:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.wobble-s}"
    padding: "0.55rem 3rem 0.55rem 0.7rem"
    height: "3.5rem"
  choice-btn-correct:
    backgroundColor: "{colors.teal-soft}"
  choice-btn-wrong:
    backgroundColor: "{colors.pink-soft}"
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.wobble-a}"
    padding: "1.2rem"
  badge-combo:
    backgroundColor: "{colors.pink-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.wobble-s}"
    padding: "0.25rem 0.8rem"
  lb-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.wobble-s}"
    padding: "0.3rem 0.8rem"
    height: "3.1rem"
---

# Design System: DEBUGGED

## Overview

**Creative North Star: "The Napkin Zine"**

A friendly senior sketching on a napkin, not an exam. Warm dot-grid paper carries ink-black marker outlines whose corners never quite match, and the only colour is three highlighter swipes: yellow, pink and teal. Recognisable with all text removed: a teal bug mascot, wobbly boxes, ragged highlighter strokes behind the numbers that matter.

Density is generous and loud rather than dense: the player view is a single phone column (max 34rem) of big, tappable sheets; the projector view is a three-panel board readable from the back of a hall. Depth is drawn, not simulated: thick ink lines, dashed "sketch" borders, and a hard marker-underline shadow on buttons. The mood is invitation ("you got this!"), never evaluation.

The system rejects the glowing dark-terminal arcade and the corporate quiz-app tile grid. The department name is a placeholder: the line "CS Department Orientation" in `public/index.html` and `public/host.html` (class `dept-note`, marked `EDIT HERE`) is to be replaced by the real name; its pink highlighter swipe is part of the system, its words are not.

**Key Characteristics:**
- Dot-grid cream paper, ink outlines at 2 to 3px, never pure black or white page.
- Highlighter yellow, pink, teal are the only hues; each has a darker "ink" twin for text.
- Four typefaces with strict roles: marker caps, hand labels, hyperlegible body, mono code.
- Every box has hand-wobbled corners; no two edges match.
- A large bug mascot whose face and pose react to right and wrong answers.
- Right/wrong is never colour alone: a drawn check or cross accompanies the tint.

## Colors

Cream paper and near-black ink, with three highlighter markers used as swipes, stickers and fills.

### Primary
- **Highlighter Yellow** (#FFE14D): the primary action fill (START, marker buttons), score swipe, correct-answer sticker, rank 1 row, "me" row, option letter discs. Soft tint (#FFF0A0) is the hover wash.

### Secondary
- **Highlighter Pink** (#FF6FAE): wrong-answer sticker, urgent timer, trap button, selected-avatar halo, department-line swipe (#FF9AC8 in the SVG). Soft tint (#FFC2DC) for wrong-answer fill, combo badge, rank 3.
- **Highlighter Teal** (#2DD4BF): logo underline swipe, XP bar, timer ring, how-to step discs, focus-field halo. Soft tint (#A8F0E5) for correct-answer fill, live pill, rank 2.

### Neutral
- **Napkin Paper** (#FFF6DC): page background under a 22px dot grid (ink at 10%). **Paper Deep** (#FFEBB8): code headers, outline-button hover.
- **Sheet Card** (#FFFDF4): panels and challenge card. Pure white (#FFFFFF) appears only on inputs, answer choices and code boxes, where contrast is needed.
- **Marker Ink** (#14110F): all text, outlines, hard shadows. **Pencil Ink** (#4A423A): secondary text. Faint ink (rgba(20,17,15,0.2)): dashed dividers.
- **Teal Ink** (#0B7A6C) and **Pink Ink** (#B3125A): the text-safe darker twins, for focus rings, reveal outlines, "you" tag, and syntax strings/keywords.

### Named Rules
**The Highlighter-Only Rule.** Colour arrives as a swipe, sticker or fill behind ink, never as a coloured line of text on paper. Text hues exist only as the two Ink twins.
**The Never-Colour-Alone Rule.** Correct and wrong are a tint plus a drawn check or cross; reveal is a dashed teal-ink outline.
**The Luminance-Pair Rule.** Reaction dots are pale/dark pairs (light green vs deep red, light cyan vs deep blue, yellow vs deep purple) so they separate by lightness, not hue.

## Typography

**Display Font:** Caveat Brush (with Patrick Hand SC, cursive)
**Body Font:** Atkinson Hyperlegible (with system-ui)
**Label Font:** Patrick Hand SC (with Caveat Brush)
**Mono Font:** JetBrains Mono (500, 700)

**Character:** Marker caps shout the numbers and names; small-caps hand labels annotate like margin notes; Atkinson keeps instructions and answers unmistakable for a first-time reader.

### Hierarchy
- **Display** (400, clamp(2.9rem, 15vw, 4.4rem), 0.95): the DEBUGGED wordmark with teal swipe. Final score goes bigger (clamp(4.6rem, 24vw, 6.4rem)).
- **Headline** (400, 2.2 to 2.7rem, 1): game-over title, score value, stat numbers, panel titles (2 to 2.4rem on host).
- **Title** (Patrick Hand SC 400, 1.55rem, 1): primary button text, feedback sticker is Caveat Brush at 1.55rem.
- **Body** (Atkinson 400/700, 1 to 1.2rem, 1.3 to 1.45): instructions at 700/1.2rem, choices at 700/1.1rem, field text 700/1.15rem.
- **Label** (Patrick Hand SC, 1.05 to 1.3rem, normal case as authored): badges, form labels, HUD captions, tier tags.
- **Code** (JetBrains Mono 500, 0.92 to 1rem, 1.5 to 1.7): code lines, imposter cards, join URL pill (700, 1.3rem).

### Named Rules
**The Margin-Note Rule.** Labels and captions are Patrick Hand SC; numbers and names that matter are Caveat Brush; sentences to be read are Atkinson. Do not swap roles.
**The Projector Floor Rule.** On the host view root size is clamp(14px, 0.95vw, 26px) (about 18px at 1920 wide); secondary text is set at 1.3rem or more (about 24px) so the back row can read it.

## Layout

Player: one centred column, max 34rem, screens padded 1.1rem 1rem 1.6rem with 1rem gaps; a sticky HUD (paper background, dashed bottom rule) holds score, timer ring and sound toggle over a combo/tier row and XP bar. Welcome puts mascot beside wordmark, a name field, a 6-column avatar grid, a full-width START, then three numbered how-to lines. At 560px and up choices and imposter cards may go two-column.

Host: full-height three-column board (22rem join panel, flexible leaderboard, 25rem activity feed) with 1.3rem gaps, no page scroll; at 1100px and below it stacks to one column and scrolls at a fixed 14px root. Spacing is rem-based and loose (0.3, 0.65, 1, 1.2rem steps). Tap targets: buttons 3.6rem, fields 3.2rem, choices 3.5rem, secondary and toggles 2.9rem, reaction dots 3.2rem minimum.

## Elevation & Depth

Mostly flat and drawn. Depth comes from thick ink outlines, slight rotations (about 1 to 2 degrees) on badges and tokens, and highlighter swipes behind numbers. Two shadow dialects exist: hard, zero-blur ink offsets that read as a pressed marker line, and one soft ambient lift on large cards.

### Shadow Vocabulary
- **Marker press** (`box-shadow: 0 4px 0 var(--ink)`): primary marker button; collapses to `0 1px 0` and drops 3px on press. Trap button uses `0 5px 0`.
- **Sticker line** (`0 3px 0 var(--ink)`): the answer sticker and memory tokens.
- **Sheet lift** (`0 8px 18px rgba(20,17,15,0.1)`): sheets and the challenge card only.
- **Focus** (`0 0 0 3px var(--teal)` on fields; 3px teal-ink outline offset 3px on everything else; avatar selection halo `0 0 0 4px var(--pink)`).

### Named Rules
**The Pressed-Marker Rule.** Hard offset shadows belong to things you press or stick on (buttons, stickers, tokens); containers use no hard shadow.

## Shapes

Hand-drawn. Five corner dialects: three asymmetric elliptical "wobble" radii (small for inputs/choices/badges, two large alternates for sheets and cards), a tight 4/7/5/8px tag corner for dark tags and memory tokens, and blobby near-circles (50/46/52/48%) for discs, dots and avatars. Alternate children (even choices) swap wobble to keep the hand feel. Borders are 2 to 3px solid ink; dashed ink borders mark secondary or "sketch" elements (outline button, tier badge, unselected avatar, memory card, divider rules). Highlighter swipes are ragged SVG polygons, not rectangles.

## Components

### Buttons
- **Marker (primary):** yellow fill, 2.5px ink outline, wobble-b, Patrick Hand SC 1.55rem, 3.6rem tall, full width, hard 4px ink shadow. Hover brightens to #FFE866; active sinks 3px.
- **Outline (secondary):** dashed 2px ink, no fill, wobble-s, 2.9rem tall; hover fills Paper Deep.
- **Sound toggle:** solid 2px ink, card fill, 2.9rem; icon-only is a 2.9rem square. On host it is dashed and transparent.

### Fields
White fill, 2.5px ink border, wobble-s, 1.15rem bold Atkinson, 3.2rem tall. Focus removes the outline and adds a 3px teal halo. Error message is a pink-soft wobble box that shakes once.

### Answer choices
White wobble boxes with a yellow lettered disc (A, B, C by counter). Hover yellow-soft. Correct teal-soft, wrong pink-soft, each with a drawn check or cross at the right; reveal is a dashed teal-ink outline. Code lines and imposter cards share the same states.

### Sheets and challenge card
Card-coloured, 2.5px ink border, wobble-a or b, sheet-lift shadow. A dark ink tag (4/7/5/8px corner, Patrick Hand SC) names the challenge; an answer sticker pops from the card's top edge and never covers options.

### Coach mascot
The teal bug (SVG symbol, face driven by `--f-n/--f-h/--f-o`) sits large under the question with a speech bubble that changes text with feedback; it hops and tilts on correct and leans on wrong. Welcome mascot is 7rem, panel mascot 8.5rem on host.

### Leaderboard row (host)
Card wobble row with Caveat Brush rank and score, Atkinson bold name, Patrick Hand tier tag. Ranks 1/2/3 grow in height and take yellow / teal-soft / pink-soft fills with 3px borders. Remove button appears on hover/focus.

### Code box
White box, 2.5px ink border, paper-deep header with three ink-ringed dots (pink, yellow, teal), mono lines with dashed separators. Syntax colours are all at least 4.5:1 on white: comment #5E564D, string #0B7A6C, keyword #B3125A, bool #6D28D9, number #A04A05, property #1D4ED8.

### Reaction dots
Six blobby 3px-ink-ringed circles, 3.2rem minimum: light green #8CF0B5, deep red #B8322B, light cyan #8BEFFA, deep blue #2B4BC0, yellow, deep purple #5B2FA8.

### Motion
Screens fade up 8px in 0.28s; ease-out is cubic-bezier(0.22, 1, 0.36, 1); sticker pops over 0.6s; mascot bobs on a 3.2s loop. Reduced-motion collapses all animation to near zero and keeps the sticker visible.

## Do's and Don'ts

### Do:
- **Do** put colour behind ink as a highlighter swipe, sticker or fill, using the three highlighters and their soft tints.
- **Do** give every new box a wobble radius and a 2 to 3px ink border; alternate wobbles on siblings.
- **Do** pair every correct/wrong tint with a drawn check or cross.
- **Do** keep tap targets at 2.9rem (about 46px) or more, primary actions 3.6rem.
- **Do** keep projector secondary text at about 24px (1.3rem) or more at 1920 wide.
- **Do** use hard ink shadows only on pressable or stuck-on pieces.
- **Do** keep the department line an easily editable `dept-note` paragraph.

### Don't:
- **Don't** use the dark-terminal arcade look (glow, neon on black) or a corporate quiz-app tile grid.
- **Don't** write body or label text in pink, teal or yellow; use Marker Ink, Pencil Ink or the two Ink twins.
- **Don't** put a hard offset shadow on containers or cards.
- **Don't** use perfectly rectangular or perfectly circular highlighter shapes; swipes stay ragged.
- **Don't** separate states by hue alone (pair dark and light values, add a shape).
