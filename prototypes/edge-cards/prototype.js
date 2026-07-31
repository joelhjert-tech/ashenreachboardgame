const cards = [
  {
    id: "edge-cinderline-break",
    value: 1,
    name: "Cinderline Break",
    abilityLabel: "Prevent 1 Wound",
    abilityIcon: "wound-ward",
    timing: "After a battle roll",
    ability: "Prevent 1 pending Wound from your enemy battle.",
    tradeoff: "Forfeit every reward from that battle."
  },
  {
    id: "edge-black-relay-decoy",
    value: 1,
    name: "Black Relay Decoy",
    abilityLabel: "Reduce enemy by 3",
    abilityIcon: "shunt",
    timing: "Before an enemy battle",
    ability: "Reduce this enemy's difficulty by 3 for your battle.",
    tradeoff: "A victory awards no Trophy."
  },
  {
    id: "edge-ashglass-overclock",
    value: 2,
    name: "Ashglass Overclock",
    abilityLabel: "Add +3 to a Challenge",
    abilityIcon: "overclock",
    timing: "Before a Challenge roll",
    ability: "Add +3 to one Hazard, Anomaly, or sector Challenge total.",
    tradeoff: "If the Challenge still fails, suffer 1 additional Wound."
  },
  {
    id: "edge-closed-circuit-aid",
    value: 2,
    name: "Closed-Circuit Aid",
    abilityLabel: "Boost accepted helper",
    abilityIcon: "wound-ward",
    timing: "After assistance is locked",
    ability: "One accepted helper contributes +2 additional assistance.",
    tradeoff: "Play before the server rolls any dice."
  },
  {
    id: "edge-cinder-requisition",
    value: 3,
    name: "Cinder Requisition",
    abilityLabel: "Convert Trophy to Salvage",
    abilityIcon: "discount",
    timing: "After winning an enemy battle",
    ability: "Convert up to 2 Trophy value from this victory into equal Salvage.",
    tradeoff: "Converted value is not added to your Trophy pile."
  },
  {
    id: "edge-static-shunt",
    value: 3,
    name: "Static Shunt",
    abilityLabel: "Ignore one failure effect",
    abilityIcon: "shunt",
    timing: "After a failed Challenge roll",
    ability: "Choose and ignore one pending non-Wound failure effect.",
    tradeoff: "The Challenge still counts as failed."
  },
  {
    id: "edge-echo-recast",
    value: 4,
    name: "Echo Recast",
    abilityLabel: "Reroll one die",
    abilityIcon: "recast",
    timing: "After a battle or Challenge roll",
    ability: "Reroll one die from your battle or Challenge.",
    tradeoff: "Accept the second result."
  },
  {
    id: "edge-isolated-channel",
    value: 4,
    name: "Isolated Channel",
    abilityLabel: "Add +2 without help",
    abilityIcon: "shunt",
    timing: "Before a battle or Challenge roll",
    ability: "Add +2 to your total for this resolution.",
    tradeoff: "You cannot request or receive assistance."
  },
  {
    id: "edge-quiet-ledger",
    value: 5,
    name: "Quiet Ledger",
    abilityLabel: "Discount a purchase",
    abilityIcon: "discount",
    timing: "Before a paid shop action",
    ability: "Reduce one Gear purchase or service by 1 Salvage.",
    tradeoff: "The final cost cannot be lower than 1 Salvage."
  },
  {
    id: "edge-known-scar-pattern",
    value: 5,
    name: "Known Scar Pattern",
    abilityLabel: "Exploit known family",
    abilityIcon: "recast",
    timing: "Before an enemy battle",
    ability: "Add +1 against an enemy family recorded in your Trophy pile.",
    tradeoff: "Requires a matching Trophy history."
  },
  {
    id: "edge-low-signal-discipline",
    value: 6,
    name: "Low-Signal Discipline",
    abilityLabel: "Raise a 1 to 2",
    abilityIcon: "raise-signal",
    timing: "After a battle or Challenge roll",
    ability: "Change one natural result of 1 to a 2.",
    tradeoff: "This is not a reroll and cannot trigger roll-based bonuses."
  },
  {
    id: "edge-hazard-wake",
    value: 6,
    name: "Hazard Wake",
    abilityLabel: "Suppress Hazard rule",
    abilityIcon: "overclock",
    timing: "After a failed Hazard Challenge",
    ability: "Suppress one sector modifier created by that Hazard until round end.",
    tradeoff: "The Hazard remains attached to its sector."
  }
];

