# Relationship Tracker

A Foundry VTT module that adds a **Relationships** tab to actor sheets, for
tracking a character's relationship level and notes with various NPCs.

## Features

- New "Relationships" tab injected into the actor sheet's tab bar.
- Drag an NPC actor from the sidebar directly onto the tab to add them,
  with their name/portrait auto-filled.
- Or click "Add NPC" to add a relationship manually (no linked actor
  required — useful for NPCs you haven't built a sheet for yet).
- Six-step relationship level (Hostile → Devoted) adjustable with +/- buttons.
- Freeform notes field per relationship.
- Click a linked NPC's portrait to open their sheet.
- Data is stored as a flag on the actor, so it syncs normally and shows up
  in exports/compendia along with the rest of the actor's data.

## Installation

1. In Foundry's **Add-on Modules** tab, click **Install Module**.
2. Paste the manifest URL (see below), or manually copy this folder into
   your `Data/modules/relationship-tracker` directory.
3. Enable **Relationship Tracker** in your world's Module Management.

## Compatibility notes

This module supports **both** sheet frameworks Foundry currently has in
the wild:

- **Classic sheets** (`renderActorSheet` hook, jQuery-based) — used by
  most pre-V13-native systems.
- **ApplicationV2 sheets** (`renderActorSheetV2` hook, vanilla DOM) — used
  by systems that have migrated, including **WFRP4e v9+ on Foundry v13**.
  The button click uses the sheet's own documented `changeTab()` method,
  so tab switching stays in sync with Foundry's native tab handling.

In both cases the module looks for generic tab markup (a `nav` containing
`[data-tab][data-group]` items, and a container of `.tab` sections) rather
than anything system-specific, so it should work on most sheets without
edits. If a particular system heavily customizes its tab markup (custom
element names, shadow DOM, etc.), injection will fail silently — no
errors, the tab just won't appear — and the selectors in
`injectRelationshipTabClassic` / `injectRelationshipTabV2` in
`scripts/relationship-tracker.js` would need a small tweak for that sheet.

Tested logic targets **Foundry v13 + WFRP4e v9**, but the classic-sheet
path is kept for anyone running older systems or Foundry v12.

## Editing the relationship scale

The six relationship levels (Hostile, Unfriendly, Neutral, Friendly, Ally,
Devoted) are defined in `scripts/relationship-tracker.js` as the `LEVELS`
array, and their display text lives in `lang/en.json`. Both are easy to
edit if you want a different scale (e.g. a numeric -5 to +5 range, or
custom labels like "Rival" / "Confidant").

## License

Do whatever you want with this — it's a starting point for your table.
