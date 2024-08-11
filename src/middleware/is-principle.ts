import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/async-handler";

import { AuthRequest } from "./is-auth";

import { db } from "../config/db.config";
import { users } from "../schemas/schemas";
import { and, eq } from "drizzle-orm";
import { HttpError } from "../types";

const isPrinciple = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const principleId = authReq.id;

  // check principle id is valid
  const principles = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, principleId), eq(users.role, "principle")));

  const principle = principles[0];

  if (!principle) {
    const error: HttpError = new Error("un-authorized access");
    error.httpStatusCode = 401;
    throw error;
  }

  next();
});

export default isPrinciple;
