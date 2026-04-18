
import { BicepsFlexedIcon, BookOpenIcon, Calculator, FootprintsIcon, SquarePowerIcon } from "lucide-react";

/** Suggestion groups for common program builder starting points. */
export const suggestionGroups = [
    {
        label: "Start from scratch",
        highlight: "Empty Template",
        items: [
            "Empty Template",
        ],
        icon: <BookOpenIcon />,
    },
    {
      label: "Bodybuilding",
      highlight: "Bodybuilding",
      items: [
        "Make a program like GZCL (GZCLP)",
        "Make a program like nSuns",
        "Make a program like PHUL (Power Hypertrophy Upper/Lower)",
        "Make a program like Reddit's r/Fitness Basic Beginner Routine",
      ],
      icon: <BicepsFlexedIcon />,
    },
    {
      label: "Powerlifting",
      highlight: "Powerlifting",
      items: [
        "Make a program like Candito 6‑Week Program",
        "Make a program like Calgary Barbell",
        "Make a program like Bryce Lewis Greatest Hits",
        "Make a program like Conjugate / Westside Barbell Method",
      ],
      icon: <SquarePowerIcon />,
    },
    {
        label: "Weight Loss",
        highlight: "Weight Loss",
        items: [
            "Make a program like Couch to 5K (C25K)",
            "Make a program like r/Fitness Basic Beginner Routine (FBR)",
            "Make a HIIT training program",

        ],
        icon: <Calculator />,
      },
    {
      label: "Athletic Training",
      highlight: "Athletic Training",
      items: [
        "Make a program like Westside for Athletes / Conjugate Training",
        "Make a program like JuggernautAI Sport Performance / Juggernaut Field Athlete",
        "Make a program like The Vertical Jump Bible",
        "Make a program like DeFranco's Westside for Skinny Bastards (WS4SB)",

      ],
      icon: <FootprintsIcon />,
    },

];

/** Quick chip suggestions for one-tap program prompts. */
export const quickTriggerSuggestionChips = [
  "Not Sure What to Build",
  "Hypertrophy PPL",
  "Powerlifting Peak",
  "Beginner SBD",
  "Weight Loss",
  "Body Recomp",
];

/** Quick chips when a program is already in the builder: short review and improvement prompts (sent as the user message on tap). */
export const quickModifyProgramSuggestionChips = [
  "How can I improve this program?",
  "Check volume and recovery fit",
  "Rate my program",
  "Find gaps in exercise selection",
  "Flag fatigue or injury risks",
  "Progression and deload ideas",
];
