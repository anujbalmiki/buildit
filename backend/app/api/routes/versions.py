from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import db

router = APIRouter()


class VersionCreate(BaseModel):
    snapshot: dict
    source: str = "manual"
    protected: bool = False


@router.post("/resume/{email}/versions")
async def create_version(email: str, body: VersionCreate):
    try:
        version_id = db.save_version(email, body.snapshot, body.source, body.protected)
        # version_id is None when the snapshot was identical to the last one.
        return {"id": version_id, "stored": version_id is not None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resume/{email}/versions")
async def list_versions(email: str):
    try:
        return db.list_versions(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resume/{email}/versions/{version_id}")
async def get_version(email: str, version_id: str):
    version = db.get_version(email, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version
