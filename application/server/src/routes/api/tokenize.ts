import { Router } from "express";
import kuromoji, { type Tokenizer, type IpadicFeatures } from "kuromoji";
import path from "path";

export const tokenizeRouter = Router();

const STOP_POS = new Set(["助詞", "助動詞", "記号"]);

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: path.resolve("node_modules/kuromoji/dict") }).build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

function extractTokens(tokens: IpadicFeatures[]): string[] {
  return tokens
    .filter((t) => t.surface_form !== "" && t.pos !== "" && !STOP_POS.has(t.pos))
    .map((t) => t.surface_form.toLowerCase());
}

async function filterSuggestionsBM25(
  tokenizer: Tokenizer<IpadicFeatures>,
  candidates: string[],
  queryTokens: string[],
): Promise<string[]> {
  if (queryTokens.length === 0) return [];

  const { BM25 } = await import("bayesian-bm25");
  const bm25 = new BM25({ k1: 1.2, b: 0.75 });

  const tokenizedCandidates = candidates.map((c) => extractTokens(tokenizer.tokenize(c)));
  bm25.index(tokenizedCandidates);

  const scores = bm25.getScores(queryTokens) as number[];
  const results = candidates.map((text, i) => ({ text, score: scores[i]! }));

  return results
    .filter((s) => s.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(-10)
    .map((s) => s.text);
}

tokenizeRouter.post("/tokenize", async (req, res) => {
  const { text, candidates } = req.body as { text?: string; candidates?: string[] };

  if (typeof text !== "string" || text.trim() === "") {
    return res.status(200).type("application/json").send({ tokens: [], filteredSuggestions: [] });
  }

  const tokenizer = await getTokenizer();
  const rawTokens = tokenizer.tokenize(text);
  const tokens = extractTokens(rawTokens);

  if (Array.isArray(candidates) && candidates.length > 0) {
    const filteredSuggestions = await filterSuggestionsBM25(tokenizer, candidates, tokens);
    return res.status(200).type("application/json").send({ tokens, filteredSuggestions });
  }

  return res.status(200).type("application/json").send({ tokens });
});
