import { time, serial, pgTable, text, timestamp, PgEnum, pgEnum, integer, varchar, Check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["principle", "teacher", "student"]);

export const dayOfWeek = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thrusday",
  "friday",
  "saturday",
  "sunday",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  created_at: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const users_created_by = pgTable("users_created_by", {
  id: serial("id").primaryKey().notNull(),
  created_by: integer("created_by")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey().notNull(),
  teacher_id: integer("teacher_id").references(() => users.id, { onDelete: "cascade" }),
  principle_id: integer("principle_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  created_at: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const classroom_sessions = pgTable(
  "classroom_sessions",
  {
    id: serial("id").primaryKey(),
    classroom_id: integer("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    day_of_week: dayOfWeek("day_of_week").notNull(),
    start_time: time("start_time").notNull(),
    end_time: time("end_time").notNull(),
    created_at: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated_at: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    timeCheck: sql`check (${table.end_time} > ${table.start_time})`,
  }),
);

export const class_session_subjects = pgTable("class_session_subjects", {
  id: serial("id").primaryKey(),
  class_session_id: integer("class_session_id")
    .notNull()
    .references(() => classroom_sessions.id, { onDelete: "cascade", onUpdate: "cascade" }),
  classroom_id: integer("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
  subject_name: varchar("subject_name", { length: 100 }).notNull(),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  created_at: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const classroom_students = pgTable("classroom_students", {
  id: serial("id").primaryKey(),
  classroom_id: integer("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
  assigned_by: integer("assigned_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  student_id: integer("student_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
});

export const time_tables = pgTable(
  "time_tables",
  {
    id: serial("id").primaryKey(),
    classroom_id: integer("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    day_of_week: dayOfWeek("day_of_week").notNull(),
    start_time: time("start_time").notNull(),
    end_time: time("end_time").notNull(),
    created_at: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated_at: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    timeCheck: sql`check (${table.end_time} > ${table.start_time})`,
  }),
);
