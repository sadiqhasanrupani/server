import { Request, Response, NextFunction } from "express";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import moment from "moment";

// types
import { CreateClassroomBody } from "../types";

// utils
import { asyncHandler } from "../utils/async-handler";
import { errorNext } from "../utils/error-handler";

// db
import { db, pool } from "../config/db.config";
import { classroom_sessions, classroom_students, classrooms, users } from "../schemas/schemas";

import { AuthRequest } from "../middleware/is-auth";

export const createClassroom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  const body: CreateClassroomBody = authReq.body;
  const principleId = authReq.id;

  const classroomCreatedAt = moment(moment().format("YYYY-MM-DD HH:mm:ss.SSSSSS"), "YYYY-MM-DD HH:mm:ss.SSSSSS");

  // creating classroom
  const createClassrooms = await db.insert(classrooms).values({
    name: body.name,
    teacher_id: body.teacherId,
    principle_id: principleId,
    created_at: classroomCreatedAt.toDate(),
    updated_at: classroomCreatedAt.toDate(),
  });

  if (createClassrooms.rowCount === 0) {
    return errorNext({ httpStatusCode: 400, message: "unable to create a classroom", next });
  }

  const getClassrooms = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(eq(classrooms.created_at, classroomCreatedAt.toDate()));

  if (!getClassrooms[0]) {
    return errorNext({ httpStatusCode: 400, message: "unable to get the recent classroom.", next });
  }

  // creating classroom sessions
  const createClassroomSessions = await db.insert(classroom_sessions).values(
    body.daysOfWeek.map((day) => ({
      classroom_id: getClassrooms[0].id,
      day_of_week: day.dayOfWeek,
      start_time: day.startTime,
      end_time: day.endTime,
    })),
  );

  if (createClassroomSessions.rowCount === 0) {
    return errorNext({ httpStatusCode: 400, message: "unable to create a classroom sessions", next });
  }

  return res.status(200).json({
    message: "classroom created successfully.",
  });
});

export const getClassrooms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  const principleId = authReq.id;

  // get classrooms
  const getClassrooms = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      assignedTeacher: users.name,
      assignedTeacherId: users.id,
      days: classroom_sessions.day_of_week,
      startTime: classroom_sessions.start_time,
      endTime: classroom_sessions.end_time,
      students: count(classroom_students.student_id),
    })
    .from(classrooms)
    .leftJoin(users, eq(users.id, classrooms.teacher_id))
    .leftJoin(classroom_sessions, eq(classroom_sessions.classroom_id, classrooms.id))
    .leftJoin(classroom_students, eq(classroom_students.classroom_id, classrooms.id))
    .groupBy(
      classrooms.id,
      users.id,
      users.name,
      classroom_sessions.day_of_week,
      classroom_sessions.start_time,
      classroom_sessions.end_time,
    )
    .where(eq(classrooms.principle_id, principleId))
    .orderBy(desc(classrooms.created_at));

  type Day = {
    day: string | null;
    startTime: string | null;
    endTime: string | null;
  };

  type Classroom = {
    days: Day[];
  } & (typeof getClassrooms)[0];

  const groupedClassrooms: Classroom[] = getClassrooms.reduce((acc: Classroom[], current) => {
    // Find the classroom in the accumulator
    let classroom = acc.find(
      (c) => c.id === current.id && c.name === current.name && c.assignedTeacher === current.assignedTeacher,
    );

    if (!classroom) {
      // If not found, create a new entry
      classroom = {
        ...current,
        days: [] as any,
      };
      acc.push(classroom as Classroom);
    }

    // Add the day and time to the days array
    (classroom as Classroom).days.push({
      day: current.days,
      startTime: current.startTime,
      endTime: current.endTime,
    });

    return acc;
  }, []);

  return res.status(200).json({ message: "Successfuly got all of the classrooms.", classrooms: groupedClassrooms });
});

export const getUnassignedClassrooms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  const principleId = authReq.id;

  // get classrooms
  const getClassrooms = await db
    .select({ id: classrooms.id, name: classrooms.name })
    .from(classrooms)
    .where(and(eq(classrooms.principle_id, principleId), isNull(classrooms.teacher_id)))
    .orderBy(desc(classrooms.created_at));

  return res.status(200).json({ message: "Successfuly got all of the classrooms.", classrooms: getClassrooms });
});

export const deleteClasroom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const classId = parseInt(req.params.classId);

  // check class id is valid or not
  const validClassrooms = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classId), eq(classrooms.principle_id, authReq.id)));

  if (!validClassrooms[0]) {
    return errorNext({ httpStatusCode: 401, message: "unauthorized access", next });
  }

  return res.status(200).json({ message: "Classroom deleted successfully." });
});
