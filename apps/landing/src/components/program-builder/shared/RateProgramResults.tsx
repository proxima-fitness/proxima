// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * Renders bodybuilding program score output using ai-elements test-results primitives.
 */
import {
    Test,
    TestName,
    TestResults,
    TestResultsContent,
    TestResultsHeader,
    TestResultsProgress,
    TestResultsSummary,
    TestStatus,
    TestSuite,
    TestSuiteContent,
    TestSuiteName,
} from "@/components/ai-elements/test-results";
import type { IProgramScore, IProgramScoreSuite } from "@/components/program-builder/utils/score-program";

function suiteStatus(suite: IProgramScoreSuite): TTestStatus {
    if (suite.tests.some((t) => t.status === "failed")) return "failed";
    if (suite.tests.some((t) => t.status === "okay")) return "okay";
    return "passed";
}

export interface IRateProgramResultsProps {
    score: IProgramScore;
}

export function RateProgramResults({ score }: IRateProgramResultsProps) {
    if (score.emptyProgram || score.summary.total === 0) {
        return (
            <p className="text-muted-foreground text-sm px-1 py-2">
                {score.headline}
            </p>
        );
    }

    const { passed, failed, okay, total } = score.summary;

    return (
        <TestResults
            className="border-0 bg-transparent"
            summary={{ passed, failed, okay, total }}
        >
            <TestResultsHeader>
                    <span className="font-medium text-sm">Program report card</span>
                    <span className="text-muted-foreground text-xs">{score.headline}</span>
                <TestResultsSummary />
            </TestResultsHeader>
            <TestResultsContent className="space-y-4 pt-0">
                <TestResultsProgress />
                {score.suites.map((suite) => (
                    <TestSuite key={suite.id} name={suite.name} status={suiteStatus(suite)} defaultOpen>
                        <TestSuiteName>{suite.name}</TestSuiteName>
                        <TestSuiteContent>
                            {suite.tests.map((t) => (
                                <Test key={t.id} name={t.name} status={t.status as TTestStatus}>
                                    <div className="flex min-w-0 w-full flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <TestStatus />
                                            <TestName />
                                        </div>
                                        {t.detail ? (
                                            <p className="text-muted-foreground pl-6 text-xs leading-snug">
                                                {t.detail}
                                            </p>
                                        ) : null}
                                    </div>
                                </Test>
                            ))}
                        </TestSuiteContent>
                    </TestSuite>
                ))}
            </TestResultsContent>
        </TestResults>
    );
}
