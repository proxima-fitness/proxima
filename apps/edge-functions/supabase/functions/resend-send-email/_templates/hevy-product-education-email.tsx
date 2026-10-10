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
  
export const HevyProductEducationEmail = () => (
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
        <Heading as="h2">Let's start training with our new program</Heading>
        <Text>Congrats! You saved your first program to Proxima using AI. Now, if you are a Hevy app user we can take advantage of the Hevy x Proxima integration and save this program to Hevy.
          If you are not a Hevy user, that's ok ! We can still track this program in Proxima. 
        </Text>
        <Text>For Hevy users please follow these instructions to setup the Hevy integration. Remember - You must be a Hevy pro user to do this.</Text>
        <Heading
          style={{
            fontSize: '24px',
            lineHeight: '32px',
            marginBottom: '42px',
            textAlign: 'center',
          }}
        >
      Hevy Integration Instructions
    </Heading>
    {[
      {
        number: 1,
        title: 'Sign in to the Proxima Website or Mobile App',
        description: (
          <>
          In order to access your program you must be signed into the <Link style={link} href="https://app.proximafitness.com">website</Link> or the <Link style={link} href=" https://testflight.apple.com/join/dG4SXTTm">iOS beta.</Link>
          </>
        )
      },
      {
        number: 2,
        title: 'Generate Hevy API Key',
        description: (
          <>
          This key will allow Proxima to access and make changes to your Hevy account data. You can retrieve it by logging into your Hevy account on a LAPTOP and navigating to <Link style={link} href="https://hevy.com/settings?developer">developer settings</Link>. Then you must generate and copy an API key and return to the Proxima Website/App.
          <Img 
              style={{ background: "#fff", borderRadius: 12, margin: '0 auto', width: "90%", marginTop: "12px" }}
              src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/how-to-hevy-integration/generate_key.png"></Img>
          </>
        )
          
      },
      {
        number: 3,
        title: 'Connect Hevy API Key',
        description: (
          <>
          Now that you have the API Key copied to your clipboard, return to the Proxima Website/App and go to the settings menu in the top right corner. Select the option that says "Connect Hevy App". A pop-up should appear, paste your API key in there and press OK. Congrats ! Your Proxima and Hevy accounts are connected.
          <Img 
              style={{ background: "#000", borderRadius: 12, margin: '0 auto', width: "90%", marginTop: "12px" }}
              src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/how-to-hevy-integration/connect_key.png"></Img>
          </>
        )
      },
      {
        number: 4,
        title: 'Save Program to Hevy',
        description: (
          <>
          
          First, go to the Workout Tab in Proxima and then press on the Info Icon on your program. This will take you to the Program View page. In the Program Overview section on the right hand side, there is an upload icon with Hevy written next to it. Click on it and a popup should appear. You now have two options: Export 1st Week, or Export entire Program. At this point I recommend exporting just the first week, as there are some performance issues on uploading an entire program. You can always come back and import the rest of the program when you need it. Press save to export.
          <Img 
              style={{ background: "#000", borderRadius: 12, margin: '0 auto', width: "90%", marginTop: "12px" }}
              src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/how-to-hevy-integration/export.png"></Img>
          </>
        )
      },
      {
        number: 5,
        title: 'Check out your new program in Hevy',
        description:
          'Go to the Hevy app, and check out your brand new effortlessly created program!',
      },
    ].map((feature) => (
      <Section
        style={{
          marginBottom: '36px',
        }}
      >
        <div
          style={{
            alignItems: 'flex-start',
            display: 'inline-flex',
            marginLeft: '12px',
            // marginRight: '32px',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              backgroundColor: '#33bbcf',
              borderRadius: '9999px',
              color: 'rgb(255,255,255)',
              display: 'flex',
              flexShrink: '0',
              fontSize: '12px',
              fontWeight: '600',
              height: '24px',
              justifyContent: 'center',
              lineHeight: '1',
              marginRight: '18px',
              width: '24px',
            }}
          >
            {feature.number}
          </div>
          <div>
            <Heading
              as="h2"
              style={{
                color: 'rgb(17,24,39)',
                fontSize: '18px',
                lineHeight: '28px',
                marginBottom: '8px',
                marginTop: '0px',
              }}
            >
              {feature.title}
            </Heading>
            <Text
              style={{
                color: 'rgb(107,114,128)',
                fontSize: '14px',
                lineHeight: '24px',
                margin: '0px',
              }}
            >
              {feature.description}
            </Text>
          </div>
        </div>
      </Section>
    ))}
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
                                  alt=""
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

export default HevyProductEducationEmail

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
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const link = {
  color: "#33bbcf",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  textDecoration: 'underline',
}

const text = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  margin: '24px 0',
}

const footer = {
  color: '#898989',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
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