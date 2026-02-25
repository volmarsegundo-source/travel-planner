import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const RegisterSchema = z
  .object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export const ForgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
