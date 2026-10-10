/**
 * @module oauth/decision
 * Approves or denies an OAuth authorization request.
 * Depends on: @/utils/supabase/server
 * Used by: /oauth/consent form POST
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const formData = await request.formData();
    const decision = formData.get('decision');
    const authorizationId = formData.get('authorization_id') as string;

    if (!authorizationId) {
        return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 });
    }

    const supabase = await createClient();

    // 303 (not Next's default 307): OAuth clients like Claude.ai only accept GET on
    // the auth callback. 307 preserves POST from the consent form and yields 405.
    // See https://github.com/anthropics/claude-ai-mcp/issues/109
    if (decision === 'approve') {
        const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.redirect(data.redirect_url, 303);
    }

    const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.redirect(data.redirect_url, 303);
}
