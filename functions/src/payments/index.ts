import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import {db} from "../config/firebase";
import sgMail from "@sendgrid/mail";
import * as admin from "firebase-admin";

// Initialize Stripe
let stripe: Stripe;
try {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  stripe = new Stripe(stripeKey, {
    apiVersion: "2025-04-30.basil",
  });
} catch (error) {
  logger.error("Error initializing Stripe:", error);
  // Create a mock Stripe instance for local testing
  stripe = {
    paymentIntents: {
      create: async () => ({client_secret: "mock_secret"}),
      retrieve: async () => ({status: "succeeded"}),
    },
  } as unknown as Stripe;
}

// Initialize SendGrid
const sendgridKey = process.env.SENDGRID_API_KEY;
if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
} else {
  logger.warn("SENDGRID_API_KEY is not set. Emails will not be sent.");
}

/**
 * Verifies the Firebase ID token from the Authorization header
 * @param {string | undefined} authHeader - The Authorization header from the request
 * @return {Promise<string>} The user ID if the token is valid
 * @throws {Error} If the token is missing or invalid
 */
async function verifyAuthToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("No token provided");
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    logger.error("Error verifying auth token:", error);
    throw new Error("Invalid token");
  }
}

// Create payment intent
export const createPaymentIntent = onRequest(async (request, response) => {
  // Set CORS headers
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  try {
    // Verify authentication
    const userId = await verifyAuthToken(request.headers.authorization);

    // Validate request body
    const {amount, currency = "usd", contractId} = request.body;
    if (!amount || !contractId) {
      throw new Error("Amount and contractId are required");
    }

    // Verify user has access to this contract
    const contractDoc = await db.collection("contracts").doc(contractId).get();
    if (!contractDoc.exists || contractDoc.data()?.userId !== userId) {
      throw new Error("Contract not found or access denied");
    }

    // Create payment intent with metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        contractId,
        userId,
      },
    });

    // Log the payment intent creation
    await db.collection("paymentIntents").add({
      paymentIntentId: paymentIntent.id,
      contractId,
      userId,
      amount,
      currency,
      status: paymentIntent.status,
      created: new Date(),
    });

    response.json({clientSecret: paymentIntent.client_secret});
  } catch (error) {
    logger.error("Error creating payment intent:", error);
    response.status(401).json({
      error: "Failed to create payment intent",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Handle successful payment
export const handlePaymentSuccess = onRequest(async (request, response) => {
  const sig = request.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    logger.error("Missing stripe signature or webhook secret");
    response.status(400).send("Missing stripe signature or webhook secret");
    return;
  }

  let event: Stripe.Event;

  try {
    // Get the raw request body as a string
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new Error("No raw body found in request");
    }

    // Verify the event using the raw body and signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      endpointSecret
    );
  } catch (err) {
    logger.error("Webhook signature verification failed:", err);
    response.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    return;
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const {amount, currency, customer, metadata} = paymentIntent;
    const {contractId, userId} = metadata;

    if (!contractId || !userId) {
      logger.error("Missing contractId or userId in payment intent metadata");
      response.status(400).send("Invalid payment intent metadata");
      return;
    }

    try {
      // Update contract status
      await db.collection("contracts").doc(contractId).update({
        paymentStatus: "paid",
        updatedAt: new Date(),
      });

      // Get customer email from Stripe
      let customerEmail = "";
      if (customer) {
        const customerData = await stripe.customers.retrieve(customer as string);
        if (!customerData.deleted) {
          customerEmail = (customerData as Stripe.Customer).email || "";
        }
      }

      // Send confirmation email
      if (customerEmail) {
        const msg = {
          to: customerEmail,
          from: process.env.SENDGRID_FROM_EMAIL || "serge@datatrixs.com",
          subject: "Payment Confirmation",
          text: `Your payment of ${amount / 100} ${currency.toUpperCase()} for contract ${contractId} has been received.`,
          html: `
            <h2>Payment Confirmation</h2>
            <p>Your payment of ${amount / 100} ${currency.toUpperCase()} for contract ${contractId} has been received.</p>
            <p>Thank you for your business!</p>
            <p>The Verza Team</p>
          `,
        };

        try {
          await sgMail.send(msg);
          logger.info("Payment confirmation email sent successfully");
        } catch (emailError) {
          logger.error("Failed to send payment confirmation email:", emailError);
        }
      }

      // Log the successful payment
      await db.collection("payments").add({
        paymentIntentId: paymentIntent.id,
        contractId,
        userId,
        amount,
        currency,
        customerId: customer,
        customerEmail,
        status: "succeeded",
        timestamp: new Date(),
      });

      response.json({received: true});
    } catch (error) {
      logger.error("Error processing successful payment:", error);
      response.status(500).json({
        error: "Failed to process payment",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    // Return a 200 response for other event types
    response.json({received: true});
  }
});
