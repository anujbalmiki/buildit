import os
from datetime import datetime

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection

load_dotenv()


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


db = Database()
