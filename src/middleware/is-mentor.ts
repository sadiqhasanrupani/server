import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/async-handler";

import { AuthRequest } from "./is-auth";

import { db } from "../config/db.config";
import { users } from "../schemas/schemas";
import { and, eq, or } from "drizzle-orm";
import { HttpError } from "../types";

const isMentor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const mentorId = authReq.id;

  // check principle id is valid
  const mentors = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, mentorId), or(eq(users.role, "teacher"), eq(users.role, "principle"))));

  const mentor = mentors[0];

  if (!mentor) {
    const error: HttpError = new Error("un-authorized access");
    error.httpStatusCode = 401;
    throw error;
  }

  next();
});

export default isMentor;
