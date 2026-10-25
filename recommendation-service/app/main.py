from typing import Annotated, Literal
from datetime import datetime, timezone
from uuid import UUID

from fastapi import FastAPI
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class PopularEventCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    eventId: UUID
    startsAt: AwareDatetime | None = None
    ticketsSold: Annotated[int, Field(ge=0, le=10_000_000)]


class PopularEventsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: Annotated[list[PopularEventCandidate], Field(max_length=500)]
    limit: Annotated[int, Field(ge=1, le=10)] = 5


class RankedPopularEvent(BaseModel):
    eventId: UUID
    rank: int
    reasonCode: Literal["POPULAR_BY_TICKET_SALES"] = "POPULAR_BY_TICKET_SALES"


class PopularEventsResponse(BaseModel):
    items: list[RankedPopularEvent]


app = FastAPI(title="Event Recommendation Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recommendations/popular-events", response_model=PopularEventsResponse)
def popular_events(request: PopularEventsRequest) -> PopularEventsResponse:
    ranked = sorted(
        request.events,
        key=lambda event: (
            -event.ticketsSold,
            event.startsAt is None,
            event.startsAt or datetime.max.replace(tzinfo=timezone.utc),
            str(event.eventId),
        ),
    )[: request.limit]

    return PopularEventsResponse(
        items=[
            RankedPopularEvent(eventId=event.eventId, rank=index, reasonCode="POPULAR_BY_TICKET_SALES")
            for index, event in enumerate(ranked, start=1)
        ]
    )
