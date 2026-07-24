import type { Icon } from "@phosphor-icons/react";
import { BackpackIcon } from "@phosphor-icons/react/dist/csr/Backpack";
import { CaretUpIcon } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CrosshairIcon } from "@phosphor-icons/react/dist/csr/Crosshair";
import { DotsThreeOutlineIcon } from "@phosphor-icons/react/dist/csr/DotsThreeOutline";
import { LightningIcon } from "@phosphor-icons/react/dist/csr/Lightning";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { ShieldChevronIcon } from "@phosphor-icons/react/dist/csr/ShieldChevron";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import { SwordIcon } from "@phosphor-icons/react/dist/csr/Sword";
import { UserFocusIcon } from "@phosphor-icons/react/dist/csr/UserFocus";
import type { ReactElement, Ref } from "react";

export type SignalPhoneTab = "player" | "inventory" | "quests" | "move" | "battle" | "shop" | "action";
export type SignalPhoneCommandTab = Extract<SignalPhoneTab, "move" | "battle" | "shop" | "action">;

export const signalPhoneTabLabels: Record<SignalPhoneTab, string> = {
  player: "Player Card",
  inventory: "Inventory",
  quests: "Objectives",
  move: "Move",
  battle: "Battle",
  shop: "Shop",
  action: "Action"
};

const signalPhoneTabIcons: Record<SignalPhoneTab, Icon> = {
  player: UserFocusIcon,
  inventory: BackpackIcon,
  quests: CrosshairIcon,
  move: MapTrifoldIcon,
  battle: SwordIcon,
  shop: StorefrontIcon,
  action: LightningIcon
};

export function SignalPhoneTabIcon({
  tab,
  size = 23
}: {
  tab: SignalPhoneTab;
  size?: number;
}): ReactElement {
  const TabIcon = signalPhoneTabIcons[tab];
  return <TabIcon size={size} weight={tab === "battle" ? "fill" : "duotone"} aria-hidden="true" />;
}

interface SignalPhoneNavigationProps {
  activeTab: SignalPhoneTab;
  commandTab: SignalPhoneCommandTab;
  expanded: boolean;
  onTab: (tab: SignalPhoneTab) => void;
  onMore: () => void;
  moreButtonRef?: Ref<HTMLButtonElement>;
}

export function SignalPhoneNavigation({
  activeTab,
  commandTab,
  expanded,
  onTab,
  onMore,
  moreButtonRef
}: SignalPhoneNavigationProps): ReactElement {
  const primaryTabs: SignalPhoneTab[] = ["player", "inventory", "quests", commandTab];
  const activeLabel = activeTab === "player" ? "Operative — Player Card" : signalPhoneTabLabels[activeTab];

  return (
    <div
      className="signal-phone-nav__primary"
      role="tablist"
      aria-label="Phone navigation"
      aria-hidden={expanded ? "true" : undefined}
      inert={expanded ? true : undefined}
      data-navigation-state={expanded ? "expanded" : "compact"}
    >
      {primaryTabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            data-signal-phone-tab={tab}
            aria-label={tab === "player" ? "Operative — Player Card" : signalPhoneTabLabels[tab]}
            className={active ? "is-active" : ""}
            onClick={() => onTab(tab)}
          >
            <SignalPhoneTabIcon tab={tab} />
            {tab === "inventory" ? <i className="visually-hidden" aria-hidden="true">KIT</i> : null}
            {tab === "action" ? <i className="visually-hidden" aria-hidden="true">ACT</i> : null}
            <span>{tab === "player" ? "Operative" : signalPhoneTabLabels[tab]}</span>
          </button>
        );
      })}
      <button
        ref={moreButtonRef}
        type="button"
        className={expanded ? "is-active" : ""}
        aria-expanded={expanded}
        data-signal-phone-more
        aria-label={`${activeLabel}, current section; show all phone sections`}
        onClick={onMore}
      >
        {expanded
          ? <CaretUpIcon size={23} weight="bold" aria-hidden="true" />
          : <DotsThreeOutlineIcon size={23} weight="fill" aria-hidden="true" />}
        <span>More</span>
      </button>
    </div>
  );
}

export function SignalPhoneMoreHeading(): ReactElement {
  return (
    <div className="signal-phone-more__heading">
      <ShieldChevronIcon size={28} weight="duotone" aria-hidden="true" />
      <div>
        <strong>Command sections</strong>
        <span>Private controls and room actions</span>
      </div>
    </div>
  );
}
