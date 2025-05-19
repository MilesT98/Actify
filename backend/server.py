from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.staticfiles import StaticFiles
import os
import logging
import random
import shutil
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

# Create uploads directory for file storage
uploads_dir = Path("/app/backend/uploads")
uploads_dir.mkdir(exist_ok=True)

# Helper function to get base URL for uploads
def get_base_url():
    # This would typically come from environment variables
    return "https://e1ffcce3-e7c4-41ff-9685-adbbd39fef6d.preview.emergentagent.com"
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
app = FastAPI(title="ACTIFY API")

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
    interests: Optional[List[str]] = []

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    streak: int = 0
    total_points: int = 0
    completed_challenges: int = 0
    is_active: bool = True

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    members: List[str] = []
    admins: List[str] = []
    invite_code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    group_photo_url: Optional[str] = None
    is_active: bool = True
    max_members: int = 15

class ActivityBase(BaseModel):
    title: str
    description: Optional[str] = None
    emoji: Optional[str] = None

class ActivityCreate(ActivityBase):
    group_id: str

class Activity(ActivityBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    selected_for_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    is_completed: bool = False
    difficulty: Optional[str] = None  # easy, medium, hard

class SubmissionBase(BaseModel):
    activity_id: str
    caption: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    pass

class Submission(SubmissionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    photo_url: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    votes: List[str] = []
    location: Optional[Dict[str, float]] = None  # lat, lng
    reactions: Optional[Dict[str, List[str]]] = None  # emoji: [user_ids]
    is_featured: bool = False

class LeaderboardEntry(BaseModel):
    user_id: str
    group_id: str
    username: str
    profile_photo_url: Optional[str] = None
    score: int = 0
    streak: int = 0
    rank: int = 0
    previous_rank: int = 0
    badges: List[str] = []
    submissions_count: int = 0
    last_active: Optional[datetime] = None

class Interest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    icon: Optional[str] = None

class Badge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    icon_url: str
    criteria: str  # Description of how to earn this badge
    tier: Optional[str] = None  # bronze, silver, gold
    
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False
    type: str  # challenge, group, system, etc.
    link: Optional[str] = None  # Deep link to relevant content

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# Helper function to convert MongoDB ObjectId to string
def convert_objectid_to_str(doc):
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, dict):
                doc[key] = convert_objectid_to_str(value)
            elif isinstance(value, list):
                doc[key] = [convert_objectid_to_str(item) if isinstance(item, dict) else 
                            str(item) if hasattr(item, '__str__') and not isinstance(item, (str, int, float, bool, type(None))) else 
                            item 
                            for item in value]
            elif hasattr(value, '__str__') and not isinstance(value, (str, int, float, bool, type(None))):
                doc[key] = str(value)
    return doc

async def get_user(username: str):
    user = await db.users.find_one({"username": username})
    if user:
        return convert_objectid_to_str(user)
    return None

async def get_user_by_id(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if user:
        return convert_objectid_to_str(user)
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
    user_dict["streak"] = 0
    user_dict["total_points"] = 0
    user_dict["completed_challenges"] = 0
    user_dict["is_active"] = True
    
    # Initialize empty interests array if not provided
    if "interests" not in user_dict or not user_dict["interests"]:
        user_dict["interests"] = []
    
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
    
    # Get user's stats
    submissions_count = await db.submissions.count_documents({"user_id": current_user["id"]})
    
    # Get available interests
    interests = await db.interests.find().to_list(100)
    available_interests = [interest["name"] for interest in interests]
    
    # Format user data
    user_data = {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "bio": current_user.get("bio", ""),
        "profile_photo_url": current_user.get("profile_photo_url", ""),
        "created_at": current_user["created_at"],
        "interests": current_user.get("interests", []),
        "available_interests": available_interests,
        "streak": current_user.get("streak", 0),
        "total_points": current_user.get("total_points", 0),
        "completed_challenges": current_user.get("completed_challenges", 0),
        "submissions_count": submissions_count,
        "groups": [{"id": group["id"], "name": group["name"]} for group in user_groups]
    }
    
    return user_data

@api_router.put("/users/profile", response_model=User)
async def update_profile(
    bio: str = Form(None), 
    interests: str = Form(None),
    profile_photo: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    
    if bio is not None:
        update_data["bio"] = bio
    
    if interests is not None:
        # Convert comma-separated string to list
        interests_list = [interest.strip() for interest in interests.split(",") if interest.strip()]
        update_data["interests"] = interests_list
    
    if profile_photo:
        # Save the profile photo to disk
        file_id = str(uuid.uuid4())
        file_extension = profile_photo.filename.split(".")[-1] if "." in profile_photo.filename else ""
        file_name = f"{file_id}.{file_extension}"
        file_path = uploads_dir / file_name
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(profile_photo.file, buffer)
        
        # Set URL to the served path with full domain
        base_url = get_base_url()
        update_data["profile_photo_url"] = f"{base_url}/uploads/{file_name}"
    
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

@api_router.get("/interests", response_model=List[Interest])
async def get_interests():
    interests = await db.interests.find().to_list(100)
    # Convert ObjectId to string
    for interest in interests:
        if "_id" in interest:
            interest["_id"] = str(interest["_id"])
    return [Interest(**interest) for interest in interests]

@api_router.post("/interests", response_model=Interest)
async def create_interest(interest: Interest, current_user: dict = Depends(get_current_user)):
    # Only allow creation of interests if the interest doesn't exist
    existing = await db.interests.find_one({"name": interest.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interest already exists",
        )
    
    interest_dict = interest.dict()
    # Insert interest into database
    await db.interests.insert_one(interest_dict)
    return interest

# Group routes
@api_router.get("/groups/user", response_model=List[Dict[str, Any]])
async def get_user_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.groups.find({"members": current_user["id"]}).to_list(100)
    
    # Convert ObjectId to string for each group
    for group in groups:
        if "_id" in group:
            group["_id"] = str(group["_id"])
    
    return groups

@api_router.get("/groups/public", response_model=List[Dict[str, Any]])
async def get_public_groups(current_user: dict = Depends(get_current_user)):
    public_groups = await db.groups.find({"is_private": False}).to_list(100)
    
    # Convert ObjectId to string for each group
    for group in public_groups:
        if "_id" in group:
            group["_id"] = str(group["_id"])
    
    return public_groups

@api_router.post("/groups", response_model=Group)
async def create_group(
    group: GroupCreate, 
    group_photo: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    # Generate a random 6-character invite code
    invite_code = ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=6))
    
    # Create group object
    group_dict = group.dict()
    group_dict["id"] = str(uuid.uuid4())
    group_dict["created_by"] = current_user["id"]
    group_dict["members"] = [current_user["id"]]
    group_dict["admins"] = [current_user["id"]]  # Creator is admin by default
    group_dict["invite_code"] = invite_code
    group_dict["created_at"] = datetime.utcnow()
    group_dict["is_active"] = True
    group_dict["max_members"] = 15
    
    # Process group photo if provided
    if group_photo:
        # Save the group photo to disk
        file_id = str(uuid.uuid4())
        file_extension = group_photo.filename.split(".")[-1] if "." in group_photo.filename else ""
        file_name = f"{file_id}.{file_extension}"
        file_path = uploads_dir / file_name
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(group_photo.file, buffer)
        
        # Set URL to the served path with full domain
        base_url = get_base_url()
        group_dict["group_photo_url"] = f"{base_url}/uploads/{file_name}"
    else:
        group_dict["group_photo_url"] = None
    
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
    
    # Convert ObjectId to string if present
    if today_activity and '_id' in today_activity:
        today_activity['_id'] = str(today_activity['_id'])
    
    # Get all pending activities (not yet selected)
    pending_activities = await db.activities.find({
        "group_id": group_id,
        "selected_for_date": None
    }).to_list(100)
    
    # Convert ObjectId to string in all pending activities
    for activity in pending_activities:
        if '_id' in activity:
            activity['_id'] = str(activity['_id'])
    
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
    
    # Check if group is full (max members)
    max_members = group.get("max_members", 15)
    if len(group["members"]) >= max_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Group is full ({max_members} members max)",
        )
    
    # Add user to group
    await db.groups.update_one(
        {"id": group["id"]},
        {"$push": {"members": current_user["id"]}}
    )
    
    # Get updated group
    updated_group = await db.groups.find_one({"id": group["id"]})
    
    # Send notifications to group admins
    for admin_id in updated_group.get("admins", []):
        if admin_id != current_user["id"]:  # Don't notify the user who just joined
            # Create notification message
            notification_title = f"New Member in {updated_group['name']}"
            notification_message = f"{current_user['username']} has joined your group!"
            
            # Create notification
            await create_notification(
                user_id=admin_id,
                title=notification_title,
                message=notification_message,
                type="group",
                link=f"/groups/{updated_group['id']}"
            )
    
    return Group(**updated_group)

@api_router.post("/groups/{group_id}/members/{user_id}/remove", response_model=Dict[str, Any])
async def remove_group_member(
    group_id: str, 
    user_id: str, 
    current_user: dict = Depends(get_current_user)
):
    # Check if group exists
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    
    # Check if current user is admin
    if current_user["id"] not in group.get("admins", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can remove members",
        )
    
    # Check if user to remove exists and is a member
    if user_id not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of this group",
        )
    
    # If the user is the last admin, prevent removal
    if user_id in group.get("admins", []) and len(group.get("admins", [])) == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last admin from the group",
        )
    
    # Remove user from members
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"members": user_id}}
    )
    
    # Remove from admins if they were an admin
    if user_id in group.get("admins", []):
        await db.groups.update_one(
            {"id": group_id},
            {"$pull": {"admins": user_id}}
        )
    
    return {"message": "Member removed successfully"}

