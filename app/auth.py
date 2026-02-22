"""
auth.py
- Authentication utilities: password hashing, JWT tokens, dependencies
- Used for nurse and doctor login/authorization
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .db import get_db
from .models import User

# =============================================================================
# Configuration
# =============================================================================

# Load .env to allow local development without exporting env vars
load_dotenv()

# Secret key for JWT - required in all environments
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is required. Set it in the environment or .env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

# =============================================================================
# Password Hashing (using bcrypt directly for compatibility)
# =============================================================================

def hash_password(plain_password: str) -> str:
    """Hash a plain text password."""
    password_bytes = plain_password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hash."""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


# =============================================================================
# JWT Token Handling
# =============================================================================

class TokenData(BaseModel):
    """Data extracted from JWT token."""
    staff_id: str
    role: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        staff_id: str = payload.get("sub")
        role: str = payload.get("role")
        if staff_id is None or role is None:
            return None
        return TokenData(staff_id=staff_id, role=role)
    except JWTError:
        return None


# =============================================================================
# Authentication Dependencies
# =============================================================================

# Use Bearer token authentication
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    Raises 401 if not authenticated.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if credentials is None:
        raise credentials_exception
    
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.staff_id == token_data.staff_id).first()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )
    
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency to optionally get the current user.
    Returns None if not authenticated (does not raise error).
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data is None:
        return None
    
    user = db.query(User).filter(User.staff_id == token_data.staff_id).first()
    
    if user is None or not user.is_active:
        return None
    
    return user


# =============================================================================
# Role-Based Access Control
# =============================================================================

def require_role(*allowed_roles: str):
    """
    Dependency factory that restricts access to specific roles.
    
    Usage:
        @router.get("/nurse/queue")
        def nurse_queue(user: User = Depends(require_role("NURSE"))):
            ...
    """
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return user
    return role_checker


# Convenience dependencies for common role checks
require_nurse = require_role("NURSE")
require_doctor = require_role("DOCTOR")
require_staff = require_role("NURSE", "DOCTOR")


# =============================================================================
# User Authentication
# =============================================================================

def authenticate_user(db: Session, staff_id: str, password: str) -> Optional[User]:
    """
    Authenticate a user by staff_id and password.
    Returns the user if valid, None otherwise.
    """
    normalized_id = staff_id.strip().upper()
    user = db.query(User).filter(User.staff_id == normalized_id).first()
    
    if user is None:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    if not user.is_active:
        return None
    
    return user
