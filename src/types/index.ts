import { ValidationError } from "express-validator";
import { dayOfWeek, roleEnum } from "../schemas/schemas";

export type RoleEnum = (typeof roleEnum.enumValues)[number];
export type DayOfWeekEnum = (typeof dayOfWeek.enumValues)[number];

export interface HttpError extends Error {
  httpStatusCode?: number;
  errorStack?: ValidationError[];
  isValidationErr?: boolean;
}

export type ClassroomSession = {
  dayOfWeek: DayOfWeekEnum;
  startTime: string;
  endTime: string;
};

// jwt decoded payload
export type DecodedPayload = {
  id: number;
  role: RoleEnum;
  name: string;
};

// body types
export type RegisterBody = {
  email: string;
  password: string;
  role: RoleEnum;
  name: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type CreateClassroomBody = {
  name: string;
  daysOfWeek: ClassroomSession[];
  teacherId: number;
};

export type CreateTeacherBody = {
  name: string;
  email: string;
  password: string;
  classId?: number;
};

export type CreateStudentBody = {
  name: string;
  email: string;
  password: string;
};
