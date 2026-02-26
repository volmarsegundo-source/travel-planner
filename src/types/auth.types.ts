export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  emailVerified?: Date | null;
}

export interface Session {
  user: AuthUser;
  expires: string;
}
