import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/async-handler";

export const verifyTokenHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json({ message: "token is verified" });
});
