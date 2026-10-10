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
  
export const ValueAddContentEmail = () => (
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
          <Heading as="h2">Congrats on completing your first Workout! That's no easy feat</Heading>
              <Text>Only about 2.4% of the world’s population attends a gym, and 50% of new members quit within the first 6 months. So it’s safe to say, you’re on your way to being in the top 1% of health and fitness worldwide (if you aren’t already). Our mission is to guarantee you get past the plateau you’re currently stuck at in your physical fitness.</Text>
              <Text></Text>
              <Section style={{ marginTop: 16, marginBottom: 16 }}>
                <Section>
                  <Row>
                    <Text
                      style={{
                        margin: '0px',
                        fontSize: 24,
                        lineHeight: '32px',
                        fontWeight: 600,
                        color: 'rgb(17,24,39)',
                      }}
                    >
                      Here are some fitness tips to level up
                    </Text>
                  </Row>
                </Section>
                <Section>
                  <Hr
                    style={{
                      marginLeft: '0px',
                      marginRight: '0px',
                      marginTop: 32,
                      marginBottom: 32,
                      width: '100%',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgb(209,213,219) !important',
                    }}
                  />
                  <Section>
                    <Row>
                      <Column style={{ verticalAlign: 'baseline' }}>
                        <Img
                          alt="heart icon"
                          height="48"
                          src="https://react.email/static/heart-icon.png"
                          width="48"
                        />
                      </Column>
                      <Column style={{ width: '85%' }}>
                        <Text
                          style={{
                            margin: '0px',
                            fontSize: 20,
                            fontWeight: 600,
                            lineHeight: '28px',
                            color: 'rgb(17,24,39)',
                          }}
                        >
                          Prioritize Progressive Overload
                        </Text>
                        <Text
                          style={{
                            margin: '0px',
                            marginTop: 8,
                            fontSize: 16,
                            lineHeight: '24px',
                            color: 'rgb(107,114,128)',
                          }}
                        >
                          Consistently challenge your muscles by increasing weight, reps, or intensity over time. Even small, steady increases lead to serious long-term strength and performance gains.
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                  <Hr
                    style={{
                      marginLeft: '0px',
                      marginRight: '0px',
                      marginTop: 32,
                      marginBottom: 32,
                      width: '100%',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgb(209,213,219) !important',
                    }}
                  />
                  <Section>
                    <Row>
                      <Column style={{ verticalAlign: 'baseline' }}>
                        <Img
                          alt="rocket icon"
                          height="48"
                          src="https://react.email/static/rocket-icon.png"
                          width="48"
                        />
                      </Column>
                      <Column style={{ width: '85%' }}>
                        <Text
                          style={{
                            margin: '0px',
                            fontSize: 20,
                            fontWeight: 600,
                            lineHeight: '28px',
                            color: 'rgb(17,24,39)',
                          }}
                        >
                          Master Tempo Training
                        </Text>
                        <Text
                          style={{
                            margin: '0px',
                            marginTop: 8,
                            fontSize: 16,
                            lineHeight: '24px',
                            color: 'rgb(107,114,128)',
                          }}
                        >
                          Slow down your reps to maximize time under tension. Controlling the lowering (eccentric) phase for 3–5 seconds can dramatically increase strength, hypertrophy, and joint stability.
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                  <Hr
                    style={{
                      marginLeft: '0px',
                      marginRight: '0px',
                      marginTop: 32,
                      marginBottom: 32,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgb(209,213,219) !important',
                    }}
                  />
                  <Section>
                    <Row>
                      <Column style={{ verticalAlign: 'baseline' }}>
                        <Img
                          alt="heart icon"
                          height="48"
                          src="https://react.email/static/heart-icon.png"
                          width="48"
                        />
                      </Column>
                      <Column style={{ width: '85%' }}>
                        <Text
                          style={{
                            margin: '0px',
                            fontSize: 20,
                            fontWeight: 600,
                            lineHeight: '28px',
                            color: 'rgb(17,24,39)',
                          }}
                        >
                          Optimize Recovery Windows
                        </Text>
                        <Text
                          style={{
                            margin: '0px',
                            marginTop: 8,
                            fontSize: 16,
                            lineHeight: '24px',
                            color: 'rgb(107,114,128)',
                          }}
                        >
                          High-intensity training demands strategic recovery. Prioritize 7–9 hours of sleep, active recovery days, and proper nutrition (1g/lb bodyweight protein intake per day) to maximize results.
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                  <Hr
                    style={{
                      marginLeft: '0px',
                      marginRight: '0px',
                      marginTop: 32,
                      marginBottom: 32,
                      width: '100%',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgb(209,213,219) !important',
                    }}
                  />
                  <Section>
                    <Row>
                      <Column style={{ verticalAlign: 'baseline' }}>
                        <Img
                          alt="heart icon"
                          height="48"
                          src="https://react.email/static/heart-icon.png"
                          width="48"
                        />
                      </Column>
                      <Column style={{ width: '85%' }}>
                        <Text
                          style={{
                            margin: '0px',
                            fontSize: 20,
                            fontWeight: 600,
                            lineHeight: '28px',
                            color: 'rgb(17,24,39)',
                          }}
                        >
                          Focus on Movement Quality Over Quantity
                        </Text>
                        <Text
                          style={{
                            margin: '0px',
                            marginTop: 8,
                            fontSize: 16,
                            lineHeight: '24px',
                            color: 'rgb(107,114,128)',
                          }}
                        >
                          Don’t chase reps - chase good form. Cleaner, more controlled movement patterns will reduce injury risk, improve muscle recruitment, and help you break plateaus faster.
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                </Section>
                <Hr
                    style={{
                      marginLeft: '0px',
                      marginRight: '0px',
                      marginTop: 32,
                      marginBottom: 32,
                      width: '100%',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgb(209,213,219) !important',
                    }}
                  />
                  <Section>
                    <Row>
                      <Column style={{ verticalAlign: 'baseline' }}>
                        <Img
                          alt="heart icon"
                          height="48"
                          src="https://react.email/static/heart-icon.png"
                          width="48"
                        />
                      </Column>
                      <Column style={{ width: '85%' }}>
                        <Text
                          style={{
                            margin: '0px',
                            fontSize: 20,
                            fontWeight: 600,
                            lineHeight: '28px',
                            color: 'rgb(17,24,39)',
                          }}
                        >
                          Get a Program !
                        </Text>
                        <Text
                          style={{
                            margin: '0px',
                            marginTop: 8,
                            fontSize: 16,
                            lineHeight: '24px',
                            color: 'rgb(107,114,128)',
                          }}
                        >
                          Random workouts lead to random results. Following a structured program - with built-in progressions, deloads, and goals - ensures every session moves you closer to the results you want. But you're already doing that with Proxima right :)  
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                </Section>
                <Hr
                    style={{
                      marginLeft: '0px',
                      marginRight: '0px',
                      marginTop: 32,
                      marginBottom: 32,
                      width: '100%',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgb(209,213,219) !important',
                    }}
                  />
             <Text>We&apos;re on a mission to build the best AI integrated program builder & workout directory out there. To make high quality programs readily accessible to all levels of lifters, as well as making the tooling extremely simple and fast to use.</Text>
              <Text>I am here to help. If you have any questions you can reach out to me personally at <Link style={link} href="mailto:jack@proximafitness.com">jack@proximafitness.com</Link>. If you&apos;d like to support me more, please join the Discord or the subreddit in the links below</Text>
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

export default ValueAddContentEmail

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