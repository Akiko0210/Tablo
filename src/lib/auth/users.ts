// Mock staff accounts. In-repo so the demo needs no database or auth provider.
// Passwords are plain text here for demo convenience only — a real deployment
// would store salted hashes and look users up from a database.

export interface StaffUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  password: string;
  restaurantName: string;
  role: string;
}

export const STAFF_USERS: StaffUser[] = [
  {
    id: "u_sofia",
    name: "Sofia Duarte",
    initials: "SD",
    email: "sofia@bella.com",
    password: "tablo123",
    restaurantName: "Bella Trattoria",
    role: "Owner",
  },
];

/** Look up a user by id; returns the user (minus password) or null. */
export function findUserById(id: string): Omit<StaffUser, "password"> | null {
  const user = STAFF_USERS.find((u) => u.id === id);
  if (!user) return null;
  const { password: _pw, ...safe } = user;
  void _pw;
  return safe;
}

/** Verify credentials; returns the user (minus password) or null. */
export function verifyCredentials(
  email: string,
  password: string,
): Omit<StaffUser, "password"> | null {
  const user = STAFF_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user || user.password !== password) return null;
  const { password: _pw, ...safe } = user;
  void _pw;
  return safe;
}
