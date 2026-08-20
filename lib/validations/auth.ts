import { z } from "zod";

// `email` here is really "username or email" — see LoginForm's "Username /
// Email" label and signInWithPassword, which resolves a non-email value to
// its account email server-side (email_for_username) before signing in. Kept
// loose (just non-empty) rather than a strict email/username union so
// whichever the visitor typed passes validation the same way; the actual
// resolution happens server-side.
export const loginSchema = z.object({
  email: z.string().trim().min(3, "Enter your username or email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Too short").max(50, "Too long"),
    username: z
      .string()
      .trim()
      .min(3, "Too short")
      .max(24, "Too long")
      .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const magicLinkSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