@api_router.post("/groups/{group_id}/admins/{user_id}/add", response_model=Dict[str, Any])
async def add_group_admin(
    group_id: str, 
    user_id: str, 
    current_user: dict = Depends(get_current_user)
):
    # Check if group exists
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    
    # Check if current user is admin
    if current_user["id"] not in group.get("admins", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can add new admins",
        )
    
    # Check if user to promote exists and is a member
    if user_id not in group["members"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of this group",
        )
    
    # Check if user is already an admin
    if user_id in group.get("admins", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already an admin",
        )
    
    # Add user to admins
    await db.groups.update_one(
        {"id": group_id},
        {"$push": {"admins": user_id}}
    )
    
    return {"message": "Admin added successfully"}

# Activity routes
@api_router.post("/activities", response_model=Activity)
async def create_activity(
    title: str = Form(...),
    description: str = Form(None),
    emoji: str = Form(None),
    group_id: str = Form(...),
    difficulty: str = Form(None),
    deadline_days: int = Form(None),
    current_user: dict = Depends(get_current_user)
):
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
    
    # Create activity object
    activity_dict = {
        "title": title,
        "description": description,
        "emoji": emoji,
        "group_id": group_id,
        "id": str(uuid.uuid4()),
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "selected_for_date": None,
        "is_completed": False,
        "difficulty": difficulty
    }
    
    # Set deadline if provided
    if deadline_days is not None and deadline_days > 0:
        activity_dict["deadline"] = datetime.utcnow() + timedelta(days=deadline_days)
    else:
        activity_dict["deadline"] = None
    
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
    
    # Get activity creator
    creator = await get_user_by_id(selected_activity["created_by"])
    creator_name = creator["username"] if creator else "Someone"
    
    # Send notifications to all group members
    for member_id in group["members"]:
        if member_id != current_user["id"]:  # Don't notify the user who selected the activity
            # Create notification message
            notification_title = f"New Daily Challenge in {group['name']}"
            notification_message = f"{creator_name}'s activity '{selected_activity['title']}' has been selected for today's challenge!"
            
            # Create notification
            await create_notification(
                user_id=member_id,
                title=notification_title,
                message=notification_message,
                type="challenge",
                link=f"/groups/{group_id}"
            )
    
    return Activity(**selected_activity)

