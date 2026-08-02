// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Calendar } from "./calendar";

describe("Calendar (react-day-picker v9)", () => {
  it("renders without throwing and shows the current month's caption", () => {
    render(<Calendar mode="single" selected={undefined} onSelect={() => {}} />);

    // Smoke-checks the v9 classNames/components migration: if any v8-era
    // key (e.g. IconLeft/day_selected) were still in use, DayPicker would
    // either throw or silently fail to render the caption/grid.
    const monthName = new Date().toLocaleString("en-US", { month: "long" });
    expect(screen.getByText(new RegExp(monthName, "i"))).toBeInTheDocument();
  });

  it("renders navigation chevrons via the custom Chevron component", () => {
    const { container } = render(
      <Calendar mode="single" selected={undefined} onSelect={() => {}} />
    );

    // lucide's ChevronLeft/ChevronRight render as <svg> elements.
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it("marks a selected day with the selected styling", () => {
    // Pick a mid-month date so it's unambiguously in the current month
    // (avoids the leading/trailing "outside" days from adjacent months).
    const selected = new Date();
    selected.setDate(15);
    render(<Calendar mode="single" selected={selected} onSelect={() => {}} />);

    const dayButton = screen.getByRole("button", { name: /, selected$/ });
    expect(dayButton).toHaveAccessibleName(new RegExp(`\\b${selected.getDate()}\\w*,`));
  });
});
