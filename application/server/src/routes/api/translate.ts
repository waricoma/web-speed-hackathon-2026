import { Router } from "express";
import httpErrors from "http-errors";

export const translateRouter = Router();

translateRouter.post("/translate", async (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string") {
    throw new httpErrors.BadRequest("text is required");
  }

  return res.status(200).type("application/json").send({ translatedText: text });
});
