import styles from "@/style";
import { Prompt } from "@/components/program-builder/shared/Prompt";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Create a workout program by chatting with AI",
};

export default async function AiChat() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className={ `bg-white ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <Prompt userData={ user } />
            </div>
        </div>
    );
}
