import express from "express";

import authRoute from "./routes/auth.route.js";
// import profileRoute from "./routes/profile.route.js";
// import ownerApplicationRoute from "./routes/ownerApplication.route.js";
// import propertyRoute from "./routes/property.route.js";
// import roomRoute from "./routes/room.route.js";
// import communityRoute from "./routes/community.route.js";
// import joinRequestRoute from "./routes/joinRequest.route.js";
// import conversationRoute from "./routes/conversation.route.js";
// import rentalRoute from "./routes/rental.route.js";
// import adminRoute from "./routes/admin.route.js";

import { partNotFound } from "./middlewares/pathNotFound.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/test", (req, res) => {
  res.status(200).json({ message: "Success" });
});

app.use("/api/auth", authRoute);
// app.use("/api/profiles", profileRoute);
// app.use("/api/owner-applications", ownerApplicationRoute);
// app.use("/api/properties", propertyRoute);
// app.use("/api/rooms", roomRoute);
// app.use("/api/community-posts", communityRoute);
// app.use("/api/join-requests", joinRequestRoute);
// app.use("/api/conversations", conversationRoute);
// app.use("/api/rentals", rentalRoute);
// app.use("/api/admin", adminRoute);

app.use(partNotFound);

app.use(errorHandler);

export default app;
