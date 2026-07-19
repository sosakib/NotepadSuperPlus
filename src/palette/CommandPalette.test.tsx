import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette.tsx";
import { useUiStore } from "../state/ui.ts";

beforeEach(() => {
  useUiStore.setState({ paletteOpen: false, viewMode: "source", sidebarCollapsed: false });
});

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lists commands when open and filters by query", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ paletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByRole("dialog", { name: "Command Palette" })).toBeInTheDocument();

    await user.type(screen.getByRole("combobox"), "split");
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0]).toHaveTextContent(/Split/i);
  });

  it("runs the selected command on Enter and closes", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ paletteOpen: true });
    render(<CommandPalette />);

    await user.type(screen.getByRole("combobox"), "split");
    await user.keyboard("{Enter}");

    expect(useUiStore.getState().viewMode).toBe("split");
    expect(useUiStore.getState().paletteOpen).toBe(false);
  });

  it("shows an empty message when nothing matches", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ paletteOpen: true });
    render(<CommandPalette />);
    await user.type(screen.getByRole("combobox"), "zzzzzzz");
    expect(screen.getByText("No matching commands")).toBeInTheDocument();
  });
});
