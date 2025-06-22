from fastapi import FastAPI
from google.cloud import texttospeech

app = FastAPI()
client = texttospeech.TextToSpeechClient()

@app.post("/pam-voice")
async def pam_voice(text: str, pitch: float = -2.0, rate: float = 0.9):
    # Build SSML-wrapped text if you want prosody tweaks:
    # ssml = f"<speak><prosody pitch=\"{pitch}st\" rate=\"{int(rate*100)}%\">{text}</prosody></speak>"
    # synthesis_input = texttospeech.SynthesisInput(ssml=ssml)
    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-AU",
        name="en-AU-Chirp3-HD-Gacrux"
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=rate,
        pitch=pitch
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    return {"audioContent": response.audio_content}
