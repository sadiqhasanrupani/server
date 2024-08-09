import express from "express";
import morgan from "morgan";
import cors from "cors";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = parseInt((process.env.PORT as string) || "8080");

app.use(express.json());
app.use(
  cors({
    origin: process.env.ORIGIN,
  }),
);

app.listen(port, () => {
  console.log(`[server]: server is listening on http://localhost:${port}`);
});
