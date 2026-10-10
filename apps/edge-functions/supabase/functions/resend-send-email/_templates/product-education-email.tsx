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

export const ProductEducationEmail = () => (
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
        <Heading as="h2">Congrats on starting your first workout program!</Heading>
        <Text>
          Thanks for joining Proxima! We're building the fastest, smartest way to create, manage, and track workout programs - powered by AI.
        </Text>
        <Text>
          Whether you're a beginner or an experienced lifter, Proxima was built to solve a key problem: 
          <b> creating high-quality workout plans quickly, without needing hours of manual setup or expensive coaching.</b>
        </Text>

        <Heading
          style={{
            fontSize: '24px',
            lineHeight: '32px',
            marginBottom: '42px',
            textAlign: 'center',
          }}
        >
          3 Powerful Ways to Use Proxima
        </Heading>

        {[
          {
            number: 1,
            title: "AI Program Builder",
            description: (
              <>
                Use our <Link style={link} href="https://proximafitness.com/program-builder">AI Program Builder</Link> to build custom workout programs in seconds. 
                Input your goals, equipment, and preferences - Proxima's AI designs a program for you instantly. 
                You can customize it further as needed.
              </>
            ),
          },
          {
            number: 2,
            title: "Workout Programs Directory",
            description: (
              <>
                Browse our growing <Link style={link} href="https://app.proximafitness.com/home">programs library</Link> to find ready-made, high-quality programs.
                Filter by goal, equipment, difficulty, or style - then save them to your account with one click.
              </>
            ),
          },
          {
            number: 3,
            title: "Track & Optimize Your Training",
            description: (
              <>
                Use Proxima to track your workout progress easily. 
                Just like Hevy, Proxima is a standalone gym app, with tracking features you can use right away with your new program.
              </>
            ),
          },
        ].map((feature) => (
          <Section key={ feature.title } style={{ marginBottom: '36px' }}>
            <div
              style={{
                alignItems: 'flex-start',
                display: 'inline-flex',
                marginLeft: '12px',
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  backgroundColor: '#33bbcf',
                  borderRadius: '9999px',
                  color: 'white',
                  display: 'flex',
                  flexShrink: 0,
                  fontSize: '12px',
                  fontWeight: 600,
                  height: '24px',
                  justifyContent: 'center',
                  lineHeight: 1,
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
                    margin: 0,
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
                  jack@proximafitness.com
                </Text>
              </td>
            </tr>
          </table>
        </Section>
      </Container>
    </Body>
  </Html>
);

  export default ProductEducationEmail


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