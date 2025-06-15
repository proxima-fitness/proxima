import { Suspense } from 'react'
import { ProgramsFallback } from '@/components/generic/ProgramsFallback';
import { AuthCallback } from '@/components/auth/auth-callback';

export default function CallbackPage() {

    return (
        <Suspense fallback={ <ProgramsFallback /> }>
            <AuthCallback />
        </Suspense>
    )
}
