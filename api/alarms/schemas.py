from ninja import Schema
import uuid

class GroupOut(Schema):
    id: uuid.UUID
    name: str

class GroupCreate(Schema):
    name: str
