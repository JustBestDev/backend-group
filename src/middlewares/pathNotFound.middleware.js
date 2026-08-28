export const partNotFound = (req, res) => {
  res.status(404).json({
    message: `Path ${req.originalUrl} not found`,
  });
};