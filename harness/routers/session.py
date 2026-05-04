import asyncio
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from dependencies import UserContext, get_current_user
from models.requests import MessageRequest, StartSessionRequest
from models.responses import (
    ResumeSessionResponse,
    SessionEndResponse,
    SessionStartResponse,
    SessionStatusResponse,
)
from services.session_manager import session_manager
from services.sse_streamer import serialize_event, stream_agent_response
from services.user_provisioner import load_user_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/session", tags=["session"])


@router.post("/start", response_model=SessionStartResponse)
async def start_session(
    body: StartSessionRequest,
    user: UserContext = Depends(get_current_user),
) -> SessionStartResponse:
    try:
        api_key = await asyncio.to_thread(load_user_api_key, user.user_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=403,
            detail="Chave API não configurada. Configure a chave antes de iniciar uma sessão.",
        )
    except (KeyError, ValueError, json.JSONDecodeError, OSError):
        raise HTTPException(
            status_code=403,
            detail="Chave API inválida. Reconfigure a chave API.",
        )

    try:
        info = await session_manager.create_agent(user.user_id, body.skill, api_key)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Competência inválida. Selecione uma competência disponível.",
        )
    except Exception:
        logger.exception("failed to create session for user=%s", user.user_id)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao criar sessão. Tente novamente.",
        )

    return SessionStartResponse(session_id=info.session_id, skill=info.skill)


@router.get("/status", response_model=SessionStatusResponse)
async def get_session_status(
    user: UserContext = Depends(get_current_user),
) -> SessionStatusResponse:
    info = session_manager.get_session_info(user.user_id)
    if info is None:
        return SessionStatusResponse(active=False, skill=None)
    return SessionStatusResponse(active=True, skill=info.skill)


@router.post("/resume", response_model=ResumeSessionResponse)
async def resume_session(
    user: UserContext = Depends(get_current_user),
) -> ResumeSessionResponse:
    info = session_manager.get_session_info(user.user_id)
    if info is None:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma sessão ativa encontrada para retomar.",
        )

    try:
        messages = await asyncio.to_thread(session_manager.resume_session, user.user_id)
    except Exception:
        logger.exception("failed to resume session for user=%s", user.user_id)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao retomar sessão. Tente novamente.",
        )

    return ResumeSessionResponse(messages=messages)


@router.post("/end", response_model=SessionEndResponse)
async def end_session(
    user: UserContext = Depends(get_current_user),
) -> SessionEndResponse:
    info = session_manager.get_session_info(user.user_id)
    if info is None:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma sessão ativa encontrada para terminar.",
        )

    try:
        await session_manager.end_session(user.user_id)
    except Exception:
        logger.exception("failed to end session for user=%s", user.user_id)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao terminar sessão. Tente novamente.",
        )

    return SessionEndResponse()


@router.post("/message")
async def send_message(
    body: MessageRequest,
    user: UserContext = Depends(get_current_user),
):
    info = session_manager.get_session_info(user.user_id)
    if info is None:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma sessão ativa encontrada.",
        )

    agent = session_manager.get_agent(user.user_id)

    async def event_generator():
        async for sse_event in stream_agent_response(
            agent, user.user_id, body.content, info.skill,
        ):
            yield serialize_event(sse_event)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
