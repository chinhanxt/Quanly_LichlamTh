export interface User {
  username: string;
  password: string;
  displayName: string;
  createdAt?: string;
}

export interface AuthSessionUser {
  username: string;
  displayName: string;
}
