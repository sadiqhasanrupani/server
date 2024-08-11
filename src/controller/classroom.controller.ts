import { Request, Response, NextFunction } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import moment from "moment";

// types
import { CreateClassroomBody } from "../types";

// utils
import { asyncHandler } from "../utils/async-handler";
import { errorNext } from "../utils/error-handler";

// db
import { db } from "../config/db.config";
import { classroom_sessions, classrooms } from "../schemas/schemas";

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

  return res.status(200).json({ message: "classroom created successfully." });
});

export const getClassrooms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  const principleId = authReq.id;

  // get classrooms
  const getClassrooms = await db
    .select({ id: classrooms.id, name: classrooms.name })
    .from(classrooms)
    .where(eq(classrooms.principle_id, principleId))
    .orderBy(desc(classrooms.created_at));

  return res.status(200).json({ message: "Successfuly got all of the classrooms.", classrooms: getClassrooms });
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
