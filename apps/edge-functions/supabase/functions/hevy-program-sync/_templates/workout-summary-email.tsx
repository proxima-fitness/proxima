// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ADR 0011 SP5: unused by hevy-program-sync (post-sync Resend path commented out).
 * Kept for a possible future re-engagement product — do not delete.
 */
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
  Font,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

type ProcessedWorkout = {
  workout_id: string;
  program_title: string;
  week_number: number;
  day_number: number;
  routine_id: string;
}

type ProgressedExercise = {
  exercise_template_id: string;
  exercise_name: string;
  exerciseType: string;
  completed_value: number;
  completed_unit: string;
  progression_amount: number;
  progression_unit: string;
}

type Progression = {
  workout_id: string;
  progressions: ProgressedExercise[];
}

type NewWeek = {
  programTitle: string;
  weekNumber: number;
}

type WorkoutSummaryEmailProps = {
  processedWorkouts?: ProcessedWorkout[];
  progressions?: Progression[];
  newWeeksAdded?: NewWeek[];
  userName?: string;
}

export const WorkoutSummaryEmail = ({ 
  processedWorkouts = [], 
  progressions = [], 
  newWeeksAdded = [],
  userName 
}: WorkoutSummaryEmailProps) => {
  const displayName = userName || 'Proxima Legend';
  
  return (
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
        <Heading as="h1" style={heading}>
          Great work on your latest workout!
        </Heading>

        <Text style={greeting}>
          Hey there, {displayName}!
        </Text>

        <Text style={bodyText}>
          Here&apos;s what I updated:
        </Text>

        <Section style={actionsBox}>
          {processedWorkouts.length > 0 && (
            <Section style={actionSection}>
              <Text style={sectionTitle}>
                Completed workouts
              </Text>
              {processedWorkouts.map((workout, index) => (
                <Text key={index} style={listItem}>
                  • <strong>{workout.program_title}</strong> - Week {workout.week_number}, Day {workout.day_number} marked as complete
                </Text>
              ))}
            </Section>
          )}

          {progressions.length > 0 && (
            <Section style={actionSection}>
              <Text style={sectionTitle}>
                Exercise progressions
              </Text>
              {progressions.map((progression, index) => (
                <div key={index} style={progressionContainer}>
                  {progression.progressions.map((exercise, exIndex) => {
                    const formatValue = (value: number, unit: string): string => {
                      if (unit === 'reps') {
                        return `${Math.round(value)} ${unit}`;
                      } else if (unit === 'kg') {
                        return `${value}${unit}`;
                      } else if (unit === 'km') {
                        return `${value}${unit}`;
                      } else if (unit === 'seconds') {
                        return `${Math.round(value)} ${unit}`;
                      } else {
                        return `${Math.round(value)} ${unit}`;
                      }
                    };

                    // For reps-based exercises, show "all sets of X reps"
                    // For other exercises, show the completed value with unit
                    let completedText: string;
                    if (exercise.completed_unit === 'reps') {
                      completedText = `all sets of ${Math.round(exercise.completed_value)} ${exercise.completed_unit}`;
                    } else if (exercise.exerciseType === 'distance_duration') {
                      completedText = `all sets of ${formatValue(exercise.completed_value, exercise.completed_unit)}`;
                    } else if (exercise.exerciseType === 'duration') {
                      completedText = `all sets of ${formatValue(exercise.completed_value, exercise.completed_unit)}`;
                    } else {
                      completedText = `all sets`;
                    }

                    const progressionText = exercise.progression_amount > 0
                      ? `+${formatValue(exercise.progression_amount, exercise.progression_unit)}`
                      : formatValue(exercise.progression_amount, exercise.progression_unit);

                    return (
                      <Text key={exIndex} style={listItem}>
                        • Great job you completed {completedText} for <strong>{exercise.exercise_name}</strong>, I&apos;ve added {progressionText} for your next workout!
                      </Text>
                    );
                  })}
                </div>
              ))}
            </Section>
          )}

          {newWeeksAdded.length > 0 && (
            <Section style={actionSection}>
              <Text style={sectionTitle}>
                New week added
              </Text>
              {newWeeksAdded.map((week, index) => (
                <Text key={index} style={listItem}>
                  • {week.programTitle} - Week {week.weekNumber} added to Hevy
                </Text>
              ))}
            </Section>
          )}
        </Section>

        <Text style={closing}>
          Keep crushing it,
        </Text>

        <Text style={signature}>Andy</Text>
        <Text style={signatureTitle}>Your AI Personal Trainer</Text>
        <Text style={signatureCompany}>Proxima Fitness</Text>

        <Hr style={divider} />

        <Section style={footerSection}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tr>
              <td align="center" style={{ paddingBottom: '16px' }}>
                <Img
                  alt="Proxima Fitness logo"
                  height="42"
                  src="https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/logos/proxima-logo.webp"
                />
              </td>
            </tr>
            <tr>
              <td align="center">
                <Text style={footerTitle}>
                  Proxima Fitness
                </Text>
                <Text style={footerTagline}>
                  Leave No Gains On The Table
                </Text>
              </td>
            </tr>
            <tr>
              <td align="center" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
                <Text style={footerLinks}>
                  <Link style={footerLink} href="https://www.reddit.com/r/ProximaFitness/">Reddit</Link>
                  {' · '}
                  <Link style={footerLink} href="https://www.instagram.com/proximafitnessapp/">Instagram</Link>
                  {' · '}
                  <Link style={footerLink} href="https://discord.gg/4AhEd3eZpb">Discord</Link>
                  {' · '}
                  <Link style={footerLink} href="https://github.com/jack-hanlon">GitHub</Link>
                  {' · '}
                  <Link style={footerLink} href="https://x.com/jacklhanlon">X</Link>
                </Text>
              </td>
            </tr>
            <tr>
              <td align="center">
                <Text style={footerEmail}>
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
}

export default WorkoutSummaryEmail

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: 'Roboto, Verdana, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #000000',
  borderRadius: '0px',
  paddingLeft: '24px',
  paddingRight: '24px',
  paddingTop: '32px',
  paddingBottom: '32px',
  margin: '0 auto',
  maxWidth: '600px',
}

