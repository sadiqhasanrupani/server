import { Router } from "express";
import { body } from "express-validator";

// middlewares
import { validate } from "../middleware/validate-schema";

// controller
import { loginHandler, registerHandler } from "../controller/auth";
import { RoleEnum } from "../types";

const router = Router();

router.post(
  "/register",
  validate([
    body("email").notEmpty().isEmail(),
    body("name").notEmpty(),
    body("role")
      .notEmpty()
      .withMessage("role is not valid")
      .custom((value: RoleEnum) => {
        if (value !== "principle" && value !== "student" && value !== "teacher") {
          throw new Error("role value is not valid.");
        }
        return true;
      }),
    body("password")
      .notEmpty()
      .withMessage("password is empty")
      .isLength({ min: 6 })
      .withMessage("password should contain at-least 6 characters"),
  ]),
  registerHandler,
);

router.post(
  "/login",
  validate([
    body("email").notEmpty().isEmail().withMessage("email is invalid"),
    body("password")
      .notEmpty()
      .withMessage("password is empty")
      .isLength({ min: 6 })
      .withMessage("password should contain at-least 6 characters"),
  ]),
  loginHandler,
);

const authRoute = router;
export default authRoute;
