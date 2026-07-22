import type { ReactElement } from "react";
import { ArtworkFrame } from "./ArtworkFrame.js";
import { GameButton } from "./GameButton.js";
import { LiveStatus } from "./LiveStatus.js";

export function SharedPresentationQaFixture(): ReactElement {
  const surface = new URLSearchParams(window.location.search).get("surface") === "tv" ? "tv" : "phone";
  return (
    <main className={`shared-presentation-qa shared-presentation-qa--${surface}`} data-testid="shared-presentation-qa">
      <header>
        <span>P8 deterministic fixture</span>
        <h1>Presentation recovery states</h1>
        <p>Development-only rendering of shared image, action, wrapping, and status primitives.</p>
      </header>
      <section className="shared-presentation-qa__art-grid" aria-label="Artwork fallbacks">
        <article><ArtworkFrame src="/qa/missing-operative.webp" alt="Missing operative portrait" aspectRatio="portrait" fit="cover" fallback="operative" /><strong>Operative</strong></article>
        <article><ArtworkFrame src="/qa/missing-enemy.webp" alt="Missing enemy artwork" aspectRatio="portrait" fit="cover" fallback="enemy" /><strong>Enemy</strong></article>
        <article><ArtworkFrame src="/qa/missing-item.webp" alt="Missing Equipment artwork" aspectRatio="card" fit="contain" fallback="item" /><strong>Equipment</strong></article>
        <article><ArtworkFrame alt="Missing shop environment" aspectRatio="wide" fit="cover" fallback="shop" /><strong>Shop</strong></article>
      </section>
      <section className="shared-presentation-qa__state" aria-label="Action and long-content states">
        <span>ACTION BLOCKED</span>
        <h2>The Ordinance of the Last Unbroken Signal-Bearer</h2>
        <p>Resolve the owner-private choice before attempting this unusually long mechanical action. This sentence proves that essential rules wrap instead of disappearing behind an ellipsis.</p>
        <GameButton tone="primary">Continue the authoritative resolution</GameButton>
        <GameButton disabled disabledReason="Waiting for the owning operative to resolve a private choice">Unavailable action with a complete reason</GameButton>
      </section>
      <LiveStatus message="Presentation fixture ready" revision="p8-fixture" />
    </main>
  );
}
