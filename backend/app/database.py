from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

class Database:
    def __init__(self):
        self.client = MongoClient(os.environ["MONGODB_URI"])
        self.db = self.client.buildit
        self.resumes = self.db.resumes

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
        resume = self.resumes.find_one({"email": email})
        if resume:
            return self._convert_objectid(resume)
        return None

    def save_resume(self, email: str, resume_data: dict):
        resume_data["last_updated"] = datetime.now()
        resume_data["email"] = email
        if "_id" in resume_data:
            del resume_data["_id"]
        
        result = self.resumes.update_one(
            {"email": email},
            {"$set": resume_data},
            upsert=True
        )
        return result

db = Database() 