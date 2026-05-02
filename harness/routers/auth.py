from fastapi import APIRouter, Depends, HTTPException

from dependencies import UserContext, get_current_user
from models.requests import ConfigureApiKeyRequest
from models.responses import AuthStatusResponse, ConfigureResponse
from services.user_provisioner import get_auth_status, provision_user, validate_api_key

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/configure", response_model=ConfigureResponse)
async def configure_api_key(
    body: ConfigureApiKeyRequest,
    user: UserContext = Depends(get_current_user),
) -> ConfigureResponse:
    valid = await validate_api_key(body.api_key)
    if not valid:
        raise HTTPException(status_code=400, detail="API key validation failed")

    provision_user(user.user_id, body.api_key)
    return ConfigureResponse(provisioned=True)


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(
    user: UserContext = Depends(get_current_user),
) -> AuthStatusResponse:
    return get_auth_status(user.user_id)
