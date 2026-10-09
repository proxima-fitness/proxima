/**
 * @module oauth/consent
 * OAuth 2.1 consent screen for MCP / third-party clients.
 * Depends on: @/utils/supabase/server
 * Used by: Supabase Auth authorization redirects (Site URL + /oauth/consent)
 */

import { buildAuthLoginHrefFromNext } from '@/lib/sign-in-return';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ConsentPage({
    searchParams,
}: {
    searchParams: Promise<{ authorization_id?: string }>;
}) {
    const authorizationId = (await searchParams).authorization_id;

    if (!authorizationId) {
        return <div>Error: Missing authorization_id</div>;
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
        return <div>Error: {error?.message || 'Invalid authorization request'}</div>;
    }

    if (!('authorization_id' in authDetails)) {
        redirect(authDetails.redirect_url);
    }

    return (
        <div>
            <h1>Authorize {authDetails.client.name}</h1>
            <p>This application wants to access your account.</p>

            <div>
                <p>
                    <strong>Client:</strong> {authDetails.client.name}
                </p>
                <p>
                    <strong>Redirect URI:</strong> {authDetails.redirect_uri}
                </p>
                {authDetails.scope && authDetails.scope.trim() && (
                    <div>
                        <strong>Requested permissions:</strong>
                        <ul>
                            {authDetails.scope.split(' ').map((scopeItem) => (
                                <li key={scopeItem}>{scopeItem}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <form action="/oauth/decision" method="POST">
                <input type="hidden" name="authorization_id" value={authorizationId} />
                <button type="submit" name="decision" value="approve">
                    Approve
                </button>
                <button type="submit" name="decision" value="deny">
                    Deny
                </button>
            </form>
        </div>
    );
}
