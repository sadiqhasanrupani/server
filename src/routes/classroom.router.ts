import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate-schema";
import moment from "moment";

// middlewares
import { isAuth } from "../middleware/is-auth";
import isPrinciple from "../middleware/is-principle";

// controller
import { createClassroom, getClassrooms, getUnassignedClassrooms } from "../controller/classroom.controller";

// types
import { ClassroomSession } from "../types";

const router = Router();

router.post("/create", [
  isAuth,
  isPrinciple,
  validate([
    body("name").notEmpty().withMessage("Classroom name is required."),
    body("daysOfWeek")
      .notEmpty()
      .withMessage("Days of week are required.")
      .custom((value) => {
        const daysOfWeek = value as ClassroomSession[];

        for (const session of daysOfWeek) {
          const startTime = moment(session.startTime, "HH:mm", true);
          const endTime = moment(session.endTime, "HH:mm", true);

          if (!startTime.isValid()) {
            throw new Error(`Invalid start time format for ${session.dayOfWeek}. Expected format: HH:mm.`);
          }

          if (!endTime.isValid()) {
            throw new Error(`Invalid end time format for ${session.dayOfWeek}. Expected format: HH:mm.`);
          }

          if (startTime.isAfter(endTime)) {
            throw new Error(`Start time must be earlier than end time for ${session.dayOfWeek}.`);
          }
        }

        return true;
      }),
  ]),
  createClassroom,
]);

router.get("/get-all", [isAuth, isPrinciple], getClassrooms);
router.get("/get-all-unassigned", [isAuth, isPrinciple], getUnassignedClassrooms);

const classroomRoute = router;
export default classroomRoute;
