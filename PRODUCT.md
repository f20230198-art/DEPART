# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing: plain static HTML/CSS/JS served by Node + Express + Socket.IO (no build step, no framework). Keep it that way.

## Users

First-year CS students at a department orientation (mostly CBSE Class 11/12 background: some Python and SQL, some none). They play on their own phones, all at once, in a hall, with a projector showing a live leaderboard. A department host/moderator runs the projector screen. Roughly 300-400 players.

## Product Purpose

A 3-minute rapid-fire quiz that breaks the ice at orientation. Players tap the right answer to simple Python, SQL, logic-puzzle and beginner-AI questions. Difficulty adapts to streaks (3 right in a row = harder, 3 wrong in a row = easier). Success: every fresher, coder or not, has fun, finishes the round, and sees themselves on the live leaderboard.

## Positioning

Not a test: a shared, loud, in-the-room game where the whole batch competes on one projector leaderboard, and the adaptive difficulty means a non-coder and a coder both get a winnable run.

## Operating Context

Played once per orientation session, in a hall, on phones, standing or seated, bright and dim light mixed, noisy room. The host screen is projected for the whole room to read from a distance. Network is venue Wi-Fi. A moderator can remove players, reset the board and add test bots with a PIN.

## Capabilities and Constraints

- Question types already built: spot the bug (tap a line), find the imposter, multiple choice quiz, predict output / fill the blank, reaction dots, don't-click trap, memory flash.
- 3-minute round, 4 adaptive difficulty tiers, combo multiplier, dev-rank titles (SCRIPT KIDDIE to SYNTAX GOD), avatars (Open Peeps), sound effects, confetti.
- All element IDs and the Socket.IO event contract must keep working; game logic is not part of this redesign.
- Department/college name is not yet decided; the UI must show it as an easily editable line.

## Brand Commitments

- The name stays DEBUGGED, with an "orientation" line for the CS department (name to be supplied).
- Everything else about the current look (colours, type, slit logo, terminal styling) is explicitly NOT binding.

## Evidence on Hand

- Existing screens: welcome/join, game, game over (public/index.html); projector host view (public/host.html).
- 12 Open Peeps avatars in public/js/avatars.js; Lucide-style SVG icons in public/js/icons.js.
- No department logo, photos or testimonials exist; do not invent any.

## Product Principles

1. A fresher who has never coded must feel invited, not tested.
2. Legible in two seconds on a phone in a loud hall, and from the back row on a projector.
3. Fast and light: no UI that costs time during a 3-minute round.
4. The projector leaderboard is the room's shared moment.

## Accessibility & Inclusion

Large tap targets for one-handed phone use; do not rely on colour alone to show right/wrong; respect reduced-motion; readable contrast under projector washout.
