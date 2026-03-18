import { people03, people02, people04, people05, people06, instagram, linkedin, star, reddit, twitter } from "public";

/** Filter group options for narrowing down programs and content. */
export const filterGroupOptions: TFilterGroupOption[] = [
    {
        component: "combobox",
        type: "program_length",
        title: "Program Length",
        values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    },
    {
        component: "combobox",
        type: "workout_duration",
        title: "Workout Duration",
        values: Array.from({ length: 18 }, (_, i) => (i * 10 + 10).toString()),
    },
    {
        component: "badge",
        type: "equipment",
        title: "Equipment",
        values: ["Full Gym", "Garage Gym", "Dumbbells Only", "Bodyweight"],
    },
    {
        component: "badge",
        type: "specialization",
        title: "Specialization",
        values: ["Bodybuilding", "Powerbuilding", "Powerlifting", "Athletics", "Bodyweight Training", "Olympic Weightlifting", "Calisthenics"],
    },
    {
        component: "badge",
        type: "difficulty",
        title: "Difficulty",
        values: ["Beginner", "Novice", "Intermediate", "Advanced"],
    },
];

/** Navigation links shown to authenticated users. */
export const authenticatedNavLinks = [
    {
        id: "home",
        title: "Home",
    },
    {
        id: "programs",
        title: "Explore"
    },

    // {
    //     id: "program-builder",
    //     title: "AI Program Builder",
    // },
    {
        id: "profile",
        title: "Profile"
    },
    {
        id: "pricing",
        title: "Upgrade",
    },
    // {
    //     id: "cta",
    //     title: "Download App",
    // },
];

/** Public landing page navigation links. */
export const navLinks = [
    {
        id: "home",
        title: "Home",
    },
    {
        id: "programs",
        title: "Explore",
    },
    {
        id: "about",
        title: "About Us",
    },
    {
        id: "pricing",
        title: "Pricing",
    },
    // {
    //     id: "program-builder",
    //     title: "AI Program Builder",
    // },
    // {
    //     id: "cta",
    //     title: "Download App",
    // },
];

/** Nav link id to URL. Used by Navbar and AppSidebar for consistent routing. */
export const navIdToUrl: Record<string, string> = {
    home: "/",
    programs: "/programs",
    about: "/about",
    pricing: "/pricing",
    profile: "/profile",
    "log-in": "/auth/login",
};

/** Marketing feature descriptions displayed on the landing page. */
export const features = [
  {
    id: "feature-1",
    icon: star.src,
    title: "Follow programs shared by other lifters",
    content:
      "Members share their workouts for free. Follow along and learn from real lifters and coaches.",
  },
  {
    id: "feature-2",
    icon: star.src,
    title: "Break through plateaus with proven programs",
    content:
      "Run proven programs from Reddit and the community—no guesswork.",
  },
  {
    id: "feature-3",
    icon: star.src,
    title: "Share your programs and grow your following",
    content:
      "Post your programs on Proxima and help other lifters. Build your audience with your expertise.",
  },
];

/** User testimonial content used in marketing sections. */
export const feedback = [
    {
        id: "feedback-1",
        content:
            "Lots of cool programs, and super easy to use UI. Would definitely recommend trying out the pro version",
        name: "Scott Hanlon",
        title: "Proxima Member · 2024.05.03",
        img: people03.src,
    },
    {
        id: "feedback-2",
        content: "Literally the best fitness app I've used so far. It's simple and the PR cards are sick",
        name: "Marco Zanotto",
        title: "Proxima Member · 2024.04.12",
        img: people02.src,
      },
      {
        id: "feedback-4",
        content:
          "I've been lifting for over a decade and I usually avoid gym apps. Proxima is the first that I think is actually pretty good. It has a generous amount of features in the free tier, and suits my needs",
        name: "Jordan Van De Sande",
        title: "Proxima Member · 2024.09.14",
        img: people04.src,
      },
      {
        id: "feedback-5",
        content:
        "I train 5-6 days a week for the military, this app has helped me stay in shape for work. 10/10",
        name: "Rob Roy Mackenzie",
        title: "Proxima Member · 2024.09.06",
        img: people05.src,
      },
      {
        id: "feedback-6",
        content:
        "Makes it super easy to build programs myself, and is very flexible with custom exercises and different types of units like RPE, %1RM etc",
        name: "Milton Quintana",
        title: "Proxima Member · 2024.01.18",
        img: people06.src,
      },
];

/** Key product and community statistics for marketing. */
export const stats = [
  {
    id: "stats-1",
    title: "Proxima Members",
    value: 1000,
  },
  {
    id: "stats-2",
    title: "Workouts Tracked",
    value: 2000,
  },
  {
    id: "stats-3",
    title: "Programs Created",
    value: 8000,
  },
];

