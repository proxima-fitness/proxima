import { people03, people02, people01, people04, people05, people06, instagram, linkedin, star, reddit, twitter } from "public";
import humanizeDuration from "humanize-duration";

export const shortEnglishHumanizer = humanizeDuration.humanizer({
    language: "shortEn",
    languages: {
      shortEn: {
        y: () => "Yrs",
        mo: () => "Mnths",
        w: () => "Wks",
        d: () => "Days",
        h: () => "Hrs",
        m: () => "Mins",
        s: () => "Secs",
        ms: () => "mSecs",
      },
    },
} );

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

export const navLinks = [
    {
        id: "programs",
        title: "Programs",
    },
    {
        id: "about",
        title: "About Us",
    },
    //   {
    //     id: "pricing",
    //     title: "Pricing",
    //   },
    {
        id: "program-builder",
        title: "AI Program Builder",
    },
    {
        id: "log-in",
        title: "Log in",
    },
    {
        id: "cta",
        title: "Download App",
    },
];

export const features = [
  {
    id: "feature-1",
    icon: star.src,
    title: "Think your program is killing your gains ?",
    content:
      "Your fellow Gym-goers can share their workouts for free, allowing you to follow along. Learn from the expertise of your peers!",
  },
  {
    id: "feature-2",
    icon: star.src,
    title: "Want to run a program to beat your current plateau ?",
    content:
      "Follow proven programs that are open sourced on reddit and other locations.",
  },
{
    id: "feature-2",
    icon: star.src,
    title: "You're a coach and you want to grow your following ?",
    content:
      "You can post your own programs to Proxima, and help other lifters with your expertise",
  },
];

export const feedback = [
    {
        id: "feedback-1",
        content:
            "Lots of cool programs, and super easy to use UI. Would definitely recommend trying out the free version",
        name: "Scott Hanlon",
        title: "Proxima Member · 2024.05.03",
        img: people03.src,
    },
    {
        id: "feedback-2",
        content: "Literally the best fitness app I've used so far. It's simple and the PR cards are sick",
        name: "Marco Zanotto",
        title: "Proxima Member · 2024.04.12",
        img: people02.src,
      },
      {
        id: "feedback-3",
        content:
        "Best free gym app I've found. So many programs I can just click and train. Crazy amount of features for a Free app",
        name: "Sina Banki",
        title: "Proxima Member · 2024.05.25",
        img: people01.src,
      },
      {
        id: "feedback-4",
        content:
          "I've been lifting for over a decade and I usually avoid gym apps. Proxima is the first that I think is actually pretty good. It has a generous amount of features in the free tier, and suits my needs",
        name: "Jordan Van De Sande",
        title: "Proxima Member · 2024.09.14",
        img: people04.src,
      },
      {
        id: "feedback-5",
        content:
        "I train 5-6 days a week for the military, this app has helped me stay in shape for work. 10/10",
        name: "Rob Roy Mackenzie",
        title: "Proxima Member · 2024.09.06",
        img: people05.src,
      },
      {
        id: "feedback-6",
        content:
        "Makes it super easy to build programs myself, and is very flexible with custom exercises and different types of units like RPE, %1RM etc",
        name: "Milton Quintana",
        title: "Proxima Member · 2024.01.18",
        img: people06.src,
      },
];

export const stats = [
  {
    id: "stats-1",
    title: "Proxima Pro Members",
    value: 100,
  },
  {
    id: "stats-2",
    title: "Workouts Tracked",
    value: 2000,
  },
  {
    id: "stats-3",
    title: "Programs Created",
    value: 100,
  },
];

export const footerLinks = [
  {
    title: "Useful Links",
    links: [
      {
        name: "Terms of Use",
        link: "https://app.proximafitness.com/terms-of-use",
      },
      {
        name: "Privacy Policy",
        link: "https://app.proximafitness.com/privacy",
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
    ],
  },
  {
    title: "Coaches",
    links: [
      {
        name: "Become a Coach",
        link: "https://app.proximafitness.com/becoming-a-coach",
      },
    ],
  },
];

export const socialMedia = [
  {
    id: "social-media-1",
    icon: instagram.src,
    link: "https://www.instagram.com/proximafitnessapp/",
  },
  {
    id: "social-media-2",
    icon: twitter.src,
    link: "https://www.twitter.com/jacklhanlon",
  },
  {
    id: "social-media-3",
    icon: linkedin.src,
    link: "https://www.linkedin.com/company/proxima-fitness/",
  },
  {
    id: "social-media-4",
    icon: reddit.src,
    link: "https://www.reddit.com/r/ProximaFitness/",
  },
];

