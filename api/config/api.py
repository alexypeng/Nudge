from ninja import NinjaAPI
from alarms.api import router as alarms_router
from users.api import router as users_router

api = NinjaAPI()


@api.get("/hello")
def hello(request):
    return {"message": "Hello, RingSync!"}


api.add_router("/alarms/", alarms_router)
api.add_router("/users/", users_router)
