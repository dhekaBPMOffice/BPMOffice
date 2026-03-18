export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT =
  "Mínimo 8 caracteres, incluindo letra maiúscula, minúscula, número e caractere especial (!@#$%^&*...).";

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "A senha deve incluir pelo menos uma letra maiúscula." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "A senha deve incluir pelo menos uma letra minúscula." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "A senha deve incluir pelo menos um número." };
  }

  if (!/[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\~`]/.test(password)) {
    return {
      valid: false,
      error: "A senha deve incluir pelo menos um caractere especial (!@#$%^&*...).",
    };
  }

  return { valid: true };
}
