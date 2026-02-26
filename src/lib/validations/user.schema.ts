import { z } from "zod";

export const UserSignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  name: z.string().min(1, "Name is required").max(100).optional(),
});

export const UserSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UserSignUpInput = z.infer<typeof UserSignUpSchema>;
export type UserSignInInput = z.infer<typeof UserSignInSchema>;