# Submission routes
@api_router.post("/submissions", response_model=Submission)
async def create_submission(
    activity_id: str = Form(...),
    caption: str = Form(None),
    latitude: float = Form(None),
    longitude: float = Form(None),
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
    
    # Process photo upload
    file_id = str(uuid.uuid4())
    file_extension = photo.filename.split(".")[-1] if "." in photo.filename else ""
    file_name = f"{file_id}.{file_extension}"
    file_path = uploads_dir / file_name
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    
    # Set URL to the served path with full domain
    base_url = get_base_url()
    photo_url = f"{base_url}/uploads/{file_name}"
    
    # Create submission
    submission = {
        "id": str(uuid.uuid4()),
        "activity_id": activity_id,
        "user_id": current_user["id"],
        "photo_url": photo_url,
        "caption": caption,
        "submitted_at": datetime.utcnow(),
        "votes": [],
        "reactions": {},
        "is_featured": False
    }
    
    # Add location if provided
    if latitude is not None and longitude is not None:
        submission["location"] = {"lat": latitude, "lng": longitude}
    
    # Insert into database
    await db.submissions.insert_one(submission)
    
    # Update user stats - increment completed challenges
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"completed_challenges": 1}}
    )
    
    # Mark activity as completed if all members have submitted
    group_member_count = len(group["members"])
    submission_count = await db.submissions.count_documents({"activity_id": activity_id})
    
    if submission_count >= group_member_count:
        await db.activities.update_one(
            {"id": activity_id},
            {"$set": {"is_completed": True}}
        )
    
    # Send notifications to group members
    for member_id in group["members"]:
        if member_id != current_user["id"] and member_id in group.get("admins", []):  # Notify only admins
            # Create notification message
            notification_title = f"New Submission in {group['name']}"
            notification_message = f"{current_user['username']} has submitted a photo for the challenge '{activity['title']}'!"
            
            # Create notification
            await create_notification(
                user_id=member_id,
                title=notification_title,
                message=notification_message,
                type="submission",
                link=f"/groups/{group['id']}/activities/{activity_id}/submissions"
            )
    
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
    vote_added = False
    if current_user["id"] in submission["votes"]:
        # Remove vote
        await db.submissions.update_one(
            {"id": submission_id},
            {"$pull": {"votes": current_user["id"]}}
        )
    else:
        # Add vote
        vote_added = True
        await db.submissions.update_one(
            {"id": submission_id},
            {"$push": {"votes": current_user["id"]}}
        )
    
    # Get updated submission
    updated_submission = await db.submissions.find_one({"id": submission_id})
    
    # If a vote was added (not removed), send notification to submission owner
    if vote_added and submission["user_id"] != current_user["id"]:
        # Get submission owner
        submission_owner = await get_user_by_id(submission["user_id"])
        if submission_owner:
            # Create notification message
            notification_title = "Your submission got a vote!"
            notification_message = f"{current_user['username']} voted for your submission in {group['name']}."
            
            # Create notification
            await create_notification(
                user_id=submission["user_id"],
                title=notification_title,
                message=notification_message,
                type="vote",
                link=f"/groups/{group['id']}/activities/{activity['id']}/submissions"
            )
            
            # Update user stats - increment total points
            await db.users.update_one(
                {"id": submission["user_id"]},
                {"$inc": {"total_points": 1}}
            )
    
    return Submission(**updated_submission)

