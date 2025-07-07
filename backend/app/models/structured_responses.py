from pydantic import BaseModel, validator

class StructuredResponse(BaseModel):
    answer_display: str
    answer_speech: str
    answer_ssml: str
    ui_actions: list | None = []
    memory_updates: dict | None = {}

    @validator("answer_speech")
    def max_70_words(cls, v):
        assert len(v.split()) <= 70, "Speech too long"
        return v
