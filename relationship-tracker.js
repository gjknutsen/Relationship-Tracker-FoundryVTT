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

  if (html.find('.tab.relationship-tracker-tab').length) return;

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

  const contentHtml = await renderTemplate(`modules/${MODULE_ID}/relationship-tab.hbs`, buildTemplateContext(actor));
  const tabDiv = $(`<div class="tab relationship-tracker-tab" data-group="primary" data-tab="relationships"></div>`);
  tabDiv.html(contentHtml);
  sheetBody.append(tabDiv);

  activateListeners(tabDiv, app, actor);

  if (app._tabs?.length) {
    for (const t of app._tabs) t.bind(html[0]);
  }
}

/* -------------------------------------------- */
/*  Tab injection - ApplicationV2 sheets         */
/* -------------------------------------------- */

async function injectRelationshipTabV2(app, element) {
  const actor = app.actor ?? app.document;
  if (!actor) return;

  const root = element instanceof HTMLElement ? element : (element?.[0] ?? app.element);
  if (!root) return;

  // Find an existing tab nav item to learn the tab group name this sheet
  // uses (usually "primary", but not guaranteed), then locate the nav and
  // the sibling container that holds the ".tab" content sections.
  const existingNavItem = root.querySelector('nav [data-tab][data-group]');
  const group = existingNavItem?.dataset.group || "primary";
  const nav = existingNavItem?.closest('nav');
  const existingTabSection = root.querySelector(`.tab[data-group="${group}"], section.tab[data-tab]`);
  const tabContainer = existingTabSection?.parentElement;

  if (!nav || !tabContainer) {
    // Sheet doesn't expose the expected AppV2 tab structure. Skip gracefully.
    return;
  }

  // Don't add a duplicate button if one is already there for some reason.
  if (!nav.querySelector('[data-tab="relationships"]')) {
    const btn = document.createElement("a");
    btn.className = "item relationship-tracker-tab-button";
    btn.dataset.tab = "relationships";
    btn.dataset.group = group;
    btn.innerHTML = `<i class="fas fa-heart"></i> ${game.i18n.localize("RELTRACK.TabLabel")}`;
    btn.addEventListener("click", ev => {
      app.changeTab?.("relationships", group, { event: ev, navElement: nav });
    });
    nav.appendChild(btn);
  }

  const contentHtml = await renderTemplate(`modules/${MODULE_ID}/relationship-tab.hbs`, buildTemplateContext(actor));
  const section = document.createElement("section");
  section.className = "tab relationship-tracker-tab";
  section.dataset.tab = "relationships";
  section.dataset.group = group;
  section.innerHTML = contentHtml;
  tabContainer.appendChild(section);

  activateListeners($(section), app, actor);
}

/* -------------------------------------------- */
/*  Shared context builder                       */
/* -------------------------------------------- */

function buildTemplateContext(actor) {
  const relationships = getRelationships(actor);
  return {
    relationships: relationships.map(r => ({
      ...r,
      levelLabel: levelLabel(r.level),
      levelPercent: Math.round((r.level / MAX_LEVEL) * 100)
    }))
  };
}

/* -------------------------------------------- */
/*  Data helpers                                 */
/* -------------------------------------------- */

function getRelationships(actor) {
  return foundry.utils.deepClone(actor.getFlag(MODULE_ID, FLAG_KEY) ?? []);
}

async function setRelationships(actor, relationships) {
  await actor.setFlag(MODULE_ID, FLAG_KEY, relationships);
}

async function addRelationship(actor, { name, img, actorUuid = null }) {
  const relationships = getRelationships(actor);
  relationships.push({
    id: foundry.utils.randomID(),
    name,
    img: img || "icons/svg/mystery-man.svg",
    actorUuid,
    level: DEFAULT_LEVEL,
    notes: ""
  });
  await setRelationships(actor, relationships);
}

async function removeRelationship(actor, id) {
  const relationships = getRelationships(actor).filter(r => r.id !== id);
  await setRelationships(actor, relationships);
}

