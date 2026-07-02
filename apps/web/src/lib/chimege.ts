// Chimege long speech-to-text: upload audio, poll for the Mongolian transcript.
// Mongolian-specialised and accurate — Twilio's own STT and Whisper can't do it.
export async function chimegeStt(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const token = process.env.CHIMEGE_STT_TOKEN;
  if (!token) throw new Error("CHIMEGE_STT_TOKEN not set");

  const upload = await fetch("https://api.chimege.com/v1.2/stt-long", {
    method: "POST",
    headers: { Token: token, "Content-Type": mimeType },
    body: audioBuffer,
  });

  const uploadText = await upload.text();
  if (!upload.ok || !uploadText.startsWith("{")) {
    throw new Error(`Chimege STT upload failed: ${uploadText}`);
  }

  const { uuid } = JSON.parse(uploadText);

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch("https://api.chimege.com/v1.2/stt-long-transcript", {
      headers: { Token: token, UUID: uuid },
    });
    const result = await poll.json();
    if (result.done) return result.transcription ?? "";
  }
  return "";
}