const heading = {
  fontSize: '28px',
  fontWeight: 700,
  lineHeight: '36px',
  textAlign: 'center' as const,
  marginTop: '0px',
  marginBottom: '24px',
  color: '#111827',
}

const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '0px',
  marginBottom: '16px',
  color: '#111827',
}

const bodyText = {
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '0px',
  marginBottom: '24px',
  color: '#111827',
}

const actionsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  marginTop: '24px',
  marginBottom: '24px',
}

const actionSection = {
  marginTop: '0px',
  marginBottom: '24px',
}

const section = {
  marginTop: '32px',
  marginBottom: '32px',
}

const sectionTitle = {
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: '24px',
  marginTop: '0px',
  marginBottom: '16px',
  color: '#111827',
}

const listItem = {
  fontSize: '16px',
  lineHeight: '24px',
  marginLeft: '0px',
  marginBottom: '12px',
  color: '#111827',
}

const progressionContainer = {
  marginLeft: '0px',
  marginBottom: '16px',
}

const closing = {
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '32px',
  marginBottom: '8px',
  color: '#111827',
}

const signature = {
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '0px',
  marginBottom: '4px',
  color: '#111827',
}

const signatureTitle = {
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '0px',
  marginBottom: '4px',
  color: '#111827',
}

const signatureCompany = {
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '0px',
  marginBottom: '0px',
  color: '#111827',
}

const divider = {
  borderColor: '#e5e7eb',
  borderWidth: '1px',
  borderStyle: 'solid',
  marginTop: '32px',
  marginBottom: '32px',
}

const footerSection = {
  textAlign: 'center' as const,
  paddingTop: '0px',
}

const footerTitle = {
  marginTop: '8px',
  marginBottom: '8px',
  fontSize: '16px',
  lineHeight: '24px',
  fontWeight: 600,
  color: '#111827',
}

const footerTagline = {
  marginTop: '4px',
  marginBottom: '0px',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#6b7280',
}

const footerLinks = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
}

const footerLink = {
  color: '#6b7280',
  textDecoration: 'none',
}

const footerEmail = {
  marginTop: '16px',
  marginBottom: '0px',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
}

