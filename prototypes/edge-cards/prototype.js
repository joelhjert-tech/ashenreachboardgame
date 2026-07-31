const cards = [
  { value: 1, name: "Cinderline Break" },
  { value: 2, name: "Ashglass Overclock" },
  { value: 3, name: "Static Shunt" },
  { value: 4, name: "Echo Recast" },
  { value: 5, name: "Quiet Ledger" },
  { value: 6, name: "Low-Signal Discipline" }
];

const grid = document.querySelector("#edge-grid");
const filters = [...document.querySelectorAll("[data-filter]")];
const commitButton = document.querySelector("#commit-mode");
const phoneValue = document.querySelector("#phone-value");
const phoneTitle = document.querySelector("#phone-title");
const phoneTiming = document.querySelector("#phone-timing");
const phoneAbility = document.querySelector("#phone-ability");
const phoneConfirm = document.querySelector(".phone-confirm");
const tvPreview = document.querySelector("#tv-preview");
const tvClose = document.querySelector(".tv-preview__close");
const tvValue = document.querySelector("#tv-preview-value");
const tvTitle = document.querySelector("#tv-preview-title");
const tvResult = document.querySelector("#tv-preview-result");
const tvResultName = document.querySelector("#tv-preview-result-name");

let selectedCard = cards[3];
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
            <h3>${card.name}</h3>
            <span class="edge-card__timing">Before an eligible roll</span>
            <span class="edge-card__ability">
              Lock this value as one die. The server rolls the second die.
            </span>
            <span class="edge-card__tradeoff">
              Burn after use. The locked die cannot be rerolled.
            </span>
            <span class="edge-card__footer">
              <span>Edge deck · live</span>
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
      renderCards();
      updatePhone();
    });
  });

  applyActiveFilter();
}

function updatePhone() {
  phoneValue.textContent = String(selectedCard.value);
  phoneTitle.textContent = selectedCard.name;
  phoneTiming.textContent = "Before an eligible roll";
  commitButton.textContent = `Commit ${selectedCard.value}`;
  phoneAbility.textContent =
    `Use ${selectedCard.value} as one die in your next enemy battle or Hazard Challenge.`;
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

commitButton.addEventListener("click", updatePhone);
phoneConfirm.addEventListener("click", previewTvReveal);
tvClose.addEventListener("click", closePreview);

renderCards();
updatePhone();
