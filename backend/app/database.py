import hashlib
import json
import os
import secrets
from datetime import datetime

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection

load_dotenv()

# Version-history retention. Auto snapshots are disposable (throttled autosave
# checkpoints); protected snapshots are the ones the user or a destructive load
# created and must not be evicted by auto churn. See save_version / _prune_versions.
AUTO_VERSION_CAP = 30
PROTECTED_VERSION_CAP = 50


class Database:
    """Lazy MongoDB wrapper.

    The connection is created on first use so the app can start (and serve
    endpoints that don't touch the DB) even when MONGODB_URI is unset.
    """

    def __init__(self):
        self._client: MongoClient | None = None
        self._resumes: Collection | None = None

    def _collection(self) -> Collection:
        if self._resumes is None:
            uri = os.getenv("MONGODB_URI")
            if not uri:
                raise RuntimeError("MONGODB_URI is not set. Add it to backend/.env.")
            self._client = MongoClient(uri)
            self._resumes = self._client.buildit.resumes
            # Look up public shared resumes by token. Sparse so the many resumes
            # without a token don't collide on a null value.
            self._resumes.create_index("share_token", unique=True, sparse=True)
        return self._resumes

    def _convert_objectid(self, data):
        """Convert ObjectId to string in the document"""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, ObjectId):
                    data[key] = str(value)
                elif isinstance(value, (dict, list)):
                    data[key] = self._convert_objectid(value)
        elif isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, ObjectId):
                    data[i] = str(item)
                elif isinstance(item, (dict, list)):
                    data[i] = self._convert_objectid(item)
        return data

    def get_resume(self, email: str):
        resume = self._collection().find_one({"email": email})
        if resume:
            return self._convert_objectid(resume)
        return None

    def save_resume(self, email: str, resume_data: dict):
        resume_data["last_updated"] = datetime.now()
        resume_data["email"] = email
        if "_id" in resume_data:
            del resume_data["_id"]

        return self._collection().update_one(
            {"email": email},
            {"$set": resume_data},
            upsert=True,
        )

    # ------------------------------------------------------------------ #
    # Version history
    # ------------------------------------------------------------------ #

    def _versions(self) -> Collection:
        self._collection()  # ensure the client is connected
        return self._client.buildit.resume_versions

    @staticmethod
    def _snapshot_hash(snapshot: dict) -> str:
        clean = {k: v for k, v in (snapshot or {}).items()
                 if k not in ("_id", "email", "last_updated")}
        return hashlib.sha256(
            json.dumps(clean, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

    def save_version(self, email: str, snapshot: dict, source: str = "auto",
                     protected: bool = False):
        """Store a point-in-time copy of a resume. Skips writing when the
        snapshot is identical to the most recent version (dedupe), then prunes
        old versions so auto churn can never evict protected checkpoints."""
        clean = {k: v for k, v in dict(snapshot or {}).items()
                 if k not in ("_id", "email", "last_updated")}
        digest = self._snapshot_hash(clean)

        col = self._versions()
        latest = col.find_one({"email": email}, sort=[("created_at", -1)])
        if latest and latest.get("hash") == digest:
            return None  # identical to the last version — nothing to store

        result = col.insert_one({
            "email": email,
            "snapshot": clean,
            "source": source,
            "protected": bool(protected),
            "hash": digest,
            "created_at": datetime.now(),
        })
        self._prune_versions(email)
        return str(result.inserted_id)

    def _prune_versions(self, email: str):
        col = self._versions()
        for is_protected, cap in ((False, AUTO_VERSION_CAP), (True, PROTECTED_VERSION_CAP)):
            extra = list(
                col.find({"email": email, "protected": is_protected})
                .sort("created_at", -1)
                .skip(cap)
            )
            if extra:
                col.delete_many({"_id": {"$in": [d["_id"] for d in extra]}})

    @staticmethod
    def _version_meta(doc: dict) -> dict:
        created = doc.get("created_at")
        return {
            "id": str(doc["_id"]),
            "source": doc.get("source", "auto"),
            "protected": bool(doc.get("protected", False)),
            "created_at": created.isoformat() if created else None,
        }

    def list_versions(self, email: str):
        col = self._versions()
        docs = col.find({"email": email}, {"snapshot": 0}).sort("created_at", -1)
        return [self._version_meta(d) for d in docs]

    def get_version(self, email: str, version_id: str):
        try:
            oid = ObjectId(version_id)
        except Exception:
            return None
        doc = self._versions().find_one({"_id": oid, "email": email})
        if not doc:
            return None
        meta = self._version_meta(doc)
        meta["snapshot"] = self._convert_objectid(doc.get("snapshot", {}))
        return meta

    # ------------------------------------------------------------------ #
    # Public sharing
    # ------------------------------------------------------------------ #

    # Fields that must never leak on a publicly shared resume.
    _PRIVATE_KEYS = ("_id", "email", "share_token", "share_enabled", "last_updated")

    def get_share_state(self, email: str):
        """Return the current sharing state for a user's resume."""
        doc = self._collection().find_one(
            {"email": email}, {"share_token": 1, "share_enabled": 1}
        )
        if not doc:
            return {"token": None, "enabled": False}
        return {"token": doc.get("share_token"), "enabled": bool(doc.get("share_enabled", False))}

    def set_share(self, email: str, enabled: bool = True, regenerate: bool = False):
        """Enable/disable public sharing for a user's resume. Mints a random
        token the first time it's enabled (or when regenerate is set, which
        invalidates any previously shared link). Returns None if no resume."""
        col = self._collection()
        doc = col.find_one({"email": email}, {"share_token": 1})
        if not doc:
            return None
        token = doc.get("share_token")
        if enabled and (regenerate or not token):
            token = secrets.token_urlsafe(9)
        update = {"share_enabled": enabled}
        if token:
            update["share_token"] = token
        col.update_one({"email": email}, {"$set": update})
        return {"token": token, "enabled": enabled}

    def get_shared_resume(self, token: str):
        """Look up a resume by its public token. Returns None if the token is
        unknown or sharing is disabled. Strips account-private fields."""
        if not token:
            return None
        doc = self._collection().find_one({"share_token": token, "share_enabled": True})
        if not doc:
            return None
        doc = self._convert_objectid(doc)
        for key in self._PRIVATE_KEYS:
            doc.pop(key, None)
        return doc


db = Database()