const grid = document.querySelector("#edge-grid");
const filters = [...document.querySelectorAll("[data-filter]")];
const commitButton = document.querySelector("#commit-mode");
const abilityButton = document.querySelector("#ability-mode");
const phoneValue = document.querySelector("#phone-value");
const phoneEdgeFace = document.querySelector("#phone-edge-face");
const phoneGeneratedCard = document.querySelector("#phone-generated-card");
const phoneAbilityGlyph = document.querySelector("#phone-ability-glyph");
const phoneAbilityLabel = document.querySelector("#phone-ability-label");
const phoneTitle = document.querySelector("#phone-title");
const phoneTiming = document.querySelector("#phone-timing");
const phoneAbility = document.querySelector("#phone-ability");
const phoneModeLabel = document.querySelector("#phone-mode-label");
const phoneTradeoff = document.querySelector("#phone-tradeoff");
const phoneConfirm = document.querySelector(".phone-confirm");
const tvPreview = document.querySelector("#tv-preview");
const tvClose = document.querySelector(".tv-preview__close");
const tvValue = document.querySelector("#tv-preview-value");
const tvTitle = document.querySelector("#tv-preview-title");
const tvResult = document.querySelector("#tv-preview-result");
const tvResultName = document.querySelector("#tv-preview-result-name");
const tvCard = document.querySelector(".tv-preview__card");
const tvArt = document.querySelector("#tv-preview-art");
const tvAction = document.querySelector("#tv-preview-action");
const tvMode = document.querySelector("#tv-preview-mode");
const tvResultCopy = document.querySelector("#tv-preview-result-copy");

let selectedCard = cards.find((card) => card.id === "edge-static-shunt") ?? cards[0];
let selectedMode = "commit";
let previewTimers = [];

function calibrationSpine(value) {
  return Array.from({ length: 6 }, (_, index) => {
    const pip = index + 1;
    return `<span class="${pip <= value ? "is-lit" : ""}" aria-hidden="true"></span>`;
  }).join("");
}

function abilityGlyph(icon) {
  const paths = {
    "wound-ward": `
      <path d="M50 9 79 21v24c0 20-11 35-29 45C32 80 21 65 21 45V21L50 9Z" />
      <path d="M35 49h30M50 34v30" />
      <path d="m23 76 54-54" />`,
    overclock: `
      <path d="M50 9 87 78H13L50 9Z" />
      <path d="m55 25-18 31h14l-7 21 22-34H52l3-18Z" />
      <path d="M24 86h52" />`,
    shunt: `
      <path d="M10 50h18M72 50h18" />
      <path d="M28 50c8 0 8-22 18-22h8c10 0 10 22 18 22" />
      <path d="M28 50c8 0 8 22 18 22h8c10 0 10-22 18-22" />
      <path d="m44 42 12 16M56 42 44 58" />`,
    recast: `
      <path d="M23 37a31 31 0 0 1 49-14l8 8" />
      <path d="m80 17 1 15-15 1" />
      <path d="M77 63a31 31 0 0 1-49 14l-8-8" />
      <path d="m20 83-1-15 15-1" />
      <path d="m50 34 16 16-16 16-16-16 16-16Z" />
      <circle cx="44" cy="44" r="1.5" class="is-fill" />
      <circle cx="56" cy="56" r="1.5" class="is-fill" />`,
    discount: `
      <path d="m50 11 31 18v36L50 83 19 65V29L50 11Z" />
      <path d="M34 50h32" />
      <circle cx="50" cy="50" r="24" />
      <path d="M18 88h64" />`,
    "raise-signal": `
      <path d="M21 79h18V58H21v21ZM61 79h18V35H61v44Z" />
      <path d="m29 42 21-21 21 21" />
      <path d="M50 22v45" />
      <circle cx="30" cy="49" r="4" class="is-fill" />
      <circle cx="70" cy="25" r="4" class="is-fill" />`
  };
  return `<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">${paths[icon] ?? paths.shunt}</svg>`;
}

function activeFilter() {
  return filters.find((filter) => filter.classList.contains("is-active"))?.dataset.filter ?? "all";
}

function applyActiveFilter() {
  const filter = activeFilter();
  grid.querySelectorAll(".edge-card").forEach((element) => {
    element.hidden = filter !== "all" && element.dataset.value !== filter;
  });
}

function renderCards() {
  grid.innerHTML = cards
    .map(
      (card) => `
        <button
          class="edge-card ${card.name === selectedCard.name ? "is-selected" : ""}"
          type="button"
          data-card="${card.name}"
          data-value="${card.value}"
          aria-label="Preview ${card.name}, Edge value ${card.value}"
          aria-pressed="${card.name === selectedCard.name}"
        >
          <span class="calibration-spine">${calibrationSpine(card.value)}</span>
          <span class="edge-card__body">
            <span class="edge-card__header">
              <span>Edge card</span>
              <span>One use</span>
            </span>
            <span class="edge-card__decision" aria-hidden="true">
              <img class="edge-card__generated-face" src="/assets/cards/edge/${card.id}.phone.webp" alt="" />
            </span>
            <h3>${card.name}</h3>
            <span class="edge-card__timing">${card.timing}</span>
            <span class="edge-card__ability">
              ${card.ability}
            </span>
            <span class="edge-card__tradeoff">
              ${card.tradeoff}
            </span>
            <span class="edge-card__footer">
              <span>Both modes · live</span>
              <span>Random award</span>
            </span>
          </span>
        </button>
      `
    )
    .join("");

  grid.querySelectorAll(".edge-card").forEach((element) => {
    element.addEventListener("click", () => {
      selectedCard = cards.find((card) => card.name === element.dataset.card) ?? cards[0];
      selectedMode = "commit";
      renderCards();
      updatePhone();
    });
  });

  applyActiveFilter();
}

function updatePhone() {
  phoneValue.textContent = String(selectedCard.value);
  phoneTitle.textContent = selectedCard.name;
  phoneAbilityGlyph.innerHTML = abilityGlyph(selectedCard.abilityIcon);
  phoneGeneratedCard.src = `/assets/cards/edge/${selectedCard.id}.phone.webp`;
  phoneGeneratedCard.hidden = false;
  phoneEdgeFace.dataset.render = "generated";
  phoneTiming.textContent = selectedMode === "commit"
    ? "Before an eligible enemy battle or Hazard roll"
    : selectedCard.timing;
  phoneAbilityLabel.textContent = selectedMode === "commit"
    ? `Lock one die at ${selectedCard.value}`
    : selectedCard.abilityLabel;
  phoneEdgeFace.dataset.activeMode = selectedMode;
  commitButton.textContent = `Use number ${selectedCard.value}`;
  abilityButton.textContent = "Use icon ability";
  commitButton.classList.toggle("is-active", selectedMode === "commit");
  abilityButton.classList.toggle("is-active", selectedMode === "ability");
  phoneModeLabel.textContent = selectedMode === "commit" ? "NUMBER USE" : "ICON USE";
  phoneAbility.textContent = selectedMode === "commit"
    ? `Use ${selectedCard.value} as one die in your next enemy battle or Hazard Challenge.`
    : selectedCard.ability;
  phoneTradeoff.textContent = selectedMode === "commit"
    ? "The locked result cannot explode or be rerolled."
    : selectedCard.tradeoff;
}

function clearPreviewTimers() {
  previewTimers.forEach((timer) => window.clearTimeout(timer));
  previewTimers = [];
}

function closePreview() {
  clearPreviewTimers();
  tvPreview.hidden = true;
  tvPreview.dataset.stage = "idle";
}

function previewTvReveal() {
  clearPreviewTimers();
  tvValue.textContent = String(selectedCard.value);
  tvTitle.textContent = selectedCard.name;
  tvResult.textContent = String(selectedCard.value);
  tvResultName.textContent = selectedCard.name;
  tvCard.dataset.render = "generated";
  tvArt.src = `/assets/cards/edge/${selectedCard.id}.png`;
  tvAction.textContent = selectedMode === "commit"
    ? "Private reserve committed"
    : "Private reserve activated";
  tvMode.textContent = selectedMode === "commit" ? "One die locked" : "Ability activated";
  tvResultCopy.textContent = selectedMode === "commit"
    ? "One die locked at the revealed value."
    : selectedCard.ability;
  tvPreview.hidden = false;
  tvPreview.dataset.stage = "sealed";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tvPreview.dataset.stage = "result";
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      tvPreview.dataset.stage = "charge";
    });
  });
  previewTimers = [
    window.setTimeout(() => {
      tvPreview.dataset.stage = "detonate";
    }, 900),
    window.setTimeout(() => {
      tvPreview.dataset.stage = "result";
    }, 1750),
    window.setTimeout(closePreview, 4200)
  ];
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    filters.forEach((candidate) => candidate.classList.toggle("is-active", candidate === filter));
    applyActiveFilter();
  });
});

commitButton.addEventListener("click", () => {
  selectedMode = "commit";
  updatePhone();
});
abilityButton.addEventListener("click", () => {
  selectedMode = "ability";
  updatePhone();
});
phoneConfirm.addEventListener("click", previewTvReveal);
tvClose.addEventListener("click", closePreview);

renderCards();
updatePhone();
