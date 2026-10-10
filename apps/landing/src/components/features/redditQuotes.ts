// SPDX-License-Identifier: AGPL-3.0-only

export const redditQuotes = [
  {
    author: "u/allnonchalant",
    quote: "this is so dope, I'm going to try this out for my next split!",
  },
  {
    author: "u/SandBar8",
    quote: "Pretty epic, thanks for sharing!",
  },
  {
    author: "u/DeadEd19",
    quote: "Amazing work dude/dudette.",
  },
  {
    author: "u/Furieaboy",
    quote: "Man, this is sick.",
  },
  {
    author: "u/Selena_Gomez_USA",
    quote: "Bro, this is awesome! Thank you for your contribution to the Hevy community!",
  },
  {
    author: "u/Western_Account_3856",
    quote: "I love it!",
  },
  {
    author: "u/gvp0di",
    quote: "Awesome news!",
  },
  {
    author: "u/Training_Fly_6997",
    quote: "This is really nice. Thanks 👍🏾",
  },
  {
    author: "u/NobleOnion80",
    quote: "You are cool",
  },
  {
    author: "u/jee82",
    quote: "Wow! Really cool initiativ man! I can see this beeing very useful, I'll try it out over the weekend!",
  },
  {
    author: "u/Kennysvgp089",
    quote: "This is out of this world amazing. You have single handedly added value to this app with your work and should be added to Hevy's payroll lol...",
  },
  {
    author: "u/RuciFL81",
    quote: "Well done! As a tech leader myself I appreciate the efforts here. I have to implement AI for my company all the time. Love it when it's for my personal life. Kudos to you...",
  },
  {
    author: "u/ModeBoring",
    quote: "giving this a try now. very excited about this. if you expand the app to android, and need a beta tester, let me know, would be happy to help.",
  },
] as const;

export type TRedditQuote = (typeof redditQuotes)[number];
