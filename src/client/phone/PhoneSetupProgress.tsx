import type { ReactElement } from "react";

export function PhoneSetupProgress({ step }: { step: 1 | 2 | 3 | 4 | 5 }): ReactElement {
  return <ol className="phone-setup-progress" aria-label={`Setup progress, step ${step} of 5`}>
    {["Piece", "Operative", "Contract", "Provisions", "Ready"].map((label, index) => (
      <li key={label} aria-current={index + 1 === step ? "step" : undefined} data-complete={index + 1 < step}>
        <span aria-hidden="true">{index + 1 < step ? "✓" : index + 1}</span>{label}
      </li>
    ))}
  </ol>;
}
