import { people03, people02, people01, people04, people05, people06, instagram, linkedin, star, reddit, twitter } from "public";
import humanizeDuration from "humanize-duration";
import { Option } from '@/components/ui/multi-select';

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
    { quote: "Lifting isn’t a hobby, it’s a journey. And that journey often begins with feelings of inadequacy and ends with feelings of inadequacy but now you can’t wear jeans and you sink in pools.", author: "Casually Explained"},
    { quote: "GOOOOOOOOD F*@#ING MORNING", author: "Dom Mazetti"},
    { quote: "The day you start lifting is the day you become forever smol, because you will never be as big as you want to be.", author: "Dom Mazetti"},
    { quote: "You can't climb the ladder of success with your hands in your pockets", author: "Unknown"},
    { quote: "Swole is the goal, size is the prize, it's gain o'clock MF ... LET'S GO", author: "Robert Frank"},
    { quote: "Be a sick c*nt not a sad c*nt", author: "Zyzz (RIP)"},
    { quote: "The Iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The Iron will always kick you the real deal. The Iron is the great reference point, the all-knowing perspective giver. Always there like a beacon in the pitch black. I have found the Iron to be my greatest friend. It never freaks out on me, never runs. Friends may come and go. But two hundred pounds is always two hundred pounds.", author: "Henry Rollins"},
    { quote: "You can't sculpt a pebble", author: "Unknown" },
    { quote: "If you're gonna wear gloves while you lift, just make sure they match your purse", author: "Unkown"},
    { quote: "Don't move the weight, work the muscle", author: "Unknown"},
    { quote: "Live an extraordinary life… Don’t settle for an ordinary life… It’s easy to be ordinary anybody can do that. Find your magnificent obsession. Whatever it is and let nothing or no one tell you that you can’t do it. Tell them to sit back and watch me. Just sit back and watch me do it. Find your obsession go after that… I could care less what anybody else says and don’t let anything stop you from getting it.", author: "CT Fletcher"},
    { quote: "Man cannot remake himself without Suffering, for he is both the Marble and the Sculptor", author: "Alexis Carrel" },
    { quote: "I hated every minute of training, but I said, ‘Don’t Quit. Suffer now and live the rest of your life as a Champion!", author: "Muhammad Ali"},
    { quote: "U mirin brah ?", author: "Zyzz (RIP)"}
];

export const sexOptions: Option[] = [
    { label: "Male", value: "male"},
    { label: "Female", value: "female"}
];

export const ageOptions: Option[] = Array.from({ length: 100 - 14 + 1 }, (_, i) => {
    const age = (i + 14).toString();
    return { label: age, value: age };
} );

export const dayPerWeekOptions: Option[] = [
    { label: "1x per week", value: "1"},
    { label: "2x per week", value: "2" },
    { label: "3x per week", value: "3" },
    { label: "4x per week", value: "4" },
    { label: "5x per week", value: "5" },
    { label: "6x per week", value: "6" },
    { label: "7x per week", value: "7" },
];

export const specificDaysOptions: Option[] = [
    { label: "Mon", value: "monday"},
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
    { label: "Sun", value: "sunday" },
];

export const programLengthOptions: Option[] = Array.from({ length: 12 }, (_, i) => {
    const programLength = (i + 1).toString();
    return { label: `${programLength} Week${programLength === "1" ? "": "s"}`, value: programLength };
} );

export const workoutDurationOptions: Option[] = Array.from({ length: 18 }, (_, i) => {
    const duration = ((i+1)*10).toString();
    return { label: `${duration} Mins`, value: duration };
} );

export const activityLevelOptions: Option[] = [
    { label: "Sedentary", value: "sedentary"},
    { label: "Light activity", value: "light activity" },
    { label: "Moderate activity", value: "moderate activity" },
    { label: "High activity", value: "high activity" },
    { label: "Extreme activity", value: "extreme activity" },
];

export const goalsOptions: Option[] = [
    { label: "Build muscle", value: "build muscle"},
    { label: "Improve fitness", value: "improve fitness" },
    { label: "Reduce back pain", value: "reduce back pain" },
    { label: "Agility", value: "agility" },
    { label: "Optimize workouts", value: "optmimize workouts" },
    { label: "Relieve stress", value: "relieve stress" },
    { label: "Balance", value: "balance" },
    { label: "Weight loss", value: "weight loss" },
    { label: "Boost libido", value: "boost libido" },
    { label: "Boost mental strength", value: "boost mental strength" },
    { label: "Flexibility", value: "flexibility" },
    { label: "Increase endurance", value: "increase endurance" },
    { label: "Burn fat", value: "burn fat" },
];

export const specializationOptions: Option[] = [
    { label: "Bodybuilding", value: "bodybuilding"},
    { label: "Powerbuilding", value: "powerbuilding" },
    { label: "Athletics", value: "athletics" },
    { label: "Bodyweight training", value: "bodyweight training" },
    { label: "Olympic weightlifting", value: "olympic weightlifting" },
    { label: "Calisthenics", value: "calisthenics" },
];

export const equipmentOptions: Option[] = [
    { label: "Barbell", value: "barbell"},
    { label: "Dumbbell", value: "dumbbell"},
    { label: "Kettlebell", value: "kettlebell"},
    { label: "Machine", value: "machine"},
    { label: "Bodyweight", value: "bodyweight"},
    { label: "Smith machine", value: "smith machine"},
    { label: "Cable", value: "cable"},
    { label: "Cardio", value: "cardio"},
];

export const focusAreasOptions: Option[] = [
    { label: "Back", value: "back"},
    { label: "Arms", value: "arms"},
    { label: "Shoulders", value: "shoulders"},
    { label: "Abs", value: "abs"},
    { label: "Chest", value: "chest"},
    { label: "Legs", value: "legs"},
    { label: "Glutes", value: "glutes"},
    { label: "Full body", value: "full body"},
];

export const difficultyOptions: Option[] = [
    { label: "Beginner", value: "beginner"},
    { label: "Novice", value: "novice"},
    { label: "Intermediate", value: "intermediate"},
    { label: "Advanced", value: "advanced"},
];

export const healthIssuesOptions: Option[] = [
    { label: "Post-covid recovery", value: "post-covid recovery"},
    { label: "Cannot jump", value: "cannot jump"},
    { label: "Back or hernia", value: "back or hernia"},
    { label: "Arms and shoulders", value: "arms and shoulders"},
    { label: "Hip joints", value: "hip joints"},
    { label: "Knee injuries", value: "knee injuries"},
];
