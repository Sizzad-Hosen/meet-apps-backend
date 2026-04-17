import jwt, { Secret, JwtPayload, SignOptions } from "jsonwebtoken";

type TokenPayload = Record<string, unknown>;

const isValidJwtExpiresIn = (value: string | number): boolean => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }
  return /^\d+\s*(s|m|h|d)$/i.test(value) || /^\d+$/.test(value);
};

export const generateToken = <T extends TokenPayload>(payload: T, secret: string, expiresIn: string | number) => {
  if (typeof secret !== "string" || secret.trim() === "") {
    throw new Error("Invalid JWT secret: secret must be a non-empty string");
  }
  if (!isValidJwtExpiresIn(expiresIn)) {
    throw new Error("Invalid JWT expiresIn: use a positive number or format like 30s, 5m, 2h, 7d");
  }

  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret.trim(), options);

};

interface IJwtPayload extends JwtPayload {
  email: string;
  role: string;
}
export const verifyToken = async (token: string, secret: Secret): Promise<IJwtPayload> => {

    const decoded = jwt.verify(token, secret) as IJwtPayload;

    return decoded;
  

};
