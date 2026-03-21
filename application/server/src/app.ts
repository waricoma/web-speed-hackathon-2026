import bodyParser from "body-parser";
import compression from "compression";
import Express from "express";

import { apiRouter } from "@web-speed-hackathon-2026/server/src/routes/api";
import { imageOptimizeRouter } from "@web-speed-hackathon-2026/server/src/routes/image_optimize";
import { ssrMiddleware } from "@web-speed-hackathon-2026/server/src/ssr/ssr-middleware";
import { staticRouter } from "@web-speed-hackathon-2026/server/src/routes/static";
import { sessionMiddleware } from "@web-speed-hackathon-2026/server/src/session";

export const app = Express();

app.set("trust proxy", true);

app.use(sessionMiddleware);
app.use(bodyParser.json());

// Debug: log POST requests to upload APIs
app.use("/api/v1", (req, res, next) => {
  if (req.method === "POST") {
    const t = Date.now();
    const url = req.url;
    console.log(`[API] → POST ${url} ${new Date().toISOString()}`);
    const origSend = res.send.bind(res);
    res.send = (body: any) => {
      console.log(`[API] ← POST ${url} ${res.statusCode} ${Date.now() - t}ms`);
      return origSend(body);
    };
  }
  next();
});

// Compression only for API responses (static/SSR are pre-compressed)
app.use("/api/v1", compression({ level: 1 }), apiRouter);
app.use(imageOptimizeRouter);
app.use(ssrMiddleware);
app.use(staticRouter);
