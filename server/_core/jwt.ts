import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

const getSecret = () => {
  return new TextEncoder().encode(ENV.cookieSecret);
};

export type JwtPayload = {
  userId: number;
  email: string | null;
};

export async function signJwt(payload: JwtPayload): Promise<string> {
  const secret = getSecret();
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    
    return {
      userId: payload.userId as number,
      email: payload.email as string,
    };
  } catch (error) {
    console.warn("[JWT] Verification failed:", String(error));
    return null;
  }
}
