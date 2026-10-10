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
  Button,
  Font,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
  
export const PromotionsOffersEmail = () => (
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
        <Section style={{ marginBottom: '42px' }}>
          <Heading
            style={{
              fontSize: '24px',
              lineHeight: '32px',
              marginBottom: '12px',
              textAlign: 'left',
            }}
          >
            Choose the right plan for you
          </Heading>
          <Text
            style={{
              color: 'rgb(107,114,128)',
              fontSize: '14px',
              lineHeight: '20px',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: '500px',
              textAlign: 'left',
            }}
          >
            Choose an affordable plan with top features to engage audiences,
            build loyalty, and boost sales.
          </Text>
        </Section>
        <Section
          style={{
            alignItems: 'flex-start',
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            paddingBottom: '24px',
          }}
        >
          {[
            {
              title: 'Hobby',
              price: 29,
              highlighted: false,
              description: 'The perfect plan for getting started.',
              features: [
                '25 products',
                'Up to 10,000 subscribers',
                'Advanced analytics',
                '24-hour support response time',
              ],
              buttonText: 'Get started today',
              buttonUrl: '#',
            },
            {
              title: 'Enterprise',
              price: 99,
              highlighted: true,
              description: 'Dedicated support and enterprise ready.',
              features: [
                'Unlimited products',
                'Unlimited subscribers',
                'Advanced analytics',
                'Dedicated support representative',
                'Marketing automations',
                'Custom integrations',
              ],
              buttonText: 'Get started today',
              buttonUrl: '#',
            },
          ].map((plan) => (
            <Section
              style={{
                backgroundColor: plan.highlighted
                  ? 'rgb(16,24,40)'
                  : 'rgb(255,255,255)',
                borderColor: plan.highlighted
                  ? 'rgb(16,24,40)'
                  : 'rgb(209,213,219)',
                borderRadius: '8px',
                borderStyle: 'solid',
                borderWidth: '1px',
                color: plan.highlighted ? 'rgb(209,213,219)' : 'rgb(75,85,99)',
                marginBottom: plan.highlighted ? '12px' : '24px',
                padding: '24px',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: plan.highlighted
                    ? '#33bbcf'
                    : '#33bbcf',
                  fontSize: '14px',
                  fontWeight: '600',
                  lineHeight: '20px',
                  marginBottom: '16px',
                }}
              >
                {plan.title}
              </Text>
              <Text
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  marginTop: '0px',
                }}
              >
                <span
                  style={{
                    color: plan.highlighted
                      ? 'rgb(255,255,255)'
                      : 'rgb(16,24,40)',
                  }}
                >
                  ${plan.price}
                </span>{' '}
                <span style={{ fontSize: '14px', lineHeight: '20px' }}>
                  / month
                </span>
              </Text>
              <Text
                style={{
                  marginTop: '12px',
                  marginBottom: '24px',
                }}
              >
                {plan.description}
              </Text>
              <ul
                style={{
                  fontSize: '12px',
                  lineHeight: '20px',
                  marginBottom: '30px',
                  paddingLeft: '14px',
                }}
              >
                {plan.features.map((feature) => (
                  <li key={feature} style={{ marginBottom: '8px' }}>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href={plan.buttonUrl}
                style={{
                  backgroundColor: '#33bbcf',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  color: 'rgb(255,255,255)',
                  display: 'inline-block',
                  fontWeight: '600',
                  margin: '0px',
                  maxWidth: '100%',
                  padding: '12px',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                {plan.buttonText}
              </Button>
            </Section>
          ))}
        </Section>
        <Hr style={{ marginTop: '0px' }} />
        <Text
          style={{
            color: 'rgb(107,114,128)',
            fontSize: '12px',
            lineHeight: '16px',
            fontWeight: '500',
            marginTop: '30px',
            textAlign: 'center',
          }}
        >
          Customer Experience Research Team
        </Text>
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

export default PromotionsOffersEmail
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