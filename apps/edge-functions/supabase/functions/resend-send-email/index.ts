// SPDX-License-Identifier: AGPL-3.0-only

import React from 'npm:react@18.3.1';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import WelcomeEmail from "./_templates/welcome-email.tsx";
import BehindTheScenesEmail from "./_templates/behind-the-scenes-email.tsx";
import CustomerStoriesEmail from "./_templates/customer-stories-email.tsx";
import FeedbackEmail from "./_templates/feedback-email.tsx";
import HevyProductEducationEmail from "./_templates/hevy-product-education-email.tsx";
import ProductEducationEmail from "./_templates/product-education-email.tsx";
import PromotionsOffersEmail from "./_templates/promotions-offers-email.tsx";
import ValueAddContentEmail from "./_templates/value-add-content-email.tsx";
import WorkoutScheduledEmail from "./_templates/workout-scheduled.tsx";
import { corsHeaders } from '../_shared/cors.ts';
var EEmailType;
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const { to, subject, emailType } = await req.json();
  let reactEmail = WelcomeEmail;
  if (emailType === "welcome_email") {
    reactEmail = WelcomeEmail;
  } else if (emailType === "programs_product_education_email") {
    reactEmail = ProductEducationEmail;
  } else if (emailType === "hevy_product_education_email") {
    reactEmail = HevyProductEducationEmail;
  } else if (emailType === "value_add_content_email") {
    reactEmail = ValueAddContentEmail;
  } else if (emailType === "feedback_email") {
    reactEmail = FeedbackEmail;
  } else if (emailType === "behind_the_scenes_email") {
    reactEmail = BehindTheScenesEmail;
  } else if (emailType === "customer_stories_email") {
    reactEmail = CustomerStoriesEmail;
  } else if (emailType === "promotions_offers_email") {
    reactEmail = PromotionsOffersEmail;
  } else if (emailType === "workout_today") {
    reactEmail = WorkoutScheduledEmail;
  }
  try {
    const html = await renderAsync(React.createElement(reactEmail));
    const { error } = await resend.emails.send({
      from: 'Jack from Proxima <jack@send.proximafitness.com>',
      to: to,
      subject: subject,
      html
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({
      error: {
        http_code: error.code,
        message: error.message
      }
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: responseHeaders
  });
});
