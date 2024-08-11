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

        const timeMap: { [key: string]: string } = {};

        for (const session of daysOfWeek) {
          // Validate time format
          const startTime = moment(session.startTime, "HH:mm:ss", true);
          const endTime = moment(session.endTime, "HH:mm:ss", true);

          if (!startTime.isValid()) {
            throw new Error(`Invalid start time format for ${session.dayOfWeek}. Expected format: HH:mm:ss.`);
          }

          if (!endTime.isValid()) {
            throw new Error(`Invalid end time format for ${session.dayOfWeek}. Expected format: HH:mm:ss.`);
          }

          // Check that start time is less than end time
          if (startTime.isSameOrAfter(endTime)) {
            throw new Error(`Start time must be earlier than end time for ${session.dayOfWeek}.`);
          }

          const formattedStartTime = startTime.format("HH:mm:ss");
          const formattedEndTime = endTime.format("HH:mm:ss");
          const key = `${formattedStartTime}-${formattedEndTime}`;

          if (timeMap[key]) {
            throw new Error(`Start time and end time cannot be the same for ${session.dayOfWeek} and ${timeMap[key]}.`);
          } else {
            timeMap[key] = session.dayOfWeek;
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
