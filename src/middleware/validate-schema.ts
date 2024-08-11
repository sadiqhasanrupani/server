
import express from "express";
import { body, validationResult, ContextRunner } from 'express-validator';
import { HttpError } from "../types/index"
import { ResultWithContext } from "express-validator/lib/chain";

// can be reused by many routes
export const validate = (validations: ContextRunner[]) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // sequential processing, stops running validations chain if one fails.
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) {
        const error: HttpError = new Error("Validation Error");
        error.httpStatusCode = 422;
        error.errorStack = result.array() || [];
        error.isValidationErr = true;
        next(error);
      }
    }

    next();
  };
};
