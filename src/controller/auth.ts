import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// utils
import { asyncHandler } from "../utils/async-handler";
import { errorNext, errorValidator } from "../utils/error-handler";

// db
import { db } from "../config/db.config";

// schemas
import { users } from "../schemas/schemas";

// types
import { HttpError, LoginBody, RegisterBody } from "../types";

export const registerHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const registerBody: RegisterBody = req.body;

  // Check if email already exists
  const user = await db.select({ id: users.id }).from(users).where(eq(users.email, registerBody.email));
  if (user[0]) {
    errorValidator({
      errorStack: [
        { msg: "email already exits", path: "email", type: "field", value: registerBody.email, location: "body" },
      ],
      httpStatusCode: 422,
      next: next,
    });
  }

  const password = await bcrypt.hash(registerBody.password, 12);

  // Register the user
  const registerUser = await db.insert(users).values({
    email: registerBody.email,
    password: password,
    role: registerBody.role,
    name: registerBody.name,
  });

  if (registerUser.rowCount === 0 || !registerUser) {
    const error: HttpError = new Error("Unable to register the user.");
    error.httpStatusCode = 400;
    return next(error);
  }

  const userDetails = await db.select({ id: users.id }).from(users).where(eq(users.email, registerBody.email));

  if (!userDetails[0]) {
    return errorNext({ httpStatusCode: 400, message: "Unable to get the recent registered user", next });
  }

  // generating tokens
  const token = jwt.sign(
    {
      id: userDetails[0].id,
      role: registerBody.role,
    },
    process.env.SECRET_KEY as string,
    {
      expiresIn: "24h",
    },
  );

  return res.status(200).json({ message: "Registration done successfully.", token });
});

export const loginHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const loginBody: LoginBody = req.body;

  // check if email already exists
  const userDetails = await db
    .select({ id: users.id, password: users.password, role: users.role })
    .from(users)
    .where(eq(users.email, loginBody.email));

  if (!userDetails[0]) {
    errorValidator({
      errorStack: [{ msg: "email is invalid", path: "email", type: "field", value: loginBody.email, location: "body" }],
      httpStatusCode: 422,
      next: next,
    });
  }

  // after that comparing the password with fetch user detail
  const isPasswordMatch = await bcrypt.compare(loginBody.password, userDetails[0].password);

  if (!isPasswordMatch) {
    return errorValidator({
      errorStack: [
        { msg: "password is invalid.", path: "password", type: "field", value: loginBody.password, location: "body" },
      ],
      httpStatusCode: 422,
      next: next,
    });
  }

  // generating tokens
  const token = jwt.sign(
    {
      id: userDetails[0].id,
      role: userDetails[0].role,
    },
    process.env.SECRET_KEY as string,
    {
      expiresIn: "24h",
    },
  );

  return res.status(200).json({ message: "login done successfully.", token: token });
});
