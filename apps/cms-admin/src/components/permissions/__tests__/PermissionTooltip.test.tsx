import { PermissionTooltip } from "../PermissionTooltip";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("PermissionTooltip", () => {
  it("renders the child unmodified when the permission is allowed", () => {
    mockUseAuth.mockReturnValue({ permissions: ["role:manager"] });
    render(
      <PermissionTooltip required="role:manager">
        <button>Delete</button>
      </PermissionTooltip>,
    );

    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn).not.toBeDisabled();
    expect(btn.closest("span[tabindex]")).toBeNull();
  });

  it("disables the child and wraps it in a focusable tooltip trigger when denied", () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    render(
      <PermissionTooltip required="role:manager">
        <button>Delete</button>
      </PermissionTooltip>,
    );

    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn).toBeDisabled();

    const trigger = btn.closest("span");
    expect(trigger).not.toBeNull();
    expect(trigger).not.toHaveAttribute("disabled");
    expect(trigger).toHaveAttribute("tabindex", "0");
  });
});
