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
    Staff self-registration endpoint.
    
    Staff ID format:
    - NURSE-XXXX for nurses (e.g., NURSE-1001, NURSE-2345)
    - DOC-XXXX for doctors (e.g., DOC-2001, DOC-3456)
    
    The role is automatically determined from the Staff ID prefix.
    """
    # Normalize staff_id to uppercase
    staff_id = request.staff_id.upper().strip()
    
    # Validate staff ID format and extract role
    is_valid, role, error_msg = validate_staff_id(staff_id)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Check passwords match
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Check if staff_id already exists
    existing_user = db.query(User).filter(User.staff_id == staff_id).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Staff ID '{staff_id}' is already registered"
        )
    
    # Create new user
    new_user = User(
        staff_id=staff_id,
        password_hash=hash_password(request.password),
        role=role,
        full_name=request.full_name.strip(),
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserInfo(
        id=new_user.id,
        staff_id=new_user.staff_id,
        role=new_user.role,
        full_name=new_user.full_name,
        is_active=new_user.is_active,
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
