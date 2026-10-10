import { Body, Container, Head, Heading, Html, Link, Text, Img, Hr, Section, Column, Row, Font } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
export const WorkoutScheduledEmail = ()=>/*#__PURE__*/ React.createElement(Html, null, /*#__PURE__*/ React.createElement(Head, null, /*#__PURE__*/ React.createElement(Font, {
    fontFamily: "Roboto",
    fallbackFontFamily: "Verdana",
    webFont: {
      url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
      format: "woff2"
    },
    fontWeight: 400,
    fontStyle: "normal"
  })), /*#__PURE__*/ React.createElement(Body, {
    style: main
  }, /*#__PURE__*/ React.createElement(Container, {
    style: container
  }, /*#__PURE__*/ React.createElement(Heading, {
    as: "h2",
    style: {
      textAlign: "center",
      marginTop: "24px"
    }
  }, "You’ve got a workout scheduled today at 8:00 PM 🏋️‍♂️"), /*#__PURE__*/ React.createElement(Text, {
    style: {
      fontSize: "16px",
      lineHeight: "28px"
    }
  }, "Hey there, legend (in theory) 👋"), /*#__PURE__*/ React.createElement(Text, null, "Just a friendly reminder that your workout is scheduled for", " ", /*#__PURE__*/ React.createElement("strong", null, "today at 8:00 PM"), ". Remember that one time you said, “I’ll start being consistent”? Yeah… this is that time."), /*#__PURE__*/ React.createElement(Text, null, "Don’t ghost your gains again — your future self (and your mirror) are counting on you. You can check your upcoming workouts or reschedule anytime in the", " ", /*#__PURE__*/ React.createElement(Link, {
    style: link,
    href: "https://ai.proximafitness.com"
  }, "SupaBuff App"), "."), /*#__PURE__*/ React.createElement(Img, {
    style: {
      background: "#000",
      borderRadius: 12,
      margin: "24px auto",
      width: "90%"
    },
    src: "https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/logos/supabuff.png",
    alt: "SupaBuff"
  }), /*#__PURE__*/ React.createElement(Text, null, "Consistency beats motivation — but if this email gave you guilt-induced motivation, we’ll take it 💪 Now grab your water bottle, hit play on your gym playlist, and go make those dumbbells regret existing."), /*#__PURE__*/ React.createElement(Text, null, "See you tonight, champ."), /*#__PURE__*/ React.createElement(Text, null, "– Jack"), /*#__PURE__*/ React.createElement(Text, null, "Founder,"), /*#__PURE__*/ React.createElement(Text, null, "Proxima Fitness Inc."), /*#__PURE__*/ React.createElement(Hr, null), /*#__PURE__*/ React.createElement(Section, {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/ React.createElement("table", {
    style: {
      width: "100%"
    }
  }, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center"
  }, /*#__PURE__*/ React.createElement(Img, {
    alt: "",
    height: "42",
    src: "https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/logos/proxima-logo.webp"
  }))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center"
  }, /*#__PURE__*/ React.createElement(Text, {
    style: {
      marginTop: 8,
      marginBottom: 8,
      fontSize: 16,
      lineHeight: "24px",
      fontWeight: 600,
      color: "rgb(17,24,39)"
    }
  }, "SupaBuff App"), /*#__PURE__*/ React.createElement(Text, {
    style: {
      marginTop: 4,
      marginBottom: "0px",
      fontSize: 16,
      lineHeight: "24px",
      color: "rgb(107,114,128)"
    }
  }, "Stop scrolling. Start lifting."))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center"
  }, /*#__PURE__*/ React.createElement(Row, {
    style: {
      display: "table-cell",
      height: 44,
      width: 56,
      verticalAlign: "bottom"
    }
  }, /*#__PURE__*/ React.createElement(Column, {
    style: {
      paddingRight: 8
    }
  }, /*#__PURE__*/ React.createElement(Link, {
    style: link,
    href: "https://www.reddit.com/r/ProximaFitness/"
  }, "Reddit")), /*#__PURE__*/ React.createElement(Column, {
    style: {
      paddingRight: 8
    }
  }, /*#__PURE__*/ React.createElement(Link, {
    style: link,
    href: "https://www.instagram.com/proximafitnessapp/"
  }, "Instagram")), /*#__PURE__*/ React.createElement(Column, {
    style: {
      paddingRight: 8
    }
  }, /*#__PURE__*/ React.createElement(Link, {
    style: link,
    href: "https://discord.gg/4AhEd3eZpb"
  }, "Discord")), /*#__PURE__*/ React.createElement(Column, {
    style: {
      paddingRight: 8
    }
  }, /*#__PURE__*/ React.createElement(Link, {
    style: link,
    href: "https://github.com/jack-hanlon"
  }, "GitHub")), /*#__PURE__*/ React.createElement(Column, {
    style: {
      paddingRight: 8
    }
  }, /*#__PURE__*/ React.createElement(Link, {
    style: link,
    href: "https://x.com/jacklhanlon"
  }, "X"))))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center"
  }, /*#__PURE__*/ React.createElement(Text, {
    style: {
      marginTop: 4,
      marginBottom: "0px",
      fontSize: 16,
      lineHeight: "24px",
      fontWeight: 600,
      color: "rgb(107,114,128)"
    }
  }, "jack@proximafitness.com"))))))));
export default WorkoutScheduledEmail;
const main = {
  backgroundColor: "#ffffff"
};
const container = {
  paddingLeft: "12px",
  paddingRight: "12px",
  margin: "0 auto"
};
const link = {
  color: "#33bbcf",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline"
};
