import asyncio

from fastapi import APIRouter, Depends, HTTPException

from dependencies import UserContext, get_current_user
from models.requests import ConfigureApiKeyRequest
from models.responses import AuthStatusResponse, ConfigureResponse
from services.user_provisioner import (
    KeyValidationResult,
    get_auth_status,
    provision_user,
    validate_api_key,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/configure", response_model=ConfigureResponse)
async def configure_api_key(
    body: ConfigureApiKeyRequest,
    user: UserContext = Depends(get_current_user),
) -> ConfigureResponse:
    result = await validate_api_key(body.api_key)
    if result == KeyValidationResult.INVALID:
        raise HTTPException(
            status_code=400, detail="Falha na validação da chave API"
        )
    if result == KeyValidationResult.UNAVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de validação indisponível, tente novamente",
        )

    try:
        await asyncio.to_thread(provision_user, user.user_id, body.api_key)
    except FileExistsError:
        raise HTTPException(
            status_code=409, detail="Chave API já configurada para este utilizador"
        )
    except (FileNotFoundError, OSError) as exc:
        raise HTTPException(
            status_code=500, detail=f"Erro ao provisionar utilizador: {exc}"
        )

    return ConfigureResponse(provisioned=True)


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(
    user: UserContext = Depends(get_current_user),
) -> AuthStatusResponse:
    return get_auth_status(user.user_id)
