import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { text } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are Lumo, a friendly AI travel guide for Mongolia. " +
          "Answer in the same language the user writes in (Mongolian or English). " +
          "Keep answers short, practical, and conversational — you are helping travelers on the go. " +
          "If asked about places, food, culture, transport, or safety, give confident, specific answers.",
      },
      { role: "user", content: text },
    ],
  });

  return Response.json({ reply: completion.choices[0]?.message.content ?? "" });
}
