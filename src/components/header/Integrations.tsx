import { garmin_logo, oura_logo, polar_logo, hevy_logo, proxima_logo, strava_logo, whoop_logo } from "public";
import styles from "../../style";
import { Separator } from "../ui/separator";

export const Integrations: React.FC = () => {
    return (
        <section className={ `${styles.flexCenter} flex-row flex-wrap ${styles.paddingY}` }>
           <div className={ `flex flex-col items-center justify-center` }>
                <h3 className={ `text-4xl text-white font-main pb-12` }>Integrated with your <span className="text-lightSecondary">Fitness App</span></h3>
                <div className={ `flex flex-row items-center justify-center gap-12` }>
                    <div className={ `flex flex-col items-start justify-start gap-2` }>
                    <span className="text-offWhite text-sm">Available now</span>
                    <div className={ `flex flex-row items-center justify-center` }>
                        <img src={ proxima_logo.src } alt="Hevy Logo"  className={ ` h-6` } />
                        <img src={ hevy_logo.src } alt="Hevy Logo"  className={ ` h-6` } />
                    </div>

                    </div>

                    <Separator orientation="vertical" className={ `h-10 bg-white ` } />
                    <div className={ `flex flex-col items-start justify-start gap-2` }>
                        <span className="text-offWhite text-sm">Coming soon</span>
                        <div className={ `flex flex-row items-center justify-center gap-8` }>
                        <img src={ strava_logo.src } alt="Strava Logo"  className={ ` h-6` } />
                        <img src={ oura_logo.src } alt="Oura Logo"  className={ ` h-6` } />
                        <img src={ polar_logo.src } alt="Polar Logo"  className={ ` h-6` } />
                        <img src={ garmin_logo.src } alt="Garmin Logo"  className={ ` h-6` } />
                        <img src={ whoop_logo.src } alt="Whoop Logo"  className={ ` h-6` } />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
