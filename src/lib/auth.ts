import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fingerspot-secret-key-change-in-production"
);

const COOKIE_NAME = "fingerspot-auth";

export interface User {
  username: string;
  role: string;
}

// Default users - ganti sesuai kebutuhan atau tambahkan di .env
const USERS = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
  },
];

export async function login(
  username: string,
  password: string
): Promise<User | null> {
  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return null;

  const token = await new SignJWT({
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return { username: user.username, role: user.role };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return {
      username: payload.username as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
