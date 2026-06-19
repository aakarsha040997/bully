import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateRoastBody, GenerateDailyReportBody, GenerateRoastResponse, GenerateDailyReportResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const systemPrompts: Record<number, string> = {
  1: "You are a supportive but honest accountability coach. When someone wastes time, give them a warm, funny nudge to get back on track. Keep it short and positive. Maximum 20 words. No profanity.",
  2: "You are a sarcastic accountability coach. Call people out for wasting time with sharp wit and dry humor. Short, punchy, and cutting but never mean. Maximum 20 words.",
  3: "You are a savage accountability coach. Roast lazy behavior mercilessly with brutal honesty and dark humor. Be funny, not hateful. Attack the behavior, not the person. Maximum 20 words.",
  4: "You are an absolutely unhinged accountability coach who goes completely off the rails. Be hilariously aggressive and over-the-top about lazy behavior. Mild profanity OK (ass, damn, hell). NEVER use slurs, hate speech, or attack identity. Attack procrastination and laziness only. Maximum 20 words.",
};

router.post("/roast", async (req, res) => {
  const body = GenerateRoastBody.parse(req.body);
  const { roastLevel, activityType, context } = body;

  const systemPrompt = systemPrompts[roastLevel] ?? systemPrompts[2];
  const userMessage = `User has been: ${activityType}. Context: ${context}. Generate a unique roast.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: 80, temperature: 1.1 },
  });

  const result = await model.generateContent(userMessage);
  const roast = result.response.text().trim() || "Get off your phone.";
  const data = GenerateRoastResponse.parse({ roast });
  res.json(data);
});

router.post("/daily-report", async (req, res) => {
  const body = GenerateDailyReportBody.parse(req.body);
  const { screenTime, topApp, gymMissed, waterGlasses, readingMinutes, shortsWatched, productivityScore } = body;

  const statsText = `Screen time: ${screenTime}, Most used app: ${topApp}, Gym: ${gymMissed ? "MISSED" : "done"}, Water: ${waterGlasses} glasses, Reading: ${readingMinutes} min, Shorts watched: ${shortsWatched}, Productivity score: ${productivityScore}/100.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: "You are a brutal but funny accountability coach giving a one-line daily verdict. Be savagely honest but never hateful. Maximum 15 words.",
    generationConfig: { maxOutputTokens: 60, temperature: 1.1 },
  });

  const result = await model.generateContent(`Today's stats: ${statsText} Give a verdict.`);
  const verdict = result.response.text().trim() || "Could be worse. Not by much though.";
  const data = GenerateDailyReportResponse.parse({ verdict });
  res.json(data);
});

export default router;
