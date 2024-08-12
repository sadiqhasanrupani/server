import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

import { asyncHandler } from "../utils/async-handler";
import { errorNext } from "../utils/error-handler";
import { DecodedPayload, RoleEnum } from "../types";

export type AuthRequest = {
  id: number;
  role: RoleEnum;
  name: string;
} & Request;

export const isAuth = asyncHandler(async (req: AuthRequest | Request, res: Response, next: NextFunction) => {
  const authToken = req.get("Authorization") as string;
  const unauthorizedStatus = 401;

  if (!authToken) {
    return errorNext({ httpStatusCode: unauthorizedStatus, message: "not authorized.", next });
  }

  const token = authToken.split(" ")[1];

  if (token === "undefined" || !token)
    return errorNext({ httpStatusCode: unauthorizedStatus, message: "not authenticated", next });

  let decodeToken: DecodedPayload | JwtPayload | string;
  decodeToken = jwt.verify(token, process.env.SECRET_KEY as string);

  if (!decodeToken) {
    return errorNext({ httpStatusCode: unauthorizedStatus, message: "not authenticated", next });
  }

  const decodedToken = decodeToken as DecodedPayload;

  const authRequest = req as AuthRequest;
  authRequest.id = decodedToken.id;
  authRequest.role = decodedToken.role;
  authRequest.name = (decodeToken as DecodedPayload).name;

  next();
});
