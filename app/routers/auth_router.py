"""
auth_router.py
- Authentication endpoints for staff login/logout
- Handles JWT token generation
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import LoginRequest, TokenResponse, UserInfo
from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Staff login endpoint.
    
    Accepts staff_id (e.g., NURSE-1001, DOC-2001) and password.
    Returns JWT access token on success.
    """
    user = authenticate_user(db, request.staff_id, request.password)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.staff_id, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        staff_id=user.staff_id,
        role=user.role,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserInfo)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user info.
    Requires valid JWT token.
    """
    return UserInfo(
        id=current_user.id,
        staff_id=current_user.staff_id,
        role=current_user.role,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
    )


@router.post("/logout")
def logout():
    """
    Logout endpoint.
    
    Note: With JWT, logout is typically handled client-side by discarding the token.
    This endpoint is provided for API completeness.
    """
    return {"message": "Logged out successfully. Please discard your token."}
