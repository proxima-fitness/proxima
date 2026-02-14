"use client";

export function HevyPromoBanner() {
    return (
        <div className="mx-auto mb-8 max-w-xl rounded-xl border border-border bg-muted px-4 py-3 text-center">
            <p className="text-foreground font-medium">
                Hi Hevy user! As a special thank you, enjoy 50% off forever on any plan using code:{" "}
                <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-sm font-semibold">
                    HEVY50
                </code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
                Offer expires April 7th, 2026.
            </p>
        </div>
    );
}
