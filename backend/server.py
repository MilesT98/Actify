from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import boto3
from io import BytesIO
from fastapi.responses import JSONResponse
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "activity_challenge_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI(title="Activity Challenge API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


# Define Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: EmailStr
    bio: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    members: List[str] = []
    invite_code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityBase(BaseModel):
    title: str
    description: Optional[str] = None

class ActivityCreate(ActivityBase):
    group_id: str

class Activity(ActivityBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    selected_for_date: Optional[datetime] = None

class SubmissionBase(BaseModel):
    activity_id: str

class SubmissionCreate(SubmissionBase):
    pass

class Submission(SubmissionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    photo_url: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    votes: List[str] = []

class LeaderboardEntry(BaseModel):
    user_id: str
    group_id: str
    username: str
    profile_photo_url: Optional[str] = None
    score: int = 0
    streak: int = 0

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(username: str):
    user = await db.users.find_one({"username": username})
    if user:
        return user
    return None

async def get_user_by_id(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if user:
        return user
    return None

async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user["password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except jwt.PyJWTError:
        raise credentials_exception
    user = await get_user_by_id(token_data.user_id)
    if user is None:
        raise credentials_exception
    return user

# Authentication routes
@api_router.post("/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user["id"],
        "username": user["username"]
    }

@api_router.post("/auth/register", response_model=User)
async def register_user(user: UserCreate):
    # Check if username already exists
    existing_user = await get_user(user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create user object
    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["profile_photo_url"] = None
    user_dict["created_at"] = datetime.utcnow()
    
    # Insert user into database
    await db.users.insert_one(user_dict)
    
    # Return user object (without password)
    del user_dict["password"]
    return User(**user_dict)

# Mock file upload - normally you'd use S3 or another storage service
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # In a real implementation, you would upload to S3 or another storage service
    # and return the URL of the uploaded file
    
    # Mock implementation - just return a fake URL
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    mock_url = f"https://storage.example.com/{file_id}.{file_extension}"
    
    return {"url": mock_url}

# User routes
@api_router.get("/users/me", response_model=Dict[str, Any])
async def read_users_me(current_user: dict = Depends(get_current_user)):
    # Get user's groups
    user_groups = await db.groups.find({"members": current_user["id"]}).to_list(100)
    
    # Format user data
    user_data = {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "bio": current_user.get("bio", ""),
        "profile_photo_url": current_user.get("profile_photo_url", ""),
        "created_at": current_user["created_at"],
        "groups": [{"id": group["id"], "name": group["name"]} for group in user_groups]
    }
    
    return user_data

@api_router.put("/users/profile", response_model=User)
async def update_profile(
    bio: str = Form(None), 
    profile_photo: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    
    if bio is not None:
        update_data["bio"] = bio
    
    if profile_photo:
        # In a real implementation, upload to S3 or similar
        file_id = str(uuid.uuid4())
        file_extension = profile_photo.filename.split(".")[-1] if "." in profile_photo.filename else ""
        mock_url = f"https://storage.example.com/{file_id}.{file_extension}"
        update_data["profile_photo_url"] = mock_url
    
    if update_data:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user = await get_user_by_id(current_user["id"])
    
    # Return user without password
    del updated_user["password"]
    return updated_user

# Group routes
@api_router.post("/groups", response_model=Group)
async def create_group(group: GroupCreate, current_user: dict = Depends(get_current_user)):
    # Generate a random 6-character invite code
    invite_code = ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=6))
    
    # Create group object
    group_dict = group.dict()
    group_dict["id"] = str(uuid.uuid4())
    group_dict["created_by"] = current_user["id"]
    group_dict["members"] = [current_user["id"]]
    group_dict["invite_code"] = invite_code
    group_dict["created_at"] = datetime.utcnow()
    
    # Insert group into database
    await db.groups.insert_one(group_dict)
    
    return Group(**group_dict)

@api_router.get("/groups/{group_id}", response_model=Dict[str, Any])
async def get_group(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    
    # Check if user is a member of the group
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Get member details
    members = []
    for member_id in group["members"]:
        member = await get_user_by_id(member_id)
        if member:
            members.append({
                "id": member["id"],
                "username": member["username"],
                "profile_photo_url": member.get("profile_photo_url", "")
            })
    
    # Get today's selected activity
    today = datetime.utcnow().date()
    today_activity = await db.activities.find_one({
        "group_id": group_id,
        "selected_for_date": {
            "$gte": datetime(today.year, today.month, today.day),
            "$lt": datetime(today.year, today.month, today.day) + timedelta(days=1)
        }
    })
    
    # Get all pending activities (not yet selected)
    pending_activities = await db.activities.find({
        "group_id": group_id,
        "selected_for_date": None
    }).to_list(100)
    
    # Format response
    response = {
        "id": group["id"],
        "name": group["name"],
        "description": group["description"],
        "created_by": group["created_by"],
        "invite_code": group["invite_code"],
        "created_at": group["created_at"],
        "members": members,
        "today_activity": today_activity,
        "pending_activities": pending_activities
    }
    
    return response

@api_router.post("/groups/join", response_model=Group)
async def join_group(invite_code: str = Form(...), current_user: dict = Depends(get_current_user)):
    # Find group by invite code
    group = await db.groups.find_one({"invite_code": invite_code})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code",
        )
    
    # Check if user is already a member
    if current_user["id"] in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this group",
        )
    
    # Check if group is full (max 15 members)
    if len(group["members"]) >= 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group is full (15 members max)",
        )
    
    # Add user to group
    await db.groups.update_one(
        {"id": group["id"]},
        {"$push": {"members": current_user["id"]}}
    )
    
    # Get updated group
    updated_group = await db.groups.find_one({"id": group["id"]})
    
    return Group(**updated_group)

# Activity routes
@api_router.post("/activities", response_model=Activity)
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):
    # Check if group exists and user is a member
    group = await db.groups.find_one({"id": activity.group_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Create activity object
    activity_dict = activity.dict()
    activity_dict["id"] = str(uuid.uuid4())
    activity_dict["created_by"] = current_user["id"]
    activity_dict["created_at"] = datetime.utcnow()
    activity_dict["selected_for_date"] = None
    
    # Insert activity into database
    await db.activities.insert_one(activity_dict)
    
    return Activity(**activity_dict)

@api_router.post("/activities/select-daily", response_model=Activity)
async def select_daily_activity(group_id: str = Form(...), current_user: dict = Depends(get_current_user)):
    # Check if group exists and user is a member
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Check if there's already an activity selected for today
    today = datetime.utcnow().date()
    today_activity = await db.activities.find_one({
        "group_id": group_id,
        "selected_for_date": {
            "$gte": datetime(today.year, today.month, today.day),
            "$lt": datetime(today.year, today.month, today.day) + timedelta(days=1)
        }
    })
    
    if today_activity:
        return Activity(**today_activity)
    
    # Get all pending activities
    pending_activities = await db.activities.find({
        "group_id": group_id,
        "selected_for_date": None
    }).to_list(100)
    
    if not pending_activities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No activities available to select",
        )
    
    # Randomly select an activity
    selected_activity = random.choice(pending_activities)
    
    # Update activity with selection date
    selected_for_date = datetime.utcnow()
    await db.activities.update_one(
        {"id": selected_activity["id"]},
        {"$set": {"selected_for_date": selected_for_date}}
    )
    
    selected_activity["selected_for_date"] = selected_for_date
    
    return Activity(**selected_activity)

# Submission routes
@api_router.post("/submissions", response_model=Submission)
async def create_submission(
    activity_id: str = Form(...),
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Check if activity exists
    activity = await db.activities.find_one({"id": activity_id})
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )
    
    # Check if user is a member of the group
    group = await db.groups.find_one({"id": activity["group_id"]})
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Check if activity has been selected for today or a past date
    if not activity.get("selected_for_date"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activity has not been selected for a challenge day",
        )
    
    # Check if user already submitted for this activity
    existing_submission = await db.submissions.find_one({
        "activity_id": activity_id,
        "user_id": current_user["id"]
    })
    
    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already submitted for this activity",
        )
    
    # Process photo upload (mock implementation)
    file_id = str(uuid.uuid4())
    file_extension = photo.filename.split(".")[-1] if "." in photo.filename else ""
    photo_url = f"https://storage.example.com/{file_id}.{file_extension}"
    
    # Create submission
    submission = {
        "id": str(uuid.uuid4()),
        "activity_id": activity_id,
        "user_id": current_user["id"],
        "photo_url": photo_url,
        "submitted_at": datetime.utcnow(),
        "votes": []
    }
    
    # Insert into database
    await db.submissions.insert_one(submission)
    
    return Submission(**submission)

@api_router.post("/submissions/{submission_id}/vote", response_model=Submission)
async def vote_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    # Find submission
    submission = await db.submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
    
    # Check if user is a member of the group
    activity = await db.activities.find_one({"id": submission["activity_id"]})
    group = await db.groups.find_one({"id": activity["group_id"]})
    
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Check if user already voted
    if current_user["id"] in submission["votes"]:
        # Remove vote
        await db.submissions.update_one(
            {"id": submission_id},
            {"$pull": {"votes": current_user["id"]}}
        )
    else:
        # Add vote
        await db.submissions.update_one(
            {"id": submission_id},
            {"$push": {"votes": current_user["id"]}}
        )
    
    # Get updated submission
    updated_submission = await db.submissions.find_one({"id": submission_id})
    
    return Submission(**updated_submission)

@api_router.get("/activities/{activity_id}/submissions", response_model=List[Dict[str, Any]])
async def get_activity_submissions(activity_id: str, current_user: dict = Depends(get_current_user)):
    # Check if activity exists
    activity = await db.activities.find_one({"id": activity_id})
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )
    
    # Check if user is a member of the group
    group = await db.groups.find_one({"id": activity["group_id"]})
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Get all submissions for this activity
    submissions = await db.submissions.find({"activity_id": activity_id}).to_list(100)
    
    # Get user details for each submission
    results = []
    for submission in submissions:
        user = await get_user_by_id(submission["user_id"])
        results.append({
            "id": submission["id"],
            "activity_id": submission["activity_id"],
            "user_id": submission["user_id"],
            "username": user["username"],
            "profile_photo_url": user.get("profile_photo_url", ""),
            "photo_url": submission["photo_url"],
            "submitted_at": submission["submitted_at"],
            "votes": submission["votes"],
            "vote_count": len(submission["votes"])
        })
    
    # Sort by vote count (descending)
    results.sort(key=lambda x: x["vote_count"], reverse=True)
    
    return results

