import "../../styles/global.css";
import { Prompt } from '@/components/program-builder/shared/Prompt';
import { createClient } from "@/utils/supabase/server";
import { CallToAction } from "@/components/call-to-action/CallToAction";
import styles from "@/style";

export function generateStaticParams() {
  return [{ slug: [''] }];
}

export default async function Page() {

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className={ `bg-white dark:bg-darkGray` }>
            <Prompt userData={ user } />
            <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <CallToAction />
                </div>
            </div>
        </div>
    );
}
