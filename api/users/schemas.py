from ninja import Schema
import uuid


class UserOut(Schema):
    id: uuid.UUID
    username: str
    display_name: str
    email: str
    password: str


class UserCreate(Schema):
    username: str
    display_name: str
    email: str
    password: str


class UserLogin(Schema):
    username: str
    password: str


class TokenOut(Schema):
    token: str
