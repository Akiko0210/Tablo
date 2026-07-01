import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "../quantity-stepper";

describe("QuantityStepper", () => {
  it("renders the current value", () => {
    render(<QuantityStepper value={3} onChange={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("increments and decrements via the buttons", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} />);

    await user.click(screen.getByLabelText("Increase quantity"));
    await user.click(screen.getByLabelText("Decrease quantity"));

    expect(onChange).toHaveBeenNthCalledWith(1, 3);
    expect(onChange).toHaveBeenNthCalledWith(2, 1);
  });

  it("disables the decrement button at the minimum", () => {
    render(<QuantityStepper value={1} min={1} onChange={() => {}} />);
    expect(screen.getByLabelText("Decrease quantity")).toBeDisabled();
  });
});