@api_router.post("/submissions/{submission_id}/react", response_model=Submission)
async def react_to_submission(
    submission_id: str, 
    emoji: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
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
    
    # Initialize reactions dict if it doesn't exist
    if not submission.get("reactions"):
        submission["reactions"] = {}
    
    # Add or remove reaction
    if emoji not in submission["reactions"]:
        submission["reactions"][emoji] = []
    
    if current_user["id"] in submission["reactions"][emoji]:
        # Remove reaction
        submission["reactions"][emoji].remove(current_user["id"])
        if not submission["reactions"][emoji]:
            # Remove empty emoji entry
            del submission["reactions"][emoji]
    else:
        # Add reaction
        submission["reactions"][emoji].append(current_user["id"])
    
    # Update submission in database
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"reactions": submission["reactions"]}}
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
        # Convert ObjectId to string if present
        if '_id' in submission:
            submission['_id'] = str(submission['_id'])
            
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
    previous_leaderboard = await db.leaderboard_history.find_one(
        {"group_id": group_id},
        sort=[("created_at", -1)]
    )
    
    for member_id in group["members"]:
        user = await get_user_by_id(member_id)
        if user:
            # Get user's submission count
            submissions_count = await db.submissions.count_documents({
                "user_id": user["id"],
                "activity_id": {"$in": [activity["id"] for activity in await db.activities.find({"group_id": group_id}).to_list(100)]}
            })
            
            # Find previous rank if available
            previous_rank = 0
            if previous_leaderboard and "entries" in previous_leaderboard:
                for entry in previous_leaderboard["entries"]:
                    if entry["user_id"] == user["id"]:
                        previous_rank = entry.get("rank", 0)
                        break
            
            # Get user's streak
            streak = user.get("streak", 0)
            
            # Get user's badges
            badges = []
            # Add badges based on submission count
            if submissions_count >= 10:
                badges.append("regular")
            if submissions_count >= 30:
                badges.append("committed")
            if submissions_count >= 50:
                badges.append("champion")
            
            # Get last active date
            last_submission = await db.submissions.find_one(
                {"user_id": user["id"]},
                sort=[("submitted_at", -1)]
            )
            last_active = last_submission["submitted_at"] if last_submission else None
            
            leaderboard.append(LeaderboardEntry(
                user_id=user["id"],
                group_id=group_id,
                username=user["username"],
                profile_photo_url=user.get("profile_photo_url", ""),
                score=0,
                streak=streak,
                rank=0,  # Will be set after sorting
                previous_rank=previous_rank,
                badges=badges,
                submissions_count=submissions_count,
                last_active=last_active
            ))
    
    # Get all activities for this group
    activities = await db.activities.find({"group_id": group_id}).to_list(100)
    activities = [convert_objectid_to_str(activity) for activity in activities]
    
    # For each activity, get submissions and calculate scores
    for activity in activities:
        submissions = await db.submissions.find({"activity_id": activity["id"]}).to_list(100)
        submissions = [convert_objectid_to_str(submission) for submission in submissions]
        
        for submission in submissions:
            # Find the user in the leaderboard
            for entry in leaderboard:
                if entry.user_id == submission["user_id"]:
                    # Add points for submission (1 point)
                    entry.score += 1
                    
                    # Add points for votes (1 point per vote)
                    entry.score += len(submission["votes"])
                    
                    # Add points for reactions (0.5 points per reaction)
                    reaction_count = sum(len(users) for users in submission.get("reactions", {}).values())
                    entry.score += reaction_count * 0.5
    
    # Sort leaderboard by score (descending)
    leaderboard.sort(key=lambda x: x.score, reverse=True)
    
    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry.rank = i + 1
    
    # Store leaderboard history
    leaderboard_history = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "created_at": datetime.utcnow(),
        "entries": [entry.dict() for entry in leaderboard]
    }
    
    await db.leaderboard_history.insert_one(leaderboard_history)
    
    return leaderboard

