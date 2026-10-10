// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Img,
  Hr, 
  Section,
  Column,
  Row,
  Font,
} from 'npm:@react-email/components@0.0.22'
  import * as React from 'npm:react@18.3.1'
  
export const BehindTheScenesEmail = () => (
  <Html>
    <Head>
    <Font
        fontFamily="Roboto"
        fallbackFontFamily="Verdana"
        webFont={{
          url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      </Head>
    <Body style={main}>
      <Container style={container}>
      <Heading as="h2">Sneak Peek! Behind the scenes on how Proxima began</Heading>

         <Text>Proxima started out as a passion project of mine back in 2023 on a 1 month trip to Brazil. I was 3 years into my lifting journey and in pretty stellar shape. However, I felt that life was getting in the way of being able to go from the "Intermediate" to "Advanced" lifter level.</Text>
        <Text>So I started scaffolding an idea for a Social Fitness app that also used AI to help you get past that plateau. My dream was to have a platform where your favourite fitness influencers like Will Tennyson, or Greg Doucette, could join in and share programs with the community.</Text>
        <Text>We’re still a long way from reaching that point. Lifting is a solo journey for most people, and the space is filled with misinformation and fragmented knowledge. There should be a centralized hub where reliable fitness information is easily accessible - guiding someone from Beginner to Advanced without requiring them to sift through endless sources on their own.</Text>
          <Text>So I got started building. Here is an image of the early days of Proxima.</Text>
          <Img 
              style={{ borderRadius: 12, height: "auto", width: "50%", margin: '0 auto' }}
              src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc//og-proxima.jpg"></Img>
          <Text style={ { textAlign: "center"}}>Proxima Web App - Jan 2024</Text>

          <Text>Without any advertising or even being fully launched on the App store, Proxima attracted enough attention to get 80 downloads. Something I was very proud of at the time, but not enough to sustain or grow Proxima into what it should be. But around February 2025, I had an idea. I was familiar with the Hevy app, having used it before myself and noticed that they had launched a public API. This compelled me to consider re-purposing the AI Program Builder into a Builder that also works for existing Hevy users. Giving free value to Hevy users, as well as getting some limelight for Proxima.</Text>
          <Text>It was an overwhelming success. Shockingly, my analytics skyrocketed, and people were joining from across the world to create programs and sign up for Proxima. The surge caused my supabase database to go over the egress on day 1. Over the first month we received 13,000 pageviews and 400 signups.</Text>
          <Img 
              style={{ borderRadius: 12, height: "auto", width: "90%", margin: '0 auto' }}
              src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc//program-builder-blueprint.webp"></Img>
            <Text style={ { textAlign: "center"}}>AI Program Builder Blueprint in Excalidraw</Text>
          
          <Text>From this I gathered a significant amount of feedback, positive and negative, but I am now informed that there is something certainly promising about what I am building. So, I am slowly but surely grinding through feature requests and knocking them off the list. With the hope that Proxima is going to become an indispensable tool in the next few months.</Text>
          <Text>I promise to you, that I will continue to work on Proxima to make it the best fitness app out there. I will listen to my users and I am always open to chat. All I ask of you is, please share the app with your Gym dudes/dudettes and help get the word out.</Text>
          <Text>Let&apos;s leave no gains on the table</Text>
          <Text>Jack,</Text>
          <Text>Founder,</Text>
          <Text>Proxima Fitness Inc.</Text>
          <Hr />
          <Section style={{ textAlign: 'center' }}>
              <table style={{ width: '100%' }}>
                  <tr style={{ width: '100%' }}>
                  <td align="center">
                      <Img
                      alt="React Email logo"
                      height="42"
                      src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/logos/proxima-logo.webp"
                      />
                  </td>
                  </tr>
                  <tr style={{ width: '100%' }}>
                  <td align="center">
                      <Text
                      style={{
                          marginTop: 8,
                          marginBottom: 8,
                          fontSize: 16,
                          lineHeight: '24px',
                          fontWeight: 600,
                          color: 'rgb(17,24,39)',
                      }}
                      >
                      Proxima Fitness Inc.
                      </Text>
                      <Text
                      style={{
                          marginTop: 4,
                          marginBottom: '0px',
                          fontSize: 16,
                          lineHeight: '24px',
                          color: 'rgb(107,114,128)',
                      }}
                      >
                      Leave No Gains On The Table
                      </Text>
                  </td>
                  </tr>
                  <tr>
                  <td align="center">
                      <Row
                      style={{
                          display: 'table-cell',
                          height: 44,
                          width: 56,
                          verticalAlign: 'bottom',
                      }}
                      >
                      <Column style={{ paddingRight: 8 }}>
                          <Link style={link} href="https://www.reddit.com/r/ProximaFitness/">
                          Reddit
                          </Link>
                      </Column>
                      <Column style={{ paddingRight: 8 }}>
                          <Link style={link} href="https://www.instagram.com/proximafitnessapp/">
                          Instagram
                          </Link>
                      </Column>
                      <Column style={{ paddingRight: 8 }}>
                          <Link style={link} href="https://discord.gg/4AhEd3eZpb">
                          Discord
                          </Link>
                      </Column>
                      <Column style={{ paddingRight: 8 }}>
                          <Link style={link} href="https://github.com/jack-hanlon">
                          Github
                          </Link>
                      </Column>
                      <Column style={{ paddingRight: 8 }}>
                          <Link style={link} href="https://x.com/jacklhanlon">
                          X
                          </Link>
                      </Column>
                      </Row>
                  </td>
                  </tr>
                  <tr>
                  <td align="center">
                      <Text
                      style={{
                          marginTop: 8,
                          marginBottom: 8,
                          fontSize: 16,
                          lineHeight: '24px',
                          fontWeight: 600,
                          color: 'rgb(107,114,128)',
                      }}
                      >
                      
                      </Text>
                      <Text
                      style={{
                          marginTop: 4,
                          marginBottom: '0px',
                          fontSize: 16,
                          lineHeight: '24px',
                          fontWeight: 600,
                          color: 'rgb(107,114,128)',
                      }}
                      >
                      jack@proximafitness.com
                      </Text>
                  </td>
                  </tr>
              </table>
          </Section>
      </Container>
    </Body>
  </Html>
)

export default BehindTheScenesEmail

const main = {
  backgroundColor: '#ffffff',
}

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
}

const h1 = {
  color: '#333',
  fontFamily:
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu','Russo One', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const link = {
  color: '#33bbcf',
  fontFamily:
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Russo One', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  textDecoration: 'underline',
}

const text = {
  color: '#333',
  fontFamily:
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Russo One', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  margin: '24px 0',
}

const footer = {
  color: '#898989',
  fontFamily:
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen','Russo One', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
}

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
}