/** Link groups rendered in the site footer. */
export const footerLinks = [
  {
    title: "Useful Links",
    links: [
      {
        name: "Terms of Use",
        link: "/terms-of-use",
      },
      {
        name: "Privacy Policy",
        link: "/privacy",
      },
      {
        name: "Blog",
        link: "/blog",
      },

    ],
  },
  {
    title: "Contact Us",
    links: [
      {
        name: "Email",
        link: "mailto:jack@proximafitness.com",
      },
      {
        name: "Survey",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSffqV8QEZ0fD5GspTsGZxZ1Ic9tjimb8Poxwg-8hDP_c6CCrg/viewform",
      },
      {
        name: "Feedback",
        link: "https://proximafitness.featurebase.app/"
      }
    ],
  },
  {
    title: "Feature Requests",
    links: [
        { name: "Roadmap",
            link: "https://proximafitness.featurebase.app/roadmap"
        },
        {
            name: "Changelog",
            link: "https://proximafitness.featurebase.app/changelog"
        },
    ],
  },
];

/** Social media link metadata for the footer and marketing sections. */
export const socialMedia = [
  {
    id: "social-media-1",
    label: "Proxima Fitness on Instagram",
    icon: instagram.src,
    link: "https://www.instagram.com/proximafitnessapp/",
  },
  {
    id: "social-media-2",
    label: "Proxima Fitness on Twitter",
    icon: twitter.src,
    link: "https://www.twitter.com/jacklhanlon",
  },
  {
    id: "social-media-3",
    label: "Proxima Fitness on LinkedIn",
    icon: linkedin.src,
    link: "https://www.linkedin.com/company/proxima-fitness/",
  },
  {
    id: "social-media-4",
    label: "Proxima Fitness on Reddit",
    icon: reddit.src,
    link: "https://www.reddit.com/r/ProximaFitness/",
  },
];

/** Curated quotes displayed across the marketing experience. */
export const coolQuotes: TQuote[] = [
    { quote: "We take on the strength of that which we overcome", author: "Unknown" },
    { quote: "Don't be bitter, be better", author: "Unknown"},
    { quote: "The results come days after you stop counting", author: "Unknown"},
    { quote: "There's no final victory and no final defeat, only the same fight to be fought again and again and again.", author: "Unknown"},
    { quote: "It's a good idea to ask - what am I not doing?", author: "Unknown"},
    { quote: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", author: "Ronnie Coleman"},
    { quote: "Light weight BABY!!!", author: "Ronnie Coleman"},
    { quote: "Yeah Buddy!", author: "Ronnie Coleman"},
    { quote: "Ain't nothin but a peanut", author: "Ronnie Coleman"},
    { quote: "A well built physique is a status symbol. It reflects you worked hard for it. No money can buy it. You cannot borrow it, you cannot inherit it, you cannot steal it. You cannot hold onto it without constant work. It shows discipline, it shows self respect, it shows patience, work ethic, and passion. That is why I do what I do.", author: "Arnold Schwarzenegger"},
    { quote: "No citizen has a right to be an amateur in the matter of physical training... what a disgrace it is for a man to grow old without ever seeing the beauty and strength of which his body is capable.", author: "Socrates"},
    { quote: "Lifting isn't a hobby, it's a journey. And that journey often begins with feelings of inadequacy and ends with feelings of inadequacy but now you can't wear jeans and you sink in pools.", author: "Casually Explained"},
    { quote: "The day you start lifting is the day you become forever smol, because you will never be as big as you want to be.", author: "Dom Mazetti"},
    { quote: "You can't climb the ladder of success with your hands in your pockets", author: "Unknown"},
    { quote: "Swole is the goal, size is the prize, it's gain o'clock MF ... LET'S GO", author: "Robert Frank"},
    { quote: "The Iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The Iron will always kick you the real deal. The Iron is the great reference point, the all-knowing perspective giver. Always there like a beacon in the pitch black. I have found the Iron to be my greatest friend. It never freaks out on me, never runs. Friends may come and go. But two hundred pounds is always two hundred pounds.", author: "Henry Rollins"},
    { quote: "You can't sculpt a pebble", author: "Unknown" },
    { quote: "If you're gonna wear gloves while you lift, just make sure they match your purse", author: "Unknown"},
    { quote: "Don't move the weight, work the muscle", author: "Unknown"},
    { quote: "Live an extraordinary life… Don't settle for an ordinary life… It's easy to be ordinary anybody can do that. Find your magnificent obsession. Whatever it is and let nothing or no one tell you that you can't do it. Tell them to sit back and watch me. Just sit back and watch me do it. Find your obsession go after that… I could care less what anybody else says and don't let anything stop you from getting it.", author: "CT Fletcher"},
    { quote: "Man cannot remake himself without Suffering, for he is both the Marble and the Sculptor", author: "Alexis Carrel" },
    { quote: "I hated every minute of training, but I said, 'Don't Quit. Suffer now and live the rest of your life as a Champion!", author: "Muhammad Ali"},
    { quote: "U mirin brah ?", author: "Zyzz (RIP)"},
    { quote: "From the moment I realised the weakness of my flesh, it disgusted me. I craved the strength and certainty of steel. I aspired for the immortal machine.", author: "Unknown"},
    { quote: "Because you might as well be dead. Seriously, if you always put limits on what you can do, physical or anything else, it'll spread over into the rest of your life. It'll spread into your work, into your morality, into your entire being. There are no limits. There are plateaus, but you must not stay there, you must go beyond them. If it kills you, it kills you. A man must constantly exceed his level.", author: "Bruce Lee"},
    { quote: "Where your road ends, mine begins", author: "David Goggins"},
];