@api_router.get("/groups/{group_id}/leaderboard", response_model=List[LeaderboardEntry])
async def get_group_leaderboard(group_id: str, current_user: dict = Depends(get_current_user)):
    # Check if group exists and user is a member
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    
    if current_user["id"] not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group",
        )
    
    # Initialize leaderboard entries for all group members
    leaderboard = []
    for member_id in group["members"]:
        user = await get_user_by_id(member_id)
        if user:
            leaderboard.append(LeaderboardEntry(
                user_id=user["id"],
                group_id=group_id,
                username=user["username"],
                profile_photo_url=user.get("profile_photo_url", ""),
                score=0,
                streak=0
            ))
    
    # Get all activities for this group
    activities = await db.activities.find({"group_id": group_id}).to_list(100)
    
    # For each activity, get submissions and calculate scores
    for activity in activities:
        submissions = await db.submissions.find({"activity_id": activity["id"]}).to_list(100)
        
        for submission in submissions:
            # Find the user in the leaderboard
            for entry in leaderboard:
                if entry.user_id == submission["user_id"]:
                    # Add points for submission (1 point)
                    entry.score += 1
                    
                    # Add points for votes (1 point per vote)
                    entry.score += len(submission["votes"])
    
    # Sort leaderboard by score (descending)
    leaderboard.sort(key=lambda x: x.score, reverse=True)
    
    return leaderboard

# Test route
@api_router.get("/")
async def root():
    return {"message": "Activity Challenge API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
