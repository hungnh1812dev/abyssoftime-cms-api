import { Card, CardContent, CardHeader } from "../card";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Card", () => {
  it("renders children", () => {
    render(
      <Card>
        <p>Content</p>
      </Card>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("has card styling classes", () => {
    const { container } = render(<Card>Test</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-card");
    expect(el.className).toContain("border");
    expect(el.className).toContain("rounded-lg");
    expect(el.className).toContain("shadow-sm");
  });
});

describe("CardHeader", () => {
  it("renders children with header styling", () => {
    render(<CardHeader>Title</CardHeader>);
    const el = screen.getByText("Title");
    expect(el.className).toContain("px-6");
    expect(el.className).toContain("py-4");
    expect(el.className).toContain("border-b");
  });
});

describe("CardContent", () => {
  it("renders children with content padding", () => {
    render(<CardContent>Body</CardContent>);
    const el = screen.getByText("Body");
    expect(el.className).toContain("p-6");
  });
});
