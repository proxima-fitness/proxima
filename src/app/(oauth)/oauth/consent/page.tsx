/* eslint-disable @next/next/no-img-element */
/**
 * @module oauth/consent
 * OAuth 2.1 consent screen for MCP / third-party clients.
 * Depends on: @/utils/supabase/server, UI Button, public logo assets.
 * Used by: Supabase Auth authorization redirects (Site URL + /oauth/consent)
 */

import { Button } from '@/components/ui/button';
import { buildAuthLoginHrefFromNext } from '@/lib/sign-in-return';
import { createClient } from '@/utils/supabase/server';
import { ArrowLeftRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { proxima_logo_black, proxima_logo_white } from 'public';

const ACCESS_LABELS: Record<string, string> = {
    openid: 'Identity',
    email: 'Email',
    profile: 'Profile',
    offline_access: 'Offline access',
};

/**
 * @param scope - Raw OAuth scope token from the authorization request.
 */
function formatAccessLabel(scope: string): string {
    return ACCESS_LABELS[scope] ?? scope;
}

/**
 * Centered consent surface: client ↔ Proxima, details, approve/cancel.
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
                <ConsentError
                    title="Invalid request"
                    description="This authorization link is missing required details. Start the connection again from your MCP client."
                />
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
                <ConsentError
                    title="Authorization unavailable"
                    description={
                        error?.message ||
                        'Invalid authorization request. Start again from your MCP client.'
                    }
                />
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
            : authDetails.user.email || null;
    const accessLabel =
        scopes.length > 0
            ? scopes.map(formatAccessLabel).join(', ')
            : 'Account access';
    const clientName = authDetails.client.name;
    const clientLogoUri = authDetails.client.logo_uri?.trim() || null;

    return (
        <ConsentShell>
            <div className="flex flex-col items-center text-center">
                <div className="mb-8 flex items-center gap-3">
                    <ClientMark name={clientName} logoUri={clientLogoUri} />
                    <ArrowLeftRight
                        aria-hidden
                        className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500"
                    />
                    <ProximaMark />
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white sm:text-[1.75rem]">
                    {clientName}
                    {' '}
                    is requesting access
                </h1>
            </div>

            <div className="mt-8 text-left">
                <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Details
                </p>
                <dl className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
                    <DetailRow label="Name" value={clientName} />
                    <DetailRow
                        label="Redirect URIs"
                        value={authDetails.redirect_uri}
                        mono
                    />
                    <DetailRow label="Access" value={accessLabel} last />
                </dl>
            </div>

            <div className="mt-6 space-y-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                <p>
                    {clientName}
                    {' '}
                    is requesting access to your Proxima account
                    {accountEmail ? (
                        <>
                            {' '}
                            (
                            <span className="text-neutral-800 dark:text-neutral-200">
                                {accountEmail}
                            </span>
                            )
                        </>
                    ) : null}
                    .
                </p>
                <p>
                    You can revoke access later from your Proxima account settings.
                </p>
            </div>

            <div className="mt-10 flex justify-end gap-3">
                <form action="/oauth/decision" method="POST">
                    <input type="hidden" name="authorization_id" value={authorizationId} />
                    <Button
                        type="submit"
                        name="decision"
                        value="deny"
                        className="h-10 rounded-full bg-neutral-200 px-5 text-neutral-900 shadow-none hover:bg-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                    >
                        Cancel
                    </Button>
                </form>
                <form action="/oauth/decision" method="POST">
                    <input type="hidden" name="authorization_id" value={authorizationId} />
                    <Button
                        type="submit"
                        name="decision"
                        value="approve"
                        className="h-10 rounded-full bg-lightSecondary px-5 text-white shadow-none hover:bg-lightSecondary/90"
                    >
                        Approve
                    </Button>
                </form>
            </div>
        </ConsentShell>
    );
}

/**
 * Full-viewport centered shell: white in light mode, near-black in dark mode.
 *
 * @param props.children - Consent content.
 */
function ConsentShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-white p-6 dark:bg-black md:p-10">
            <div className="w-full max-w-[440px]">{children}</div>
        </div>
    );
}

/**
 * Minimal error state matching the consent surface.
 *
 * @param props.title - Short error title.
 * @param props.description - Recovery guidance.
 */
function ConsentError({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="text-center">
            <ProximaMark className="mx-auto mb-8" />
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {description}
            </p>
        </div>
    );
}

/**
 * Rounded app mark for the requesting OAuth client.
 *
 * @param props.name - Client display name (initial fallback).
 * @param props.logoUri - Optional client logo URL from registration.
 */
function ClientMark({
    name,
    logoUri,
}: {
    name: string;
    logoUri: string | null;
}) {
    const initial = name.trim().charAt(0).toUpperCase() || '?';

    return (
        <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950">
            {logoUri ? (
                <img
                    src={logoUri}
                    alt=""
                    className="size-full object-cover"
                />
            ) : (
                <span className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
                    {initial}
                </span>
            )}
        </div>
    );
}

/**
 * Rounded Proxima mark for the resource-server side of the icon pair.
 *
 * @param props.className - Optional layout classes (e.g. centering on errors).
 */
function ProximaMark({ className }: { className?: string }) {
    return (
        <div
            className={`flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 ${className ?? ''}`}
        >
            <img
                src={proxima_logo_black.src}
                alt="Proxima"
                className="size-8 object-contain dark:hidden"
            />
            <img
                src={proxima_logo_white.src}
                alt="Proxima"
                className="hidden size-8 object-contain dark:block"
            />
        </div>
    );
}

/**
 * One row in the Details panel.
 *
 * @param props.label - Left-column label.
 * @param props.value - Right-column value.
 * @param props.mono - Break long URIs cleanly.
 * @param props.last - Skip bottom border on the final row.
 */
function DetailRow({
    label,
    value,
    mono = false,
    last = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
    last?: boolean;
}) {
    return (
        <div
            className={`grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3.5 text-sm sm:grid-cols-[8.5rem_1fr] ${
                last ? '' : 'border-b border-neutral-200 dark:border-neutral-800'
            }`}
        >
            <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
            <dd
                className={`min-w-0 break-all text-neutral-950 dark:text-white ${
                    mono ? 'font-mono text-[13px] leading-snug' : ''
                }`}
            >
                {value}
            </dd>
        </div>
    );
}
