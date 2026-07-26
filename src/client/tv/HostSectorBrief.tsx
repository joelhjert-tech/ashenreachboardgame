import type { ReactElement } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CardsThreeIcon } from "@phosphor-icons/react/dist/csr/CardsThree";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { MapPinLineIcon } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";
import type { HostMapSectorBriefPresentation } from "./hostMapPresentation.js";

interface HostSectorBriefProps {
  brief: HostMapSectorBriefPresentation;
}
function focusLabel(focus: HostMapSectorBriefPresentation["focus"]): string {
  if (focus === "destination-preview") return "Destination preview";
  if (focus === "arrival") return "Arrival sector";
  if (focus === "current-sector") return "Current sector";
  return "Sector brief";
}

export function HostSectorBrief({ brief }: HostSectorBriefProps): ReactElement {
  const immediateRows = [
    brief.challenge ? { label: "Challenge", value: brief.challenge, tone: "danger" } : null,
    brief.publicThreat ? { label: "Threat", value: brief.publicThreat, tone: "danger" } : null,
    brief.shop ? { label: "Service", value: brief.shop, tone: "opportunity" } : null,
    brief.objective ? { label: "Objective", value: brief.objective, tone: "objective" } : null,
    brief.scenario ? { label: "Scenario", value: brief.scenario, tone: "scenario" } : null,
    brief.specialConnection ? { label: "Connection", value: brief.specialConnection, tone: "route" } : null
  ].filter((entry): entry is { label: string; value: string; tone: string } => Boolean(entry));
  const queueIcon = (kind: HostMapSectorBriefPresentation["arrivalQueue"][number]["kind"]) =>
    kind === "tile-challenge" ? ArrowClockwiseIcon
      : kind === "threat-draw" ? CardsThreeIcon
        : kind === "scenario" ? FlagIcon
          : kind === "service" ? StorefrontIcon
            : MapPinLineIcon;

  return (
    <aside
      className={`host-sector-brief host-sector-brief--${brief.placement}`}
      aria-label={`${brief.name} sector brief`}
      data-testid="host-sector-brief"
      data-focus={brief.focus}
    >
      <header>
        <span>{focusLabel(brief.focus)}</span>
        <strong>{brief.name}</strong>
        <small>{brief.region}</small>
      </header>

      {brief.routeContext ? <p className="host-sector-brief__route" aria-label={`Route: ${brief.routeContext}`}>{brief.routeContext}</p> : null}

      {brief.arrivalQueue.length > 0 ? (
        <ol className="host-sector-brief__arrival-queue" aria-label="Public arrival queue">
          {brief.arrivalQueue.slice(0, 4).map((rule) => {
            const RuleIcon = queueIcon(rule.kind);
            const StatusIcon = rule.status === "completed" ? CheckCircleIcon : CircleIcon;
            return (
              <li key={rule.id} className={`is-${rule.status}`}>
                <RuleIcon weight="duotone" aria-hidden="true" />
                <strong>{rule.label}</strong>
                <span><StatusIcon weight="fill" aria-hidden="true" />{rule.status === "completed" && rule.recurring ? "Done · recurs" : rule.status}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {immediateRows.length > 0 ? (
        <div className="host-sector-brief__signals" aria-label="Public sector conditions">
          {immediateRows.slice(0, 4).map((row) => (
            <p key={`${row.label}-${row.value}`} className={`is-${row.tone}`}>
              <span>{row.label}</span><strong>{row.value}</strong>
            </p>
          ))}
        </div>
      ) : null}

      {brief.occupants.length > 0 ? (
        <section className="host-sector-brief__occupants" aria-label={`${brief.occupants.length} public occupants`}>
          <h3>Operatives · {brief.occupants.length}</h3>
          <div>
            {brief.occupants.map((occupant) => (
              <span key={occupant.seatId} className={occupant.active ? "is-active" : undefined}>
                {occupant.active ? "Active · " : ""}{occupant.playerName}<small>{occupant.operativeName}</small>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {brief.immediateRule ? <p className="host-sector-brief__rule"><span>Public rule</span>{brief.immediateRule}</p> : null}
      {brief.service ? <p className="host-sector-brief__service">{brief.service}</p> : null}
      {brief.lore ? <p className="host-sector-brief__lore">{brief.lore}</p> : null}
      {brief.tags.length > 0 ? <div className="host-sector-brief__tags" aria-label="Public sector tags">{brief.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
    </aside>
  );
}
