import { Request, Response, NextFunction } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

import { asyncHandler } from "../utils/async-handler";
import { CreateTeacherBody } from "../types";

import { db } from "../config/db.config";
import { classroom_students, classrooms, users, users_created_by } from "../schemas/schemas";
import { errorNext, errorValidator } from "../utils/error-handler";
import { TimestampFormatter } from "../utils/timestamp-formatter";
import { AuthRequest } from "../middleware/is-auth";

export const createTeacher = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const teacherBody: CreateTeacherBody = req.body;

  // check teacher's email id is already exists or not
  const existingTeachers = await db.select({ id: users.id }).from(users).where(eq(users.email, teacherBody.email));

  if (existingTeachers[0]) {
    return errorValidator({
      errorStack: [
        { msg: "email already exits", path: "email", type: "field", value: teacherBody.email, location: "body" },
      ],
      httpStatusCode: 422,
      next: next,
    });
  }

  const timestampFormatter = new TimestampFormatter();
  const currentDate = timestampFormatter.getCurrentDate().toDate();

  const password = await bcrypt.hash(teacherBody.password, 12);

  // adding teacher into users table
  const addTeachers = await db.insert(users).values({
    email: teacherBody.email,
    name: teacherBody.name,
    password: password,
    role: "teacher",
    created_at: currentDate,
    updated_at: currentDate,
  });

  if (addTeachers.rowCount === 0) {
    return errorNext({ httpStatusCode: 400, message: "Unable to create teacher", next });
  }

  // get current teacher
  const teachers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.created_at, currentDate), eq(users.role, "teacher")));

  if (!teachers[0]) {
    return errorNext({ httpStatusCode: 400, message: "Unable to get the teacher data", next });
  }

  // check classroom is already assign to a teacher
  const assignedClassrooms = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(eq(classrooms.teacher_id, teachers[0].id));

  if (assignedClassrooms[0]) {
    return res.status(200).json({});
  }

  // if classId is present then will assign that teacher to that class
  // first check that if class id present then check that class id is valid or not
  if (teacherBody.classId) {
    const getClassrooms = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.id, teacherBody.classId));

    if (!getClassrooms[0]) {
      return errorNext({ httpStatusCode: 401, message: "Unauthorized class id", next });
    }

    // assigning the classroom to that teacher
    const assignClassroom = await db
      .update(classrooms)
      .set({
        teacher_id: teachers[0].id,
        updated_at: currentDate,
      })
      .where(eq(classrooms.id, teacherBody.classId));

    if (assignClassroom.rowCount === 0) {
      return errorNext({
        httpStatusCode: 400,
        message: "Something went wrong will udpating the classroom credentials",
        next,
      });
    }

    // getting class room data according to the current date
    const getAssignClassrooms = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.updated_at, currentDate));

    if (!getAssignClassrooms[0]) {
      return errorNext({ httpStatusCode: 400, message: "unable to get the updated classroom detail", next });
    }

    // assign classroom and teacher to classroom_student
    const addClassroomStudent = await db.insert(classroom_students).values({
      assigned_by: teachers[0].id,
      classroom_id: getAssignClassrooms[0].id,
    });

    if (addClassroomStudent.rowCount === 0) {
      return errorNext({ httpStatusCode: 400, message: "unable to create new field inside classroom students", next });
    }

    return res.status(200).json({ message: "teacher has been added and assigned successfully." });
  } else {
    return res.status(200).json({ message: "teacher has been added successfully." });
  }
});

export const getAllTeachers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  const principleId = authReq.id;

  // getting all teacher details
  const getTeachers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      classroomName: classrooms.name,
      classroomId: classrooms.id,
      students: count(classroom_students.student_id),
    })
    .from(classrooms)
    .innerJoin(users, eq(classrooms.teacher_id, users.id))
    .innerJoin(classroom_students, eq(classroom_students.classroom_id, classrooms.id))
    .where(and(eq(users.role, "teacher"), eq(classrooms.principle_id, principleId)))
    .groupBy(users.id, classrooms.name, classrooms.id)
    .orderBy(desc(users.created_at));

  return res.status(200).json({ message: "teachers got successfully.", teacherDetails: getTeachers });
});