# Notification routes
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    # Get user's notifications
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Convert ObjectId to string
    for notification in notifications:
        if "_id" in notification:
            notification["_id"] = str(notification["_id"])
    
    return [Notification(**notification) for notification in notifications]

@api_router.post("/notifications/mark-read/{notification_id}", response_model=Dict[str, Any])
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Find notification
    notification = await db.notifications.find_one({"id": notification_id})
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    # Check if notification belongs to user
    if notification["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this notification",
        )
    
    # Mark as read
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/mark-all-read", response_model=Dict[str, Any])
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    # Mark all user's notifications as read
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": "All notifications marked as read"}

# Helper function to create notifications
async def create_notification(user_id: str, title: str, message: str, type: str, link: Optional[str] = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "created_at": datetime.utcnow(),
        "read": False,
        "type": type,
        "link": link
    }
    
    await db.notifications.insert_one(notification)
    return notification

# Challenge routes
@api_router.get("/challenges/active", response_model=List[Dict[str, Any]])
async def get_active_challenges(current_user: dict = Depends(get_current_user)):
    # Get user's groups
    user_groups = await db.groups.find({"members": current_user["id"]}).to_list(100)
    group_ids = [group["id"] for group in user_groups]
    
    # Get today's date
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Query for active challenges
    active_challenges = await db.activities.find({
        "group_id": {"$in": group_ids},
        "selected_for_date": {"$gte": today},
        "is_completed": False
    }).to_list(100)
    
    # Mark today's challenge and convert ObjectId
    for challenge in active_challenges:
        if "_id" in challenge:
            challenge["_id"] = str(challenge["_id"])
        challenge_date = challenge["selected_for_date"].replace(hour=0, minute=0, second=0, microsecond=0)
        challenge["is_today"] = challenge_date == today
    
    return active_challenges

