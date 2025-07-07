export async function sendToPamChat(message: string): Promise<any> {
  const response = await fetch('/api/v1/pam/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!response.ok) {
    throw new Error(`PAM chat error: ${response.status}`);
  }
  return response.json();
}

export async function sendToPamVoice(audio: Blob): Promise<string | null> {
  const response = await fetch('/api/v1/pam/voice', {
    method: 'POST',
    headers: {
      'Content-Type': audio.type || 'application/octet-stream'
    },
    body: audio
  });

  if (!response.ok) {
    throw new Error(`PAM voice error: ${response.status}`);
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.startsWith('audio')) {
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    }

    const blob = new Blob(chunks, { type: contentType });
    const url = URL.createObjectURL(blob);
    const audioEl = new Audio(url);
    try {
      await audioEl.play();
    } catch (err) {
      console.error('Audio playback failed', err);
      URL.revokeObjectURL(url);
      return await response.text().catch(() => null);
    }
    audioEl.onended = () => {
      URL.revokeObjectURL(url);
    };
    return null;
  }

  return response.text();
}
