from fastapi import APIRouter, HTTPException

from app.database import db

router = APIRouter()


@router.get("/resume/{email}/share")
async def get_share(email: str):
    """Current sharing state (token + whether the public link is live)."""
    try:
        return db.get_share_state(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume/{email}/share")
async def enable_share(email: str):
    """Turn on the public link (minting a token the first time)."""
    state = db.set_share(email, enabled=True)
    if state is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return state


@router.post("/resume/{email}/share/regenerate")
async def regenerate_share(email: str):
    """Mint a fresh token, permanently invalidating the old link."""
    state = db.set_share(email, enabled=True, regenerate=True)
    if state is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return state


@router.post("/resume/{email}/share/disable")
async def disable_share(email: str):
    """Turn the public link off. The token is kept so re-enabling reuses it."""
    state = db.set_share(email, enabled=False)
    if state is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return state


@router.get("/r/{token}")
async def public_resume(token: str):
    """Public, read-only resume by share token. No account data is exposed."""
    resume = db.get_shared_resume(token)
    if not resume:
        raise HTTPException(status_code=404, detail="This shared resume is not available.")
    return resume
