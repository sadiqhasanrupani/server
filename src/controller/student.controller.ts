import { Request, Response, NextFunction } from "express";
import { and, desc, eq, or } from "drizzle-orm";

import { asyncHandler } from "../utils/async-handler";
import { CreateStudentBody } from "../types";

import { db } from "../config/db.config";
import { classroom_students, users, users_created_by } from "../schemas/schemas";
import { errorNext, errorValidator } from "../utils/error-handler";
import { TimestampFormatter } from "../utils/timestamp-formatter";
import { AuthRequest } from "../middleware/is-auth";

export const createStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const studentBody: CreateStudentBody = req.body;
  const mentorId = (req as AuthRequest).id;

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

  // get current student
  const students = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.created_at, currentDate), eq(users.role, "student")));

  if (!students[0]) {
    return errorNext({ httpStatusCode: 400, message: "Unable to get the teacher data", next });
  }

  // insert users_created_by
  const insertUserCreatedBy = await db.insert(users_created_by).values({
    user_id: students[0].id,
    created_by: mentorId,
  });

  if (!insertUserCreatedBy) {
    return errorNext({ httpStatusCode: 400, message: "Unable to create user created by", next });
  }

  if (!students[0]) {
    return errorNext({ httpStatusCode: 400, message: "Unable to create user created at table", next });
  }

  return res.status(200).json({ message: "student has been added successfully." });
});

export const getUsersHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const mentorId = (req as AuthRequest).id;

  // getting all those users which is created by user and show all the data which was created by
  const getOwners = await db
    .select({ createdBy: users_created_by.created_by })
    .from(users_created_by)
    .where(eq(users_created_by.created_by, mentorId));

  const getOwnerDetail = getOwners[0];

  if (!getOwnerDetail) {
    return errorNext({ httpStatusCode: 400, message: "unable to get the owner detail", next });
  }

  const getUsers = await db
    .select({ name: users.name, email: users.email, id: users.id })
    .from(users_created_by)
    .innerJoin(users, eq(users.id, users_created_by.user_id))
    .where(
      and(
        eq(users.role, "student"),
        or(
          eq(users_created_by.created_by, getOwnerDetail.createdBy as number),
          eq(users_created_by.created_by, mentorId),
        ),
      ),
    )
    .orderBy(desc(users.created_at));

  return res.status(200).json({ message: "Got the user detail", users: getUsers });
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const studentId = parseInt(req.params.userId);

  // validating student id
  const validStudents = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  const validStudent = validStudents[0];

  if (!validStudent) {
    return errorNext({ httpStatusCode: 401, message: "un-authorized accesss", next });
  }

  return res.status(200).json({ message: "student details got successfully.", student: validStudent });
});

export const updateStudentHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const studentBody: CreateStudentBody = req.body;
  const studentId = parseInt(req.params.userId);

  const validStudents = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  const validStudent = validStudents[0];

  if (!validStudent) {
    return errorNext({ httpStatusCode: 401, message: "un-authorized accesss", next });
  }

  const timeStamp = new TimestampFormatter();
  const currentTimeStamp = timeStamp.getCurrentDate().toDate();

  // updating the student details
  const updateStudent = await db
    .update(users)
    .set({
      email: studentBody.email,
      name: studentBody.name,
      password: studentBody.password,
      updated_at: currentTimeStamp,
    })
    .where(eq(users.id, studentId));

  if (updateStudent.rowCount === 0) {
    return errorNext({ httpStatusCode: 400, message: "unable to udpate student detail", next });
  }

  return res.status(200).json({ message: "Student Detail updated successfully." });
});
export const deleteStudentHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const studentId = parseInt(req.params.userId);

  const validStudents = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));

  const validStudent = validStudents[0];

  if (!validStudent) {
    return errorNext({ httpStatusCode: 401, message: "un-authorized accesss", next });
  }

  // removing from foreign contraints
  await db.delete(classroom_students).where(eq(classroom_students.student_id, studentId));
  await db.delete(users_created_by).where(eq(users_created_by.user_id, studentId));

  // deleting the actual user
  await db.delete(users).where(eq(users.id, studentId));

  return res.status(200).json({ message: "student has been removed successfully." });
});
