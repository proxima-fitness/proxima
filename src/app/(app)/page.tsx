import "../../styles/global.css";
import { Prompt } from '@/components/program-builder/shared/Prompt';
import { createClient } from "@/utils/supabase/server";

export function generateStaticParams() {
  return [{ slug: [''] }];
}

export default async function Page() {

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className={ `bg-white dark:bg-darkGray` }>
            <Prompt userData={ user } />
        </div>
    );
}
