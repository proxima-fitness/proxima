/**
 * @module (app)/terms-of-use/page
 *
 * Terms of use page. Static legal content (license, account, acceptable use,
 * termination, disclaimer, liability). Sits at src/app/(app)/terms-of-use/page.tsx; route "/terms-of-use".
 *
 * Depends on: none (static markup; theme tokens for surfaces and text).
 * Used by: Next.js (route "/terms-of-use").
 */

export const metadata = {
    title: "Terms Of Use | Proxima Fitness",
    description: "These are the Terms of Use you agree to whilst using Proxima Fitness Inc. products and services",
};

const legalBody =
    "[&_a]:text-secondary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-lightSecondary [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:first:mt-0 [&_p]:leading-relaxed [&_strong]:font-semibold";

/** Terms of use page; static legal text. */
export default function TermsOfUsePage() {
    return (
        <div className="min-h-screen bg-background px-4 py-10 text-foreground">
            <h1 className="mb-8 max-w-3xl mx-auto text-left text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Terms Of Use
            </h1>
            <section className="max-w-3xl mx-auto pb-8">
                <div
                    className={`rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8 space-y-4 ${legalBody}`}
                >
                    <p>Welcome to the Proxima Fitness Website (the <strong className="bold">“Website”</strong>). These Terms of Use are an agreement between you and Proxima Fitness, as defined that Proxima Fitness governs your access to, and use of, the Website and Application and the tools (<strong>“Services”</strong>) and resources (<strong>“Content”</strong>) available on the Website and Application (the Website, the Application, the Services and the Content are collectively referred to as the <strong>“Proxima Fitness Resources”</strong>). By accessing the Website and/or using any Services or Content, you agree unconditionally to these Terms of Use. If you do not wish to agree to these Terms of Use, you must close your browser and not access or use the Proxima Fitness Resources.</p>

                    <h2>1. Acceptance of Terms of Use</h2>
                    <p>If you are under 19, your parent or legal guardian is responsible for your use of the Proxima Fitness Resources and your compliance with these Terms. If you are accepting these Terms of Use on behalf of your employer or another organization, you represent and warrant that you have the necessary authority to do so.  In these Terms, <strong>“you”</strong>, <strong>“You”</strong>, <strong>“your”</strong> and <strong>“Your”</strong> include: (a) in the case of an individual under 19, the individual’s parent or legal guardian; and (b) in the case of an individual accepting these Terms of Use on behalf of an employer or another organization, that employer or organization.</p>

                    <h2>2. Ownership</h2>
                    The Proxima Fitness Resources are owned by Proxima Fitness or its licensors and are protected by copyright, patent, trademark and other laws protecting intellectual property rights.  You must not use the Proxima Fitness Resources except as expressly permitted under these Terms of Use or as otherwise approved by Proxima Fitness in writing.

                    <h2>3. License</h2>
                    <p>Subject to your compliance with these Terms of Use, Proxima Fitness grants you, solely for the Purposes, as defined below, a non-exclusive, revocable license to: (a) access and use the Website and the Services; and (b) download, use, reproduce and distribute (collectively, <strong>“Use”</strong>) the Content (collectively, the <strong>“License”</strong>).  You must not, without the prior written permission of Proxima Fitness: (a) modify the Content; or (b) Use the Content for any purpose other than the Purposes.  Proxima Fitness expressly reserves all intellectual property rights in and to the Proxima Fitness Resources.
                        In this section 3, <strong>“Purposes”</strong> means: (a) the use and access of the Website and Applications, and any services therein; and (b) where you choose to connect a third-party fitness account (such as Hevy), syncing and backing up your workout history and using that data to provide training tools, insights, and coaching features as described in our <a href="/privacy">Privacy Policy</a>.</p>

                    <h2>4. Your Account</h2>
                    <p>You must create an account in order to use certain Services, in which case you will be required to provide certain account information, such as your email address, and to create a UserID and password (collectively, your <strong>“Credentials”</strong>). You are solely responsible for: (a) providing accurate and complete account information and keeping that information up to date; (b) keeping your Credentials confidential; and (c) all activities associated with your account, whether those activities were performed by you or someone else. You must immediately report any unauthorized use of your Credentials or your account to: jack@proximafitness.com </p>

                    <h2>5. Privacy</h2>
                    <p>Any personal information collected from you in connection with your use of the Proxima Fitness Resources, including your account information, Hevy workout history backup, and optional consent preferences, is collected, used and disclosed in accordance with the <a href="/privacy">Website Privacy Policy</a>, which is incorporated by reference into and forms part of these Terms of Use. The Privacy Policy describes how to request data deletion and how account deletion removes your associated data.</p>

                    <h2>6. Changes to Website/Terms of Use</h2>
                    <p>Proxima Fitness may at any time, in its sole discretion: (a) discontinue the Website; (b) make changes to some or all of the Proxima Fitness Resources; and (c) make changes to these Terms of Use. We will post updated Terms on the Website with a revised “Last updated” date.</p>
                    <p>Material changes to these Terms of Use or the Privacy Policy require your explicit in-app acceptance before you can continue using authenticated Proxima Fitness Services. If you do not accept an updated version, you may log out or delete your account; continuing to use the Services without accepting a required update is not permitted and does not constitute consent. You are responsible for reviewing these Terms of Use periodically.</p>

                    <h2>7. Acceptable Use</h2>
                    Your use of the Proxima Fitness Resources must be lawful and appropriate. Without limiting the foregoing, you must not:
                    <strong>1.	use the Proxima Fitness Resources for any purpose not expressly contemplated in these Terms of Use, including without limitation for resale or other commercial purpose;</strong>
                    <strong>   2.	decompile, disassemble, reverse engineer or otherwise copy (other than as expressly permitted in section 3), in whole or in part, the Proxima Fitness Resources;</strong>
                    <strong>  3.	tamper with any portion of the Proxima Fitness Resources;</strong>
                    <strong>  4.	use the Proxima Fitness Resources to transmit any virus or other harmful or destructive computer code, files or programs or to conduct hacking and/or intrusion activities;</strong>
                    <strong>  5.	attempt to circumvent or subvert any security measure associated with the Proxima Fitness Resources;</strong>
                    <strong>  6.	take any action that might reasonably be construed as likely to adversely affect other users of the Proxima Fitness Resources; or</strong>
                    <strong>  7.	remove or alter any proprietary symbol or notice, including any copyright notice, trademark or logo, displayed in connection with the Proxima Fitness Resources.</strong>

                    <h2>8. Termination/Suspension</h2>
                    <p>If you violate any provision of these Terms of Use, the License will terminate automatically. In that case, you must immediately cease accessing or using the Proxima Fitness Resources, and you must destroy or permanently delete any downloaded copies of the Content. In addition, Proxima Fitness may at any time, in its sole discretion, suspend your account or your access to certain Services as a security measure or for administrative purposes, in which case Proxima Fitness may, in its sole discretion, restore such access where Proxima Fitness is satisfied that the reason for the suspension has been resolved.</p>
                    <p>You may permanently delete your account at any time from account settings. Deletion removes your authentication identity and associated data as described in the <a href="/privacy">Privacy Policy</a>. You may also request erasure of specific Personal Information by emailing <a href="mailto:jack@proximafitness.com">jack@proximafitness.com</a>.</p>

                    <h2>9. Disclaimer</h2>
                    The Proxima Fitness Resources are provided to you <strong>“as is”</strong>, without warranty of any kind, whether express or implied, and your use of them is entirely at your own risk. Proxima Fitness expressly disclaims all warranties, representations, conditions, obligations and liabilities of any kind, whether express or implied, in relation to the Proxima Fitness Resources, including without limitation warranties of merchantability, satisfactory quality, fitness for a particular purpose and non-infringement. Without limiting the general nature of the foregoing, Proxima Fitness makes no representations or warranties, express or implied, that the Proxima Fitness Resources:
                    1.	will be available, or that your use of them will be uninterrupted or error free;
                    2.	are accurate, complete or current; or
                    3.	will meet your expectations or requirements.

                    <h2>10. Third Party Sites</h2>
                    Any links or references to any third-party websites are provided for information only and do not constitute an endorsement of any kind. Proxima Fitness is not responsible for the content or reliability of any such websites and does not endorse the content, products, services or views expressed within them.

                    <h2>11. Limitation of Liability</h2>
                    Under no circumstances will Proxima Fitness or any of its employees or agents be liable to you or any individual or entity for any direct, indirect, special, incidental, consequential, or other damages, claims, injuries or losses (whether based on contract, tort, strict liability or otherwise and whether foreseeable or otherwise), including without limitation any lost profits, business interruption or loss of programs or information, as a result of any:
                    1.	use of or reliance by you on the Proxima Fitness Resources; or
                    2.	any failure by you to abide by these Terms of Use.
                    Without limiting the general nature of the foregoing, you agree that Proxima Fitness is not responsible for any lost, intercepted, incomplete or illegible Content, connection failures or unavailability of the Proxima Fitness Resources, failed, incomplete, garbled or delayed transmissions, or hardware, software or other technical malfunctions.  This provision will apply even if Proxima Fitness has been specifically advised of the possibility of any such damages, claims, injuries or losses.

                    <h2>12. Indemnity</h2>
                    You agree to indemnify, defend and hold harmless Proxima Fitness and Proxima Fitness’s employees and agents from and against all claims, demands, obligations, losses, liabilities, costs or debts, and expenses (including but not limited to reasonable legal fees) that Proxima Fitness or any of its employees or agents may sustain, incur, suffer or be put to at any time, either before or after the termination of these Terms of Use, where the same or any of them are based upon, arise out of or occur, directly or indirectly, by reason of your violation of any provision of these Terms of Use.

                    <h2>13. General</h2>
                    These Terms of Use (including the Privacy Policy) are the entire agreement between you and Proxima Fitness with respect to their subject matter.  In these Terms of Use: (a) headings are inserted for convenience only and will not be used in interpreting or construing any provision of these Terms of Use; and (b) “including” is not intended to be limiting, regardless of whether it is expressly stated not to be so. If any provision of these Terms of Use is invalid, illegal or unenforceable, that provision will be severed from these Terms of Use and all other provisions will remain in full force and effect.  These Terms of Use will be governed by and construed in accordance with the laws of Proxima Fitness of British Columbia and the applicable laws of Canada.  By accessing the Website and/or using any Services or Content, you consent to the exclusive jurisdiction and venue of the courts of British Columbia, sitting in Victoria, for the hearing of any dispute arising from or related to these Terms of Use.

                    <p>
                        <strong>Last updated: June 17, 2026</strong>
                    </p>
                </div>
            </section>
        </div>
    );
  }
