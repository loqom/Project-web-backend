const { Resend } = require("resend");

// Instantiate lazily so the whole server never crashes if RESEND_API_KEY is unset.
let resend = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const FROM = process.env.EMAIL_FROM || "BuildPath <onboarding@resend.dev>";

const sendWelcomeEmail = async ({ to, firstName, githubHandle }) => {
  const client = getResend();
  if (!client || !to) {
    console.warn("[email] Skipping welcome email (missing RESEND_API_KEY or recipient)");
    return;
  }

  const name = firstName || (githubHandle ? `@${githubHandle}` : "Builder");

  try {
    const { data, error } = await client.emails.send({
      from: FROM,
      to,
      subject: "Welcome to BuildPath 🚀",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;padding:32px;color:#fff;">
          <div style="max-width:480px;margin:auto;background:#111;border:1px solid #222;border-radius:16px;padding:32px;">
            <div style="font-size:28px;font-weight:800;margin-bottom:8px;">Build<span style="color:#0057ff;">Path</span></div>
            <h2 style="margin:16px 0 8px;font-size:20px;">Welcome aboard, ${name}! 👋</h2>
            <p style="color:#aaa;line-height:1.6;margin:0 0 16px;">
              You're now part of a community engineering <strong style="color:#fff;">real-world projects</strong>,
              not tutorials. Go explore real problems, pick a match, and start building something portfolio-worthy.
            </p>
            <p style="color:#666;font-size:13px;margin:0;">
              Your feed is ready. Find problems → match your stack → build &amp; share your progress.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.warn("[email] Resend error:", error.message || error);
    } else {
      console.log("[email] Welcome email sent to", to, data?.id || "");
    }
  } catch (err) {
    // Never block signup because of an email failure.
    console.warn("[email] Failed to send welcome email:", err.message);
  }
};

module.exports = { sendWelcomeEmail };