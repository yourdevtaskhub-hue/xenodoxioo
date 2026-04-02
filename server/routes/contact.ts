import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { sendContactFormEmail } from "../services/email.service";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(1).max(10000),
});

const router = Router();

router.post("/", validate(contactSchema), async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body as z.infer<typeof contactSchema>;
    const result = await sendContactFormEmail({
      name,
      email,
      phone: phone || undefined,
      message,
    });
    if (!result.ok) {
      const status =
        result.error === "Email service not configured"
          ? 503
          : result.error === "Failed to send message"
            ? 502
            : 400;
      return res.status(status).json({ success: false, error: result.error || "Failed to send" });
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
