const cards = [
  {
    id: "edge-cinderline-break",
    value: 1,
    name: "Cinderline Break",
    timing: "After a battle roll",
    ability: "Prevent 1 pending Wound from your enemy battle.",
    tradeoff: "Forfeit every reward from that battle."
  },
  {
    id: "edge-ashglass-overclock",
    value: 2,
    name: "Ashglass Overclock",
    timing: "Before a Challenge roll",
    ability: "Add +3 to one Hazard, Anomaly, or sector Challenge total.",
    tradeoff: "If the Challenge still fails, suffer 1 additional Wound."
  },
  {
    id: "edge-static-shunt",
    value: 3,
    name: "Static Shunt",
    timing: "After a failed Challenge roll",
    ability: "Choose and ignore one pending non-Wound failure effect.",
    tradeoff: "The Challenge still counts as failed."
  },
  {
    id: "edge-echo-recast",
    value: 4,
    name: "Echo Recast",
    timing: "After a battle or Challenge roll",
    ability: "Reroll one die from your battle or Challenge.",
    tradeoff: "Accept the second result."
  },
  {
    id: "edge-quiet-ledger",
    value: 5,
    name: "Quiet Ledger",
    timing: "Before a paid shop action",
    ability: "Reduce one Gear purchase or service by 1 Salvage.",
    tradeoff: "The final cost cannot be lower than 1 Salvage."
  },
  {
    id: "edge-low-signal-discipline",
    value: 6,
    name: "Low-Signal Discipline",
    timing: "After a battle or Challenge roll",
    ability: "Change one natural result of 1 to a 2.",
    tradeoff: "This is not a reroll and cannot trigger roll-based bonuses."
  }
];

const grid = document.querySelector("#edge-grid");
const filters = [...document.querySelectorAll("[data-filter]")];
const commitButton = document.querySelector("#commit-mode");
const abilityButton = document.querySelector("#ability-mode");
const phoneValue = document.querySelector("#phone-value");
const phoneArt = document.querySelector("#phone-art");
const phoneValueLabel = document.querySelector("#phone-value-label");
const phoneValueNote = document.querySelector("#phone-value-note");
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
const tvArt = document.querySelector("#tv-preview-art");
const tvAction = document.querySelector("#tv-preview-action");
const tvMode = document.querySelector("#tv-preview-mode");
const tvResultCopy = document.querySelector("#tv-preview-result-copy");

let selectedCard = cards[3];
let selectedMode = "commit";
let previewTimers = [];

function calibrationSpine(value) {
  return Array.from({ length: 6 }, (_, index) => {
    const pip = index + 1;
    return `<span class="${pip <= value ? "is-lit" : ""}" aria-hidden="true"></span>`;
  }).join("");
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
            <span class="edge-card__meta">
              <span>Private reserve</span>
              <span class="edge-card__value"><b>${card.value}</b></span>
            </span>
            <img class="edge-card__art" src="/assets/cards/edge/${card.id}.phone.webp" alt="" />
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
  phoneArt.src = `/assets/cards/edge/${selectedCard.id}.phone.webp`;
  phoneTitle.textContent = selectedCard.name;
  phoneTiming.textContent =
    selectedMode === "commit" ? "Before an eligible roll" : selectedCard.timing;
  phoneValueLabel.textContent = selectedMode === "commit" ? "Commit value" : "Printed value";
  phoneValueNote.textContent = selectedMode === "commit"
    ? "No explosion · no reroll"
    : "Ability mode · card consumed";
  commitButton.textContent = `Commit ${selectedCard.value}`;
  commitButton.classList.toggle("is-active", selectedMode === "commit");
  abilityButton.classList.toggle("is-active", selectedMode === "ability");
  phoneModeLabel.textContent = selectedMode === "commit" ? "COMMIT MODE" : "ABILITY MODE";
  phoneAbility.textContent = selectedMode === "commit"
    ? `Use ${selectedCard.value} as one die in your next enemy battle or Hazard Challenge.`
    : selectedCard.ability;
  phoneTradeoff.textContent = selectedMode === "commit"
    ? "The committed result cannot explode or be rerolled."
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
