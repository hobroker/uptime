import { describe, it, expect } from "vitest";
import { parseTemplate } from "./parseTemplate";

describe("parseTemplate", () => {
  it("renders interpolated values", () => {
    const render = parseTemplate<{ name: string }>(`Hello {{ name }}`);
    expect(render({ name: "world" })).toBe("Hello world");
  });

  it("trims surrounding whitespace", () => {
    const render = parseTemplate<{ name: string }>(`\n  {{ name }}  \n`);
    expect(render({ name: "x" })).toBe("x");
  });

  // Security regression guard: notification templates render user/upstream-
  // influenced values (e.g. a check's error text) into Telegram messages sent
  // with parse_mode: HTML. The engine must HTML-escape interpolated output so
  // that content cannot inject markup. This pins `outputEscape: "escape"`.
  it("HTML-escapes interpolated values to prevent injection", () => {
    const render = parseTemplate<{ error: string }>(`<code>{{ error }}</code>`);
    const output = render({
      error: '<script>alert(1)</script> & "quoted" <b>bold</b>',
    });

    expect(output).not.toContain("<script>");
    expect(output).not.toContain("<b>bold</b>");
    expect(output).toContain("&lt;script&gt;");
    expect(output).toContain("&amp;");
    // The literal markup in the template itself is preserved.
    expect(output.startsWith("<code>")).toBe(true);
    expect(output.endsWith("</code>")).toBe(true);
  });
});
