import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {db} from "../config/firebase";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";


// Check for upcoming payments and send reminders
export const checkUpcomingPayments = onSchedule("every 24 hours", async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Query for payments due in the next 3 days
    const paymentsSnapshot = await db
      .collection("payments")
      .where("dueDate", ">=", now)
      .where("dueDate", "<=", threeDaysFromNow)
      .where("reminderSent", "==", false)
      .get();

    // Process each payment
    for (const doc of paymentsSnapshot.docs) {
      const payment = doc.data();

      // Get the associated contract to get user email
      const contractDoc = await db
        .collection("contracts")
        .doc(payment.contractId)
        .get();
      const contract = contractDoc.data();

      if (contract && contract.userEmail) {
        // Create email reminder
        const mailOptions = {
          to: contract.userEmail,
          from: "sergedamouzou@gmail.com",
          subject: "Payment Reminder",
          text:
            "This is a reminder that your payment of $" + payment.amount +
            " for contract " + payment.contractId +
            " is due on " + payment.dueDate.toDate().toLocaleDateString() + ".",
          html:
            "<h2>Payment Reminder</h2>" +
            "<p>This is a reminder that your payment of $" + payment.amount +
            " for contract " + payment.contractId +
            " is due on " + payment.dueDate.toDate().toLocaleDateString() + ".</p>" +
            "<p>Please ensure your payment is made on time to avoid any late fees.</p>" +
            "<p>Thank you,<br>The Verza Team</p>",
        };

        // Add to mail collection for Firebase Trigger Email
        await db.collection("mail").add(mailOptions);

        // Mark reminder as sent
        await doc.ref.update({reminderSent: true});

        logger.info(
          `Sent payment reminder for payment ${doc.id} to ${contract.userEmail}`
        );
      } else {
        logger.error(`Could not find user email for payment ${doc.id}`);
      }
    }
  } catch (error) {
    logger.error("Error checking upcoming payments:", error);
  }
});

// Update contract statuses
export const updateContractStatuses = onSchedule("every 24 hours", async () => {
  try {
    const db = admin.firestore();
    const now = new Date();

    // Query for contracts that need status updates
    const contractsSnapshot = await db
      .collection("contracts")
      .where("endDate", "<=", now)
      .where("status", "==", "active")
      .get();

    // Update each contract
    for (const doc of contractsSnapshot.docs) {
      const contract = doc.data();

      // Update contract status
      await doc.ref.update({status: "completed"});

      // Send completion notification if user email exists
      if (contract.userEmail) {
        const mailOptions = {
          to: contract.userEmail,
          from: "sergedamouzou@gmail.com",
          subject: "Contract Completed",
          text: `Your contract ${doc.id} has been marked as completed. ` +
            "Thank you for using Verza!",
          html: `
            <h2>Contract Completed</h2>
            <p>Your contract ${doc.id} has been marked as completed.</p>
            <p>Thank you for using Verza!</p>
            <p>Best regards,<br>The Verza Team</p>
          `,
        };

        await db.collection("mail").add(mailOptions);
      }

      logger.info(
        `Updated contract ${doc.id} status to completed`
      );
    }
  } catch (error) {
    logger.error("Error updating contract statuses:", error);
  }
});

// Send reminders for overdue invoices
export const sendOverdueInvoiceReminders = onSchedule("every 24 hours", async () => {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Query for overdue invoices that need reminders
    const contractsSnapshot = await db
      .collection("contracts")
      .where("invoiceStatus", "in", ["sent", "viewed"])
      .where("dueDate", "<", now)
      .where("lastReminderSentAt", "<", threeDaysAgo)
      .get();

    logger.info(`Found ${contractsSnapshot.size} overdue invoices that need reminders`);

    // Process each overdue invoice
    for (const doc of contractsSnapshot.docs) {
      const contract = doc.data();
      const contractId = doc.id;

      try {
        // Skip if no client email
        if (!contract.clientEmail) {
          logger.warn(`No client email found for contract ${contractId}`);
          continue;
        }

        // Send reminder email
        const msg = {
          to: contract.clientEmail,
          from: process.env.SENDGRID_FROM_EMAIL || "serge@datatrixs.com",
          subject: "Payment Reminder - Overdue Invoice",
          text: `This is a reminder that your payment of $${contract.amount} for ` +
            `contract ${contractId} is overdue. Please process your payment as soon as possible.`,
          html: `
            <h2>Payment Reminder - Overdue Invoice</h2>
            <p>This is a reminder that your payment of $${contract.amount} for ` +
            `contract ${contractId} is overdue.</p>
            <p>Please process your payment as soon as possible to avoid any late fees.</p>
            <p>Thank you,<br>The Verza Team</p>
          `,
        };

        await sgMail.send(msg);

        // Update contract with reminder sent timestamp and add to history
        await doc.ref.update({
          lastReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          invoiceHistory: admin.firestore.FieldValue.arrayUnion({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            action: "Payment Reminder Sent",
            details: `To: ${contract.clientEmail}`,
          }),
        });

        // Log the reminder
        await db.collection("emailLogs").add({
          contractId,
          to: contract.clientEmail,
          type: "overdue_payment_reminder",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });

        logger.info(`Sent overdue payment reminder for contract ${contractId} to ${contract.clientEmail}`);
      } catch (error) {
        logger.error(`Error processing reminder for contract ${contractId}:`, error);
        // Continue with next contract even if one fails
        continue;
      }
    }
  } catch (error) {
    logger.error("Error in sendOverdueInvoiceReminders:", error);
  }
});
