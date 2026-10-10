// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/program-builder/shared/BuildProgramSkeletonSSR", () => ({
    BuildProgramSkeletonSSR: () => null,
}));
vi.mock("@/app/(app)/(with-toolbar)/build-program/BuildProgram", () => ({
    BuildProgram: () => null,
}));

import BuildProgramPage from "@/app/(app)/(with-toolbar)/build-program/page";

describe("build-program page.tsx", () => {
    it("wraps the page with min-h-0 and overflow-hidden to prevent double scroll", () => {
        render(<BuildProgramPage />);

        const wrapper = document.querySelector(".min-h-0");
        expect(wrapper).toBeTruthy();

        const className = wrapper?.className ?? "";
        expect(className).toContain("min-h-0");
        expect(className).toContain("overflow-hidden");
        expect(className).toContain("flex-1");
        expect(className).toContain("flex");
        expect(className).toContain("flex-col");
    });
});

