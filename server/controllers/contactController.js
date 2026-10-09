import { sendEmail } from "../utils/sendEmail.js";
import Settings from "../models/Settings.js";

// @desc    Submit contact form message
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const settings = await Settings.getSingleton();
    const adminEmail = settings.supportEmail || process.env.EMAIL_USER;

    if (adminEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendEmail({
        to: adminEmail,
        subject: `[Contact Form] ${subject}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Contact Inquiry</h2>
            <p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f4f4f5; padding: 15px; border-radius: 8px;">${message}</p>
          </div>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: "Thank you for reaching out. Your message has been sent successfully!",
    });
  } catch (error) {
    next(error);
  }
};
