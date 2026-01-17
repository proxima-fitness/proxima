 
import { jack, jack_jacked } from "public";
import { AboutPageClient } from "./AboutPageClient";

export const metadata = {
    title: "About Us | Proxima Fitness",
    description: "Learn more about Proxima Fitness and our mission to empower fitness enthusiasts with AI-driven workout solutions.",
  };

  export default function AboutPage() {
    return <AboutPageClient jack={jack} jack_jacked={jack_jacked} />;
  }
