// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/privacy/page
 *
 * Privacy policy page. Static legal content (definitions, collection, access,
 * security, retention). Sits at src/app/(app)/privacy/page.tsx; route "/privacy".
 *
 * Depends on: none (static markup; theme tokens for surfaces and text).
 * Used by: Next.js (route "/privacy").
 */

export const metadata = {
    title: "Privacy Policy | Proxima Fitness",
    description: "These are the Privacy Policies that we abide by",
};

const legalBody =
    "[&_a]:text-secondary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-lightSecondary [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:first:mt-0 [&_strong]:font-semibold";

/** Privacy policy page; static legal text. */
export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-muted px-4 py-10 text-foreground">
            <h1 className="mb-8 max-w-3xl mx-auto text-left text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Privacy Policy
            </h1>
            <section className="max-w-3xl mx-auto pb-8">
                <div
                    className={`rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8 space-y-4 ${legalBody}`}
                >
                    <h2>Introduction and Scope of Policy</h2>
                    <p>
                        This policy outlines how Proxima Fitness handles Personal Information for the delivery of the Proxima Fitness Application and Website. This policy outlines the privacy practices followed when you use Proxima Fitness Services, including ensuring the accuracy, confidentiality, and security of your Personal Information and requesting access to and correction of your Personal Information.
                    </p>
                    <h2>Definitions</h2>
                    The following definitions are used for the purposes of this policy:
                    <strong>Proxima Fitness Services</strong> means your access to, and use of, the Proxima Fitness Application, the Proxima Fitness Website and the tools and resources available through all products owned by Proxima Fitness.
                    <strong>Proxima Fitness Website</strong> means the website, owned by Proxima Fitness to provide Fitness services.
                    <strong>Proxima Fitness App</strong> means the cross-platform (Google Play Store and Apple App Store) application owned by Proxima Fitness and used to provide Fitness services.
                    <strong>Personal Information</strong> means recorded information about an identifiable individual and includes information such as gender, age, address information, financial information.

                    <h2>Third-party fitness data</h2>
                    <p>
                        If you connect your Hevy account, Proxima uses your Hevy API key to read workout data from Hevy on your behalf. We copy your completed workout history - including workout titles, dates, duration, exercises, sets, reps, weights, and related notes - into a workout history backup stored in Proxima. This backup lets us show your workout history, power training insights (such as blind spot analysis), and support coaching features without calling Hevy on every request.
                    </p>
                    <p>
                        Workout history backup runs while your Hevy account remains connected. Disconnecting Hevy stops new imports; existing backup data is retained until you request deletion or delete your account. We do not sell your Hevy workout data to third parties.
                    </p>
                    <h2 id="platform-improvement">Platform improvement</h2>
                    <p>
                        With your optional consent, Proxima may use your workout history backup, saved programs, builder usage, and coaching chat content to improve our products and services - for example, to refine program recommendations, fix bugs, and evaluate feature quality. Where feasible, we aggregate or de-identify this information. This data is not sold, shared for third-party advertising, or used to target ads.
                    </p>
                    <p>
                        The Proxima Fitness Website and Application also use PostHog and Google Analytics as part of platform improvement. These tools collect pseudonymous usage data - such as pages visited, feature interactions, device and browser information, and session activity - to help us understand how the Services are used and where to improve them. PostHog and Google Analytics are covered by the same optional platform improvement consent; you can turn this off in Settings in your account menu. For more on Google Analytics, see <a href="https://www.google.com/policies/privacy/partners">How Google uses Data</a>.
                    </p>
                    <h2 id="marketing">Marketing</h2>
                    <p>
                        With your separate optional consent, Proxima may send you promotional emails about new features, offers, or product updates. Marketing email is off by default. You can opt in at sign-up or later in Settings, and opt out at any time from Settings or via the unsubscribe link in any marketing email. Opting out of marketing does not affect transactional messages about your account or the Services.
                    </p>
                    <h2>Collection, Use, and Disclosure of Your Personal Information</h2>
                    Your Personal Information is collected, used and disclosed in accordance with the <a href="https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96165_00">Freedom of Information and Protection of Privacy Act (FOIPPA)</a> and other applicable legislation. Personal Information collected from you includes information collected as a result of your visit to the Proxima Fitness Website, Proxima Fitness Application and/or use of Proxima Fitness Services; information that you provide via your Proxima Fitness Website account and information included in your communications or interaction with Proxima Fitness Services (such as emails, including the User Survey, telephone conversations, face-to-face, online meetings, or written correspondence); and any information about you that is disclosed to Proxima Fitness by third parties as a result of your use of Proxima Fitness Services.
                    The purposes of the collection include:
                    <strong>1.	Providing you services (for example, providing tailored workouts to your current Body Mass Index).</strong>
                    <strong>2.	Services research to create better services for all users.</strong>
                    Information is also collected through the use of audit logs and cookies. Cookies are small files stored on your computer by your web browser when using some websites. The cookies store information about your previous visits to the Proxima Fitness Website and Proxima Fitness Application help simplify and enhance your experience while using Proxima Fitness Services.
                    A cookie may stay on your computer or device after your browser has been closed, until the cookie expires or is deleted by you. If you choose to disable cookies on your browser, it may impact your web experience with the Proxima Fitness Website and Proxima Fitness Application including your ability to login to access Proxima Fitness services. However, you may still be able to access Proxima Fitness Services by other methods such as email.
                    <h2>Data deletion</h2>
                    <p>
                        You may request erasure of your Personal Information at any time by emailing <a href="mailto:jack@proximafitness.com">jack@proximafitness.com</a> with sufficient detail to identify your account and the data you want removed. We will respond in accordance with applicable law, including FOIPPA.
                    </p>
                    <p>
                        You may also permanently delete your Proxima account from account settings (Delete account). Account deletion removes your authentication identity and associated data in Proxima, including your workout history backup, saved programs, profile information, and connected integrations such as your stored Hevy API key. This action is intended to be irreversible.
                    </p>
                    <h2>Access to Personal Information</h2>
                    FOIPPA provides individuals the right to request access to their Personal Information subject to limited exceptions. A request to access Personal Information must be made in writing and provide sufficient detail to identify the Personal Information being sought.
                    <h2>Correction of Personal Information</h2>
                    A request to correct Personal Information must be made in writing and provide sufficient detail to identify the relevant Personal Information you would like to correct. If you make a request to have Personal Information corrected, any corrections will be made in accordance with FOIPPA.
                    If the information you want to correct was provided by or for a third party or another public body, you may be directed to submit your correction request directly to them.
                    <h2>Security of Personal Information</h2>
                    Reasonable security arrangements are in place to protect Personal Information against such risks as unauthorized access, collection, use, disclosure, or disposal. Specifically, access to systems, applications and the collected data is restricted to authorized personnel only.
                    <h2>Retention of Personal Information</h2>
                    Personal information will be retained in accordance with the records retention requirements, for as long as may be necessary or relevant for the purpose of collection, or as may be otherwise required or permitted by law, after which time it will be made anonymous, or destroyed.
                    <h2>Changes to this Privacy Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. Material changes will be posted on the Proxima Fitness Website with an updated “Last posted” date. When we publish a new policy version, you must explicitly accept the updated Terms of Use and Privacy Policy in the application before continuing to use authenticated Proxima Fitness Services. Continuing to browse public pages without signing in does not constitute acceptance of updated policies for your account.
                    </p>
                    <p>
                        <strong>Last posted on: June 17, 2026</strong>
                    </p>
                </div>
            </section>
        </div>
    );
  }
