import { Router } from "express";
import { body } from "express-validator";

// middleware
import { isAuth } from "../middleware/is-auth";
import isMentor from "../middleware/is-mentor";
import { validate } from "../middleware/validate-schema";

// controller
import { createStudent } from "../controller/student.controller";

const router = Router();

router.post(
  "/create",
  [
    isAuth,
    isMentor,
    validate([
      body("name").notEmpty().withMessage("name is required"),
      body("email").notEmpty().isEmail().withMessage("email is required"),
      body("password").isLength({ min: 6 }).withMessage("password should be atleast 6 character or more then 6"),
    ]),
  ],
  createStudent,
);

const studentRoute = router;
export default studentRoute;
