import { Request, Response, NextFunction } from "express";
import { and, count, desc, eq, isNotNull, not, notInArray } from "drizzle-orm";
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
  const principleId = (req as AuthRequest).id;

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

  // insert users_created_by
  const insertUserCreatedBy = await db.insert(users_created_by).values({
    user_id: teachers[0].id,
    created_by: principleId,
  });

  if (!teachers[0]) {
    return errorNext({ httpStatusCode: 400, message: "Unable to create user created at table", next });
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
  // const getTeachers = await db
  //   .select({
  //     id: users.id,
  //     name: users.name,
  //     email: users.email,
  //     classroomName: classrooms.name,
  //     classroomId: classrooms.id,
  //     students: count(classroom_students.student_id),
  //   })
  //   .from(classrooms)
  //   .leftJoin(users, eq(classrooms.teacher_id, users.id))
  //   .innerJoin(classroom_students, eq(classroom_students.classroom_id, classrooms.id))
  //   .where(and(eq(users.role, "teacher"), eq(classrooms.principle_id, principleId)))
  //   .groupBy(users.id, classrooms.name, classrooms.id)
  //   .orderBy(desc(users.created_at));

  const getTeachers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users_created_by)
    .innerJoin(users, eq(users.id, users_created_by.user_id))
    .where(and(eq(users.role, "teacher"), eq(users_created_by.created_by, principleId)))
    .orderBy(desc(users.created_at));

  return res.status(200).json({ message: "teachers got successfully.", teacherDetails: getTeachers });
});

export const getTeacher = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const teacherId = parseInt(req.params.userId || "");

  // get teacher detail
  const teacherDetails = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.id, teacherId), eq(users.role, "teacher")));

  if (!teacherDetails[0]) {
    return errorNext({ httpStatusCode: 401, message: "un-authorized access", next });
  }

  return res.status(200).json({ message: "teacher details got successfully.", teacherDetail: teacherDetails[0] });
});

export const updateTeacher = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const teacherId = parseInt(req.params.userId || "");

  const teacherBody: CreateTeacherBody = req.body;

  // check if the id is valid
  const validTeacher = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, teacherId), eq(users.role, "teacher")));

  if (!validTeacher[0]) {
    return errorNext({ httpStatusCode: 401, message: "un-authorized access", next });
  }

  const timeStamp = new TimestampFormatter();
  const currentTimeStamp = timeStamp.getCurrentDate().toDate();

  const hashPassword = await bcrypt.hash(teacherBody.password, 12);

  // will update based on the body
  await db
    .update(users)
    .set({ email: teacherBody.email, name: teacherBody.name, password: hashPassword, updated_at: currentTimeStamp })
    .where(eq(users.id, teacherId));

  return res.status(200).json({ message: "teacher details updated successfully." });
});

export const deleteTeacher = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const teacherId = parseInt(req.params.userId || "");

  // check if the id is valid
  const validTeacher = await db.select({ id: users.id }).from(users).where(eq(users.id, teacherId));

  if (!validTeacher[0]) {
    return errorNext({ httpStatusCode: 401, message: "un-authorized access", next });
  }

  // first removing from classroom
  await db.update(classrooms).set({ teacher_id: null }).where(eq(classrooms.teacher_id, teacherId));
  await db.update(classroom_students).set({ assigned_by: null }).where(eq(classroom_students.assigned_by, teacherId));
  await db.update(users_created_by).set({ created_by: null }).where(eq(users_created_by.created_by, teacherId));

  // delete main key
  await db.delete(users).where(eq(users.id, teacherId));

  return res.status(200).json({ message: "Teacher removed successfully." });
});

export const getAllUnassigned = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  // fist getting all assigned teacher id
  const assignedTeachers = await db
    .select({ teacherId: classrooms.teacher_id })
    .from(classrooms)
    .where(and(isNotNull(classrooms.teacher_id), eq(classrooms.principle_id, authReq.id)));

  let unassignedTeachers: { id: number; name: string; email: string }[] = [];

  if (assignedTeachers.length > 0) {
    for (const assignedTeacher of assignedTeachers) {
      const unassignedTeachersSelect = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users_created_by)
        .innerJoin(users, eq(users.id, users_created_by.user_id))
        .where(
          and(
            eq(users_created_by.created_by, authReq.id),
            eq(users.role, "teacher"),
            not(eq(users.id, assignedTeacher.teacherId as number)),
          ),
        )
        .orderBy(desc(users.created_at));

      unassignedTeachers.push(unassignedTeachersSelect[0]);
    }
  } else {
    const getTeachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users_created_by)
      .innerJoin(users, eq(users.id, users_created_by.user_id))
      .where(and(eq(users.role, "teacher"), eq(users_created_by.created_by, authReq.id)))
      .orderBy(desc(users.created_at));

    unassignedTeachers = getTeachers;
  }

  return res
    .status(200)
    .json({ message: "got all of the unassigned teachers", unassignedTeachers: unassignedTeachers });
});
