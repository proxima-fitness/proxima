// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Text,
  Img,
  Hr, 
  Section,
  Column,
  Row,
  Font,
} from 'npm:@react-email/components@0.0.22'
  import * as React from 'npm:react@18.3.1'
  
export const CustomerStoriesEmail = () => (
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
        <Heading as="h2">Thank you for being a part of Proxima !</Heading>

        <Text>
          We’re incredibly grateful for all the support you’ve shown us since Proxima launched. 
          Every message, every piece of feedback, and every program built has meant the world to us.
        </Text>
        <Text>
          Seeing the impact Proxima is already having on lifters around the world has been truly humbling, 
          and we’re just getting started. Thank you for believing in us and helping shape the future of fitness.
        </Text>
        <Text>Fellow fitness enthusiasts are creating programs all across the globe</Text>
        <Section style={{ marginTop: 16, marginBottom: 16 }}>
            <Row>
              <Text
                style={{
                  margin: '0px',
                  fontSize: 16,
                  lineHeight: '24px',
                  fontWeight: 600,
                  color: '#33bbcf',
                }}
              >
                Worldwide Impact
              </Text>
              <Text
                style={{
                  margin: '0px',
                  marginTop: 8,
                  fontSize: 24,
                  lineHeight: '32px',
                  fontWeight: 600,
                  color: 'rgb(17,24,39)',
                }}
              >
                AI Built Programs Globally
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  lineHeight: '24px',
                  color: 'rgb(107,114,128)',
                }}
              >
                FACT: Programs are being created with AI in countries such as Uzbekistan, Mauritius, and Andorra.   
              </Text>
            </Row>
            
          </Section>

        <Img src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/10.png"></Img>
        <Section style={{ marginTop: 16, marginBottom: 16 }}>
            <Row>
              <Text
                style={{
                  margin: '0px',
                  fontSize: 16,
                  lineHeight: '24px',
                  fontWeight: 600,
                  color: '#33bbcf',
                }}
              >
                Reddit Launch
              </Text>
              <Text
                style={{
                  margin: '0px',
                  marginTop: 8,
                  fontSize: 24,
                  lineHeight: '32px',
                  fontWeight: 600,
                  color: 'rgb(17,24,39)',
                }}
              >
                Proxima User Feedback
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  lineHeight: '24px',
                  color: 'rgb(107,114,128)',
                }}
              >
                Thanks for all the fantastic feedback. It motivates me to keep building.
              </Text>
            </Row>
          </Section>
          <Section style={{ marginTop: 16 }}>
            <Row style={{ marginTop: 16 }}>
              <Column style={{ width: '50%', paddingRight: 8 }}>
                <Row style={{ paddingBottom: 8 }}>
                  <td>
                      <Img
                        alt="1"
                        height={152}
                        src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/1.png"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          objectFit: 'scale-down',
                          background: "#000",
                        }}
                      />
                  </td>
                </Row>
                <Row style={{ paddingTop: 8 }}>
                  <td>
                      <Img
                        alt="Bundle Collection"
                        height={152}
                        src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/2.png"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          objectFit: 'scale-down',
                          background: "#000",
                        }}
                      />
                  </td>
                </Row>
              </Column>
              <Column
                style={{
                  width: '50%',
                  paddingLeft: 8,
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                  <Img
                    alt="Clara French Press"
                    height={152 + 152 + 8 + 8}
                    src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/3.png"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      objectFit: "scale-down",
                      background: "#000",
                    }}
                  />
              </Column>
            </Row>
            <Row style={{ marginTop: 16 }}>
              <Column style={{ width: '50%', paddingRight: 8 }}>
                <Row style={{ paddingBottom: 8 }}>
                  <td>
                      <Img
                        alt="1"
                        height={152}
                        src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/4.png"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          objectFit: 'scale-down',
                          background: "#000",
                        }}
                      />
                  </td>
                </Row>
                <Row style={{ paddingTop: 8 }}>
                  <td>
                      <Img
                        alt="Bundle Collection"
                        height={152}
                        src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/7.png"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          objectFit: 'contain',
                          background: "#000",
                        }}
                      />
                  </td>
                </Row>
              </Column>
              <Column
                style={{
                  width: '50%',
                  paddingLeft: 8,
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                  <Img
                    alt="Clara French Press"
                    height={152 + 152 + 8 + 8}
                    src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/6.png"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      objectFit: 'scale-down',
                      background: "#000",
                    }}
                  />
              </Column>
            </Row>
            <Row style={{ marginTop: 16 }}>
              <Column style={{ width: '50%', paddingRight: 8 }}>
                <Row style={{ paddingBottom: 8 }}>
                  <td>
                      <Img
                        alt="1"
                        height={152}
                        src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/9.png"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          objectFit: 'cover',
                          background: "#000",
                        }}
                      />
                  </td>
                </Row>
                <Row style={{ paddingTop: 8 }}>
                  <td>
                      <Img
                        alt="Bundle Collection"
                        height={152}
                        src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/5.png"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          objectFit: 'scale-down',
                          background: "#000",
                        }}
                      />
                  </td>
                </Row>
              </Column>
              <Column
                style={{
                  width: '50%',
                  paddingLeft: 8,
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                  <Img
                    alt="Clara French Press"
                    height={152 + 152 + 8 + 8}
                    src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/8.png"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      objectFit: 'scale-down',
                      background: "#000",
                    }}
                  />
              </Column>
            </Row>
          </Section>
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

export default CustomerStoriesEmail

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