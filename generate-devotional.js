/**
 * Warriors of Christ - Daily Devotional Generator
 * Mirrors the OurNightSky_Devotionals workflow.
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import Groq from "groq-sdk";
import fetch from "node-fetch";

const DATE = new Date().toISOString().split("T")[0];
const OUTPUT_DIR = "./output";
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${DATE}.json`);

const PROVIDERS = [
  { name: "groq", client: new Groq({ apiKey: process.env.GROQ_API_KEY }) },
  { name: "openai", client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) },
  {
    name: "deepseek",
    client: {
      chat: {
        completions: {
          create: async (opts) => {
            const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(opts),
            });
            const data = await res.json();
            return { choices: [{ message: { content: data.choices[0].message.content } }] };
          },
        },
      },
    },
  },
];

const PROMPT = `
You are writing a daily Christian devotional for a men's ministry called "Warriors of Christ".

Each devotional should:
- Be titled (e.g., “Rise and Battle the Day”)
- Include a relevant Bible verse (ESV)
- Contain a short reflection (120–200 words)
- End with a simple 1–2 line workout challenge or encouragement (e.g., “Do 25 pushups while thanking God for strength.”)
- Be motivating, practical, and biblically sound.
- Speak to men seeking to grow in strength, faith, and discipline.

Format response in Markdown like this:

# [Title]
## Scripture
"[Verse]" – [Book Chapter:Verse]
## Reflection
[Devotional text]
## Daily Challenge
[Challenge text]
`;

async function generateDevotional() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  for (const provider of PROVIDERS) {
    try {
      console.log(`⚙️ Generating devotional with ${provider.name}...`);
      const completion = await provider.client.chat.completions.create({
        model: provider.name === "groq" ? "llama-3.1-8b-instant" :
               provider.name === "deepseek" ? "deepseek-chat" :
               "gpt-4o-mini",
        messages: [{ role: "system", content: PROMPT }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0].message.content;

      const devotional = {
        app: "Warriors of Christ",
        date: DATE,
        provider: provider.name,
        model: provider.name === "groq" ? "llama-3.1-8b-instant" :
               provider.name === "deepseek" ? "deepseek-chat" :
               "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.7,
        words: content.split(/\s+/).length,
        content_markdown: content,
      };

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(devotional, null, 2));
      console.log(`✅ Success with ${provider.name}! Saved to ${OUTPUT_FILE}`);
      return;
    } catch (err) {
      console.error(`❌ ${provider.name} failed: ${err.message}`);
    }
  }

  console.error("💥 All providers failed. No devotional generated today.");
  process.exit(1);
}

generateDevotional();