async function adjustLevel(actor, id, delta) {
  const relationships = getRelationships(actor);
  const rel = relationships.find(r => r.id === id);
  if (!rel) return;
  rel.level = Math.clamp ? Math.clamp(rel.level + delta, 0, MAX_LEVEL)
    : Math.min(MAX_LEVEL, Math.max(0, rel.level + delta));
  await setRelationships(actor, relationships);
}

async function updateNotes(actor, id, notes) {
  const relationships = getRelationships(actor);
  const rel = relationships.find(r => r.id === id);
  if (!rel) return;
  rel.notes = notes;
  await setRelationships(actor, relationships);
}

/* -------------------------------------------- */
/*  Listeners                                    */
/* -------------------------------------------- */

function activateListeners(tabDiv, app, actor) {
  // Add NPC manually
  tabDiv.find('.relationship-add').on('click', async () => {
    await openAddDialog(actor);
  });

  // Delete
  tabDiv.on('click', '.relationship-delete', async ev => {
    const li = $(ev.currentTarget).closest('.relationship-entry');
    const id = li.data('relationship-id');
    const name = li.find('.relationship-name').text();
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("RELTRACK.DeleteConfirmTitle"),
      content: `<p>${game.i18n.format("RELTRACK.DeleteConfirmBody", { name })}</p>`
    });
    if (confirmed) await removeRelationship(actor, id);
  });

  // Level up / down
  tabDiv.on('click', '.relationship-level-up', async ev => {
    const id = $(ev.currentTarget).closest('.relationship-entry').data('relationship-id');
    await adjustLevel(actor, id, 1);
  });
  tabDiv.on('click', '.relationship-level-down', async ev => {
    const id = $(ev.currentTarget).closest('.relationship-entry').data('relationship-id');
    await adjustLevel(actor, id, -1);
  });

  // Notes (save on blur / change, not on every keystroke)
  tabDiv.on('change', '.relationship-notes', async ev => {
    const id = $(ev.currentTarget).closest('.relationship-entry').data('relationship-id');
    await updateNotes(actor, id, ev.currentTarget.value);
  });

  // Open the linked NPC actor sheet on portrait click
  tabDiv.on('click', '.relationship-img', ev => {
    const li = $(ev.currentTarget).closest('.relationship-entry');
    const uuid = li.data('actor-uuid');
    if (!uuid) return;
    fromUuid(uuid).then(linkedActor => linkedActor?.sheet?.render(true));
  });

  // Drag & drop an actor from the sidebar onto the tab
  const dropZone = tabDiv[0];
  dropZone.addEventListener('dragover', ev => ev.preventDefault());
  dropZone.addEventListener('drop', async ev => {
    ev.preventDefault();
    let data;
    try {
      data = JSON.parse(ev.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }
    if (data?.type !== 'Actor') return;

    const droppedActor = await Actor.implementation.fromDropData(data);
    if (!droppedActor) return;

    await addRelationship(actor, {
      name: droppedActor.name,
      img: droppedActor.img,
      actorUuid: droppedActor.uuid
    });
  });
}

async function openAddDialog(actor) {
  const content = `
    <form>
      <div class="form-group">
        <label>${game.i18n.localize("RELTRACK.DialogName")}</label>
        <input type="text" name="name" required />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("RELTRACK.DialogImage")}</label>
        <input type="text" name="img" placeholder="icons/svg/mystery-man.svg" />
      </div>
    </form>
  `;

  new Dialog({
    title: game.i18n.localize("RELTRACK.DialogTitle"),
    content,
    buttons: {
      add: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("RELTRACK.DialogAdd"),
        callback: async html => {
          const form = html[0].querySelector('form');
          const name = form.name.value.trim();
          const img = form.img.value.trim();
          if (!name) return;
          await addRelationship(actor, { name, img });
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("RELTRACK.DialogCancel")
      }
    },
    default: "add"
  }).render(true);
}