@api_router.get("/challenges/featured", response_model=List[Dict[str, Any]])
async def get_featured_challenges(current_user: dict = Depends(get_current_user)):
    # Get some random activities to show as featured
    featured = await db.activities.find({}).limit(5).to_list(5)
    
    # Convert ObjectId to string
    for challenge in featured:
        if "_id" in challenge:
            challenge["_id"] = str(challenge["_id"])
    
    return featured

@api_router.get("/challenges/history", response_model=List[Dict[str, Any]])
async def get_challenge_history(current_user: dict = Depends(get_current_user)):
    # Get user's groups
    user_groups = await db.groups.find({"members": current_user["id"]}).to_list(100)
    group_ids = [group["id"] for group in user_groups]
    
    # Get past activities
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    past_challenges = await db.activities.find({
        "group_id": {"$in": group_ids},
        "selected_for_date": {"$lt": today}
    }).sort("selected_for_date", -1).limit(20).to_list(20)
    
    # Get submissions for each challenge and convert ObjectId
    for challenge in past_challenges:
        if "_id" in challenge:
            challenge["_id"] = str(challenge["_id"])
        submission = await db.submissions.find_one({
            "activity_id": challenge["id"],
            "user_id": current_user["id"]
        })
        challenge["completed"] = submission is not None
        challenge["date"] = challenge["selected_for_date"]
    
    return past_challenges

# Leaderboard routes
@api_router.get("/leaderboard/global", response_model=List[Dict[str, Any]])
async def get_global_leaderboard(current_user: dict = Depends(get_current_user)):
    # Get all users
    users = await db.users.find().to_list(100)
    
    # Create leaderboard
    leaderboard = []
    for user in users:
        entry = {
            "id": user["id"],
            "username": user["username"],
            "profile_photo_url": user.get("profile_photo_url"),
            "streak": user.get("streak", 0),
            "total_points": user.get("total_points", 0),
            "completed_challenges": user.get("completed_challenges", 0),
            "rank": 0  # Will be set after sorting
        }
        leaderboard.append(entry)
    
    # Sort by points
    leaderboard.sort(key=lambda x: x["total_points"], reverse=True)
    
    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return leaderboard

@api_router.get("/leaderboard/friends", response_model=List[Dict[str, Any]])
async def get_friends_leaderboard(current_user: dict = Depends(get_current_user)):
    # For demo purposes, return the same as global leaderboard
    # In a real app, you would filter by friends
    return await get_global_leaderboard(current_user)

# Test route
@api_router.get("/")
async def root():
    return {"message": "ACTIFY API"}

# Include the router in the main app
app.include_router(api_router)

# Mount the static directory for serving uploaded files
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

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
