import express from "express";
import authRoute from "./routes/auth.route.js";
import { partNotFound } from "./middlewares/pathNotFound.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/test", (req, res) => {
  res.status(200).json({ message: "Success" });
});

app.use("/auth", authRoute);

app.use(partNotFound);

app.use(errorHandler);

export default app;
