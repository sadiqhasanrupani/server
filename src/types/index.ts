import { ValidationError } from "express-validator";
import { roleEnum } from "../schemas/schemas";
import { JwtPayload } from "jsonwebtoken";

export type RoleEnum = (typeof roleEnum.enumValues)[number];

export interface HttpError extends Error {
  httpStatusCode?: number;
  errorStack?: ValidationError[];
  isValidationErr?: boolean;
}

// jwt decoded payload
export type DecodedPayload = {
  id: number;
  role: RoleEnum;
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
