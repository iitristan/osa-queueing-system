export interface User {
  id: string;
  name: string | null;
  email: string;
  password: string;
  emailVerified: string | null; // ISO string
  image: string | null;
  online: boolean;
  prefix: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Account {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  online: boolean;
  prefix: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Session {
  id: string;
  userId: string;
  expires: string; // ISO string
  sessionToken: string;
  accessToken: string | null;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: string; // ISO string
}

export interface Authenticator {
  credentialID: string;
  userId: string;
  providerAccountId: string;
  credentialPublicKey: string;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string | null;
} 