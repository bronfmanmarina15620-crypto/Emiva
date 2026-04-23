// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeelingPrompt } from "@/components/FeelingPrompt";

describe("<FeelingPrompt>", () => {
  it("renders three labeled buttons", () => {
    render(<FeelingPrompt onRate={() => {}} />);
    expect(screen.getByRole("button", { name: "כיף" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "בסדר" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "קשה" })).toBeInTheDocument();
  });

  it("clicking 😊 calls onRate('happy') then shows thanks", async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<FeelingPrompt onRate={onRate} />);
    await user.click(screen.getByRole("button", { name: "כיף" }));
    expect(onRate).toHaveBeenCalledWith("happy");
    expect(screen.getByText(/תודה ששיתפת/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "בסדר" })).not.toBeInTheDocument();
  });

  it("clicking 😐 calls onRate('ok')", async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<FeelingPrompt onRate={onRate} />);
    await user.click(screen.getByRole("button", { name: "בסדר" }));
    expect(onRate).toHaveBeenCalledWith("ok");
  });

  it("clicking 😟 calls onRate('hard')", async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<FeelingPrompt onRate={onRate} />);
    await user.click(screen.getByRole("button", { name: "קשה" }));
    expect(onRate).toHaveBeenCalledWith("hard");
  });

  it("after rating, buttons disappear and further onRate calls are impossible", async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<FeelingPrompt onRate={onRate} />);
    await user.click(screen.getByRole("button", { name: "כיף" }));
    expect(onRate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "כיף" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "בסדר" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "קשה" })).not.toBeInTheDocument();
  });
});
