import z from "zod";

export const errorHandler = (err, req, res, next) => {
  console.error("err", err);

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      status: "validation error",
      message: z.flattenError(err).fieldErrors,
    });
  }

  const status = err.status || 500;

  return res.status(status).json({
    status: "Error",
    message: status >= 500 ? "Internal Server Error" : err.message,
  });
};
