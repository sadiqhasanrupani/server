import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";

import { asyncHandler } from "../utils/async-handler";
import { CreateStudentBody } from "../types";

import { db } from "../config/db.config";
import { users } from "../schemas/schemas";
import { errorNext, errorValidator } from "../utils/error-handler";
import { TimestampFormatter } from "../utils/timestamp-formatter";

export const createStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const studentBody: CreateStudentBody = req.body;

  // check student's email id is already exists or not
  const existingStudents = await db.select({ id: users.id }).from(users).where(eq(users.email, studentBody.email));

  if (existingStudents[0]) {
    return errorValidator({
      errorStack: [
        { msg: "email already exits", path: "email", type: "field", value: studentBody.email, location: "body" },
      ],
      httpStatusCode: 422,
      next: next,
    });
  }

  const timestampFormatter = new TimestampFormatter();
  const currentDate = timestampFormatter.getCurrentDate().toDate();

  // adding teacher into users table
  const addStudents = await db.insert(users).values({
    email: studentBody.email,
    name: studentBody.name,
    password: studentBody.password,
    role: "student",
    created_at: currentDate,
    updated_at: currentDate,
  });

  if (addStudents.rowCount === 0) {
    return errorNext({ httpStatusCode: 400, message: "Unable to add student", next });
  }

  return res.status(200).json({ message: "student has been added successfully." });
});
