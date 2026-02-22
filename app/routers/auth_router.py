"""
auth_router.py
- Authentication endpoints for staff login/logout/registration
- Handles JWT token generation
"""

import re
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import LoginRequest, TokenResponse, UserInfo, RegisterRequest
from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# Staff ID validation patterns
NURSE_ID_PATTERN = re.compile(r'^NURSE-\d{4,6}$')  # NURSE-1001 to NURSE-999999
DOCTOR_ID_PATTERN = re.compile(r'^DOC-\d{4,6}$')   # DOC-2001 to DOC-999999


def _normalize_name(value: str) -> str:
    return " ".join(value.strip().lower().split())


def validate_staff_id(staff_id: str) -> tuple[bool, str, str]:
    """
    Validate staff ID format and extract role.
    Returns: (is_valid, role, error_message)
    """
    staff_id = staff_id.upper().strip()
    
    if NURSE_ID_PATTERN.match(staff_id):
        return True, "NURSE", ""
    elif DOCTOR_ID_PATTERN.match(staff_id):
        return True, "DOCTOR", ""
    else:
        return False, "", "Invalid Staff ID format. Use NURSE-XXXX (e.g., NURSE-1001) or DOC-XXXX (e.g., DOC-2001)"


@router.post("/register", response_model=UserInfo)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Staff registration/activation endpoint.

    Validates staff_id + full_name against preloaded records.
    If valid and not activated, sets password and activates the account.
    """
    staff_id = request.staff_id.upper().strip()

    # Validate staff ID format
    is_valid, expected_role, error_msg = validate_staff_id(staff_id)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    user = db.query(User).filter(User.staff_id == staff_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff ID not found"
        )

    if user.role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff ID does not match the stored role"
        )

    if request.role and user.role != request.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role mismatch for this staff ID"
        )

    if user.is_active and user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account already activated"
        )

    if _normalize_name(user.full_name) != _normalize_name(request.full_name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Name does not match our records"
        )

    user.password_hash = hash_password(request.password)
    user.is_active = True

    db.add(user)
    db.commit()

    return UserInfo(
        id=user.id,
        staff_id=user.staff_id,
        role=user.role,
        full_name=user.full_name,
        is_active=user.is_active,
    )


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
