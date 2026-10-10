/* eslint-disable @next/next/no-img-element */
/**
 * @module oauth/consent
 * OAuth 2.1 consent screen for MCP / third-party clients.
 * Depends on: @/utils/supabase/server, UI Card/Button, public logo assets.
 * Used by: Supabase Auth authorization redirects (Site URL + /oauth/consent)
 */

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { buildAuthLoginHrefFromNext } from '@/lib/sign-in-return';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { proxima_logo_dark_full_text, proxima_logo_white_full_text } from 'public';

const SCOPE_LABELS: Record<string, string> = {
    openid: 'Verify your identity',
    email: 'View your email address',
    profile: 'View your basic profile information',
    offline_access: 'Keep access when you are offline',
};

/**
 * @param scope - Raw OAuth scope token from the authorization request.
 */
function formatScopeLabel(scope: string): string {
    return SCOPE_LABELS[scope] ?? scope;
}

/**
 * @param redirectUri - Registered redirect URI for the OAuth client.
 */
function formatRedirectHost(redirectUri: string): string {
    try {
        return new URL(redirectUri).host;
    } catch {
        return redirectUri;
    }
}

/**
 * Centered consent card: client name, scopes, approve/deny.
 *
 * @param props.searchParams - Must include authorization_id from Supabase Auth.
 */
export default async function ConsentPage({
    searchParams,
}: {
    searchParams: Promise<{ authorization_id?: string }>;
}) {
    const authorizationId = (await searchParams).authorization_id;

    if (!authorizationId) {
        return (
            <ConsentShell>
                <Card className="bg-lightGray dark:bg-extraDarkGray dark:text-white">
                    <CardHeader>
                        <CardTitle className="text-2xl">Invalid request</CardTitle>
                        <CardDescription>
                            This authorization link is missing required details. Start the connection
                            again from your MCP client.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </ConsentShell>
        );
    }

    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (!claims) {
        redirect(
            buildAuthLoginHrefFromNext(
                `/oauth/consent?authorization_id=${authorizationId}`,
            ),
        );
    }

    const { data: authDetails, error } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

    if (error || !authDetails) {
        return (
            <ConsentShell>
                <Card className="bg-lightGray dark:bg-extraDarkGray dark:text-white">
                    <CardHeader>
                        <CardTitle className="text-2xl">Authorization unavailable</CardTitle>
                        <CardDescription>
                            {error?.message || 'Invalid authorization request. Start again from your MCP client.'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </ConsentShell>
        );
    }

    if (!('authorization_id' in authDetails)) {
        redirect(authDetails.redirect_url);
    }

    const scopes = authDetails.scope
        ? authDetails.scope.split(' ').filter((scopeItem) => scopeItem.trim().length > 0)
        : [];
    const accountEmail =
        typeof claims.email === 'string' && claims.email.length > 0
            ? claims.email
            : null;
    const redirectHost = formatRedirectHost(authDetails.redirect_uri);

    return (
        <ConsentShell>
            <div className="mb-6 flex justify-center">
                <img
                    src={proxima_logo_white_full_text.src}
                    alt="Proxima"
                    className="hidden h-9 w-auto dark:block"
                />
                <img
                    src={proxima_logo_dark_full_text.src}
                    alt="Proxima"
                    className="block h-9 w-auto dark:hidden"
                />
            </div>

            <Card className="bg-lightGray dark:bg-extraDarkGray dark:text-white">
                <CardHeader className="space-y-3 text-center">
                    <CardTitle className="text-2xl">
                        Authorize {authDetails.client.name}
                    </CardTitle>
                    <CardDescription className="text-base">
                        <span className="font-medium text-foreground">
                            {authDetails.client.name}
                        </span>
                        {' '}
                        wants to access your Proxima account
                        {accountEmail ? (
                            <>
                                {' '}
                                (
                                <span className="font-medium text-foreground">
                                    {accountEmail}
                                </span>
                                )
                            </>
                        ) : null}
                        .
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {scopes.length > 0 ? (
                        <div className="rounded-lg border border-border bg-background/60 p-4 dark:bg-background/20">
                            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                This will allow the app to
                            </p>
                            <ul className="space-y-2.5">
                                {scopes.map((scopeItem) => (
                                    <li
                                        key={scopeItem}
                                        className="flex items-start gap-2.5 text-sm text-foreground"
                                    >
                                        <span
                                            aria-hidden
                                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lightSecondary"
                                        />
                                        <span>{formatScopeLabel(scopeItem)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <div className="space-y-1 text-center text-xs text-muted-foreground">
                        <p>
                            Redirecting to
                            {' '}
                            <span className="font-medium text-foreground">{redirectHost}</span>
                        </p>
                    </div>
                </CardContent>

                <Separator />

                <CardFooter className="flex flex-col gap-3 pt-6 sm:flex-row-reverse">
                    <form action="/oauth/decision" method="POST" className="w-full sm:flex-1">
                        <input type="hidden" name="authorization_id" value={authorizationId} />
                        <Button
                            type="submit"
                            name="decision"
                            value="approve"
                            className="w-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                        >
                            Approve
                        </Button>
                    </form>
                    <form action="/oauth/decision" method="POST" className="w-full sm:flex-1">
                        <input type="hidden" name="authorization_id" value={authorizationId} />
                        <Button
                            type="submit"
                            name="decision"
                            value="deny"
                            variant="outline"
                            className="w-full"
                        >
                            Deny
                        </Button>
                    </form>
                </CardFooter>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
                You can revoke access later from your Proxima account settings.
            </p>
        </ConsentShell>
    );
}

/**
 * Full-viewport centered shell shared by consent success and error states.
 *
 * @param props.children - Card content for the consent flow.
 */
function ConsentShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-white p-6 dark:bg-darkGray md:p-10">
            <div className="w-full max-w-md">{children}</div>
        </div>
    );
}
