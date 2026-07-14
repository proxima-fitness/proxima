import { NextResponse } from 'next/server';
import type { Json } from '@/hooks/supabase';
import { createClient } from '@/utils/supabase/server';
import { getChatHistoryById } from '@/api/chat-history';
import { getUserConstraints } from '@/api/user-constraints';
import { insertSessionEpisode } from '@/api/session-episodes';
import { generateSessionSummary } from '../constraints/summarize';
import { initializeConstraintProfile } from '../constraints';

export async function POST(req: Request) {
    try {
        const { chatId, programId } = await req.json();

        if (!chatId) {
            return NextResponse.json({ error: 'chatId required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch conversation
        const conversation = await getChatHistoryById(user, chatId);
        if (!conversation || conversation.length === 0) {
            return NextResponse.json({ error: 'No conversation found' }, { status: 404 });
        }

        // Dedup: skip if episode already exists for this chat
        const { data: existingEpisode } = await supabase
            .from('session_episodes')
            .select('id')
            .eq('chat_id', chatId)
            .maybeSingle();
        if (existingEpisode) {
            return NextResponse.json({ success: true, deduplicated: true });
        }

        // Get current constraint profile
        const persistedConstraints = await getUserConstraints(supabase, user.id);
        const constraintProfile = persistedConstraints ?? initializeConstraintProfile({});

        // Generate summary — map UIMessages to the shape the summarizer expects
        const messagesForSummary = conversation.map(m => ({
            role: m.role ?? 'user',
            content: (m.parts ?? [])
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map(p => p.text)
                .join(' ') || '',
        }));
        const { summary, keyDecisions } = await generateSessionSummary(
            messagesForSummary,
            constraintProfile,
        );

        // Insert episode
        await insertSessionEpisode(supabase, {
            user_id: user.id,
            chat_id: chatId,
            program_id: typeof programId === 'number' ? programId : undefined,
            summary,
            key_decisions: keyDecisions,
            constraints_snapshot: JSON.parse(JSON.stringify(constraintProfile)) as Json,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[summarize-episode] failed:', error);
        return NextResponse.json({ error: 'Failed to generate episode' }, { status: 500 });
    }
}
