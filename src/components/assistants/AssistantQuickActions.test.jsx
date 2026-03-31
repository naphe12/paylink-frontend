import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AssistantQuickActions from "@/components/assistants/AssistantQuickActions";

describe("AssistantQuickActions", () => {
  it("builds contextual prompts for transfer support and emits clicks", () => {
    const onPick = vi.fn();

    render(
      <AssistantQuickActions
        assistantKey="transfer_support"
        summary={{
          reference_code: "EXT-AB12CD34",
          next_step: "Attendre la validation",
          eta_hint: "Validation prochaine",
        }}
        onPick={onPick}
      />
    );

    expect(screen.getByText("suis la reference EXT-AB12CD34")).toBeInTheDocument();
    expect(screen.getByText("quelle est la prochaine action recommandee pour ce transfert ?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("quel est le delai probable pour ce transfert ?"));

    expect(onPick).toHaveBeenCalledWith("quel est le delai probable pour ce transfert ?");
  });
});
