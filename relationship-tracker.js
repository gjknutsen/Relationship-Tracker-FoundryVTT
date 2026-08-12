/**
 * Relationship Tracker
 * Adds a "Relationships" tab to actor sheets for tracking relationship
 * levels and notes with NPCs.
 */

const MODULE_ID = "relationship-tracker";
const FLAG_KEY = "relationships";

const LEVELS = [
  { value: 0, key: "RELTRACK.Level.0" },
  { value: 1, key: "RELTRACK.Level.1" },
  { value: 2, key: "RELTRACK.Level.2" },
  { value: 3, key: "RELTRACK.Level.3" },
  { value: 4, key: "RELTRACK.Level.4" },
  { value: 5, key: "RELTRACK.Level.5" }
];
const MAX_LEVEL = LEVELS.length - 1;
const DEFAULT_LEVEL = 2; // "Neutral"

function levelLabel(value) {
  const entry = LEVELS.find(l => l.value === value) ?? LEVELS[DEFAULT_LEVEL];
  return game.i18n.localize(entry.key);
}

/* -------------------------------------------- */
/*  Setup                                        */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Relationship Tracker`);
  loadTemplates([`modules/${MODULE_ID}/relationship-tab.hbs`]);
});

// Classic ("ApplicationV1") sheets - most pre-V13-native systems.
Hooks.on("renderActorSheet", (app, html, data) => {
  injectRelationshipTabClassic(app, html);
});

// ApplicationV2 sheets - WFRP4e v9+, and other systems that have migrated.
Hooks.on("renderActorSheetV2", (app, element) => {
  injectRelationshipTabV2(app, element);
});

/* -------------------------------------------- */
/*  Tab injection - classic (jQuery) sheets      */
/* -------------------------------------------- */

async function injectRelationshipTabClassic(app, html) {
  const actor = app.actor;
  if (!actor) return;

  const contentHtml = await renderTemplate(`modules/${MODULE_ID}/relationship-tab.hbs`, buildTemplateContext(actor));

  const existing = html.find('.tab.relationship-tracker-tab');
  if (existing.length) {
    existing.html(contentHtml);
    return;
  }

  const tabsNav = html.find('nav.tabs[data-group="primary"], nav.sheet-tabs').first();
  const sheetBody = html.find('.sheet-body').first();
  if (!tabsNav.length || !sheetBody.length) {
    // Not the classic tabs/sheet-body pattern (likely ApplicationV2 - handled above).
    return;
  }

  const tabButton = $(`<a class="item relationship-tracker-tab-button" data-tab="relationships">
    <i class="fas fa-heart"></i> ${game.i18n.localize("RELTRACK.TabLabel")}
  </a>`);
  tabsNav.append(tabButton);

  const tabDiv =
