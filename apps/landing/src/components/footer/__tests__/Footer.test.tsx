// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Footer Useful Links include the Public API developer docs.
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

describe("Footer", () => {
    afterEach(() => {
        cleanup();
    });

    it("links Developers to the Public API reference", () => {
        render(<Footer />);

        const link = screen.getByRole("link", { name: "Developers" });
        expect(link.getAttribute("href")).toBe("/developers");
    });
});
