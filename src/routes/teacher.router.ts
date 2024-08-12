import { Router } from "express";
import { body } from "express-validator";

// middleware
import { isAuth } from "../middleware/is-auth";
import isPrinciple from "../middleware/is-principle";
import { validate } from "../middleware/validate-schema";

// controller
import {
  createTeacher,
  getAllTeachers,
  getTeacher,
  deleteTeacher,
  updateTeacher,
} from "../controller/teacher.controller";

const router = Router();

router.post(
  "/create",
  [
    isAuth,
    isPrinciple,
    validate([
      body("name").notEmpty().withMessage("name is required"),
      body("email").notEmpty().isEmail().withMessage("email is required"),
      body("password").isLength({ min: 6 }).withMessage("password should be atleast 6 character or more then 6"),
    ]),
  ],
  createTeacher,
);

router.get("/get-all", [isAuth, isPrinciple], getAllTeachers);
router.get("/get/:userId", [isAuth, isPrinciple], getTeacher);

router.put("/update/:userId", [isAuth, isPrinciple], updateTeacher);

router.delete("/delete/:userId", [isAuth, isPrinciple], deleteTeacher);

const teacherRoute = router;
export default teacherRoute;
