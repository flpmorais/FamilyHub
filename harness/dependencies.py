from dataclasses import dataclass
import re

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings

security = HTTPBearer(auto_error=False)

_SAFE_USER_ID_RE = re.compile(r"^[a-zA-Z0-9._-]+$")


@dataclass
class UserContext:
    user_id: str
    email: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserContext:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Não autenticado")

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")

    if ".." in user_id or "/" in user_id or "\\" in user_id or not _SAFE_USER_ID_RE.match(user_id):
        raise HTTPException(status_code=400, detail="Identificador de utilizador inválido")

    return UserContext(user_id=user_id, email=email or "")
