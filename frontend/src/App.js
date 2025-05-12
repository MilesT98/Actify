import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
import React from "react";
const AuthContext = React.createContext(null);

const useAuth = () => {
  return React.useContext(AuthContext);
};

// Authentication Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    if (token && userId && username) {
      setUser({
        token,
        userId,
        username,
      });
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userId, username) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser({
      token,
      userId,
      username,
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Private Route Component
const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" />;
};

// Components
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-indigo-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Activity Challenge</Link>
        <div className="space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="hover:underline">Profile</Link>
              <button 
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link to="/login" className="hover:underline">Login</Link>
              <Link to="/register" className="hover:underline">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Auth Pages
const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    bio: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      await axios.post(`${API}/auth/register`, formData);
      navigate("/login", { state: { message: "Registration successful. Please log in." } });
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Account</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="username"
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            name="password"
            placeholder="********"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bio">
            Bio (Optional)
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="bio"
            name="bio"
            placeholder="Tell us about yourself"
            value={formData.bio}
            onChange={handleChange}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </div>
        
        <div className="text-center mt-4">
          Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Log In</Link>
        </div>
      </form>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Check if there's a message from another page (like register)
    const state = window.history.state;
    if (state && state.message) {
      setMessage(state.message);
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await axios.post(
        `${API}/auth/token`,
        new URLSearchParams({
          username: formData.username,
          password: formData.password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      login(
        response.data.access_token,
        response.data.user_id,
        response.data.username
      );
      
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="username"
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            name="password"
            placeholder="********"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Logging In..." : "Sign In"}
          </button>
        </div>
        
        <div className="text-center mt-4">
          Don't have an account? <Link to="/register" className="text-indigo-600 hover:underline">Register</Link>
        </div>
      </form>
    </div>
  );
};

// Main App Pages
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API}/users/me`);
        setUserData(response.data);
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome, {user.username}!</h2>
          
          {userData?.groups && userData.groups.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold mb-3">Your Groups</h3>
              <div className="space-y-3">
                {userData.groups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 bg-gray-50">
                    <Link 
                      to={`/groups/${group.id}`}
                      className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {group.name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">You're not part of any groups yet.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => navigate("/groups/create")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create a Group
                </button>
                <button
                  onClick={() => navigate("/groups/join")}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Join a Group
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">How it Works</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">1</div>
              <div>
                <h3 className="font-semibold">Join or Create a Group</h3>
                <p className="text-gray-600">Form a group with friends (up to 15 people)</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">2</div>
              <div>
                <h3 className="font-semibold">Submit Weekly Activities</h3>
                <p className="text-gray-600">Each member suggests one activity per week</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">3</div>
              <div>
                <h3 className="font-semibold">Complete Daily Challenges</h3>
                <p className="text-gray-600">A random activity is selected each day</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">4</div>
              <div>
                <h3 className="font-semibold">Submit Photo Evidence</h3>
                <p className="text-gray-600">Take a photo to prove you completed the activity</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full w-8 h-8 flex items-center justify-center">5</div>
              <div>
                <h3 className="font-semibold">Vote & Earn Points</h3>
                <p className="text-gray-600">Vote on submissions and climb the leaderboard</p>
              </div>
            </div>
          </div>
          
          {(!userData?.groups || userData.groups.length === 0) && (
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate("/groups/create")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
              >
                Get Started Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    profilePhoto: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({
    isUpdating: false,
    success: false,
    error: ""
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API}/users/me`);
        setUserData(response.data);
        setFormData({
          bio: response.data.bio || "",
          profilePhoto: null
        });
      } catch (err) {
        console.error("Error fetching user profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === "profilePhoto") {
      const file = e.target.files[0];
      setFormData({
        ...formData,
        profilePhoto: file
      });
      
      // Create a preview URL
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateStatus({ isUpdating: true, success: false, error: "" });
    
    try {
      const formDataObj = new FormData();
      formDataObj.append("bio", formData.bio);
      
      if (formData.profilePhoto) {
        formDataObj.append("profile_photo", formData.profilePhoto);
      }
      
      const response = await axios.put(`${API}/users/profile`, formDataObj, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      setUserData({
        ...userData,
        bio: response.data.bio,
        profile_photo_url: response.data.profile_photo_url
      });
      
      setUpdateStatus({ isUpdating: false, success: true, error: "" });
      setIsEditing(false);
      
      // Reset preview
      setPreviewUrl(null);
    } catch (err) {
      console.error("Error updating profile:", err);
      setUpdateStatus({
        isUpdating: false,
        success: false,
        error: err.response?.data?.detail || "Failed to update profile"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
        </div>
        
        <div className="p-6">
          {!isEditing ? (
            <div>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {userData.profile_photo_url ? (
                    <img
                      src={userData.profile_photo_url}
                      alt={userData.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl text-gray-400">{userData.username.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-center md:text-left">{userData.username}</h2>
                  <p className="text-gray-600 mb-4 text-center md:text-left">{userData.email}</p>
                  
                  <div className="bg-gray-50 p-4 rounded mb-4">
                    <h3 className="font-semibold mb-2">Bio</h3>
                    <p className="text-gray-700">
                      {userData.bio || "No bio provided yet."}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Member Since</h3>
                    <p className="text-gray-700">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
                >
                  Edit Profile
                </button>
              </div>
              
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">Your Groups</h3>
                {userData.groups && userData.groups.length > 0 ? (
                  <div className="space-y-2">
                    {userData.groups.map((group) => (
                      <Link
                        key={group.id}
                        to={`/groups/${group.id}`}
                        className="block border rounded p-3 hover:bg-gray-50"
                      >
                        {group.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">You're not part of any groups yet.</p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4 text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mx-auto">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : userData.profile_photo_url ? (
                    <img
                      src={userData.profile_photo_url}
                      alt={userData.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-4xl text-gray-400">{userData.username.charAt(0).toUpperCase()}</div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profilePhoto">
                    Profile Photo
                  </label>
                  <input
                    type="file"
                    id="profilePhoto"
                    name="profilePhoto"
                    onChange={handleChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="4"
                  placeholder="Tell us about yourself"
                ></textarea>
              </div>
              
              {updateStatus.error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {updateStatus.error}
                </div>
              )}
              
              {updateStatus.success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  Profile updated successfully!
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
                  disabled={updateStatus.isUpdating}
                >
                  {updateStatus.isUpdating ? "Saving..." : "Save Changes"}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setPreviewUrl(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded w-full"
                  disabled={updateStatus.isUpdating}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateGroup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/groups`, formData);
      navigate(`/groups/${response.data.id}`);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.response?.data?.detail || "Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Create a New Group</h1>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Group Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="My Awesome Group"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="4"
                placeholder="Tell us about your group..."
              ></textarea>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-indigo-50 rounded">
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <p className="text-gray-700 mb-2">
              After creating your group, you'll get a unique invite code that you can share with friends to join your group.
            </p>
            <p className="text-gray-700">
              Remember, groups are limited to a maximum of 15 members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const JoinGroup = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    if (!inviteCode) {
      setError("Please enter an invite code");
      setIsLoading(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("invite_code", inviteCode);
      
      const response = await axios.post(`${API}/groups/join`, formData);
      navigate(`/groups/${response.data.id}`);
    } catch (err) {
      console.error("Error joining group:", err);
      setError(err.response?.data?.detail || "Failed to join group. Invalid code or other error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Join a Group</h1>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="inviteCode">
                Invite Code
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter 6-character code (e.g., ABC123)"
                maxLength="6"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Group"}
              </button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-indigo-50 rounded">
            <h3 className="font-semibold mb-2">How to Join</h3>
            <p className="text-gray-700">
              Ask your friend for their 6-character group invite code, then enter it above to join their group.
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <p>Don't have a code?</p>
            <button
              onClick={() => navigate("/groups/create")}
              className="text-indigo-600 hover:underline font-medium"
            >
              Create your own group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("activities");
  const [isSelectingActivity, setIsSelectingActivity] = useState(false);

  useEffect(() => {
    // Check if there's a tab preference in the location state
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    
    // Check if there's a notification in the location state
    if (location.state?.notification) {
      setNotification(location.state.notification);
      // Clear notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await axios.get(`${API}/groups/${groupId}`);
        setGroup(response.data);
        
        // Fetch leaderboard
        const leaderboardResponse = await axios.get(`${API}/groups/${groupId}/leaderboard`);
        setLeaderboard(leaderboardResponse.data);
      } catch (err) {
        console.error("Error fetching group:", err);
        setError(err.response?.data?.detail || "Failed to load group data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  const handleSelectDailyActivity = async () => {
    setIsSelectingActivity(true);
    
    try {
      const formData = new FormData();
      formData.append("group_id", groupId);
      
      const response = await axios.post(`${API}/activities/select-daily`, formData);
      
      // Refresh the entire group data to ensure consistency
      const groupResponse = await axios.get(`${API}/groups/${groupId}`);
      setGroup(groupResponse.data);
    } catch (err) {
      console.error("Error selecting activity:", err);
      alert(err.response?.data?.detail || "Failed to select daily activity");
    } finally {
      setIsSelectingActivity(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    alert(`Invite code ${group.invite_code} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {notification && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{notification}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setNotification("")}
          >
            <span className="text-green-500">×</span>
          </button>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="bg-indigo-600 px-6 py-4 flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold text-white">{group.name}</h1>
          <div className="mt-2 md:mt-0 flex items-center">
            <span className="text-indigo-200 mr-2">Invite Code:</span>
            <span className="bg-white text-indigo-800 font-mono font-bold py-1 px-2 rounded">{group.invite_code}</span>
            <button
              onClick={copyInviteCode}
              className="ml-2 bg-indigo-500 hover:bg-indigo-400 text-white p-1 rounded"
              title="Copy to clipboard"
            >
              📋
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {group.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-gray-700">{group.description}</p>
            </div>
          )}
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Members ({group.members.length}/15)</h2>
            <div className="flex flex-wrap gap-2">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 mr-2">
                    {member.profile_photo_url ? (
                      <img
                        src={member.profile_photo_url}
                        alt={member.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm">{member.username}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === "activities"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("activities")}
              >
                Activities
              </button>
              <button
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === "submissions"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("submissions")}
              >
                Today's Challenge
              </button>
              <button
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === "leaderboard"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("leaderboard")}
              >
                Leaderboard
              </button>
            </nav>
          </div>
          
          <div className="mt-6">
            {activeTab === "activities" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Activity Pool</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/groups/${groupId}/activities/new`)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                      Submit Activity
                    </button>
                    {!group.today_activity && (
                      <button
                        onClick={handleSelectDailyActivity}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-sm"
                        disabled={isSelectingActivity}
                      >
                        {isSelectingActivity ? "Selecting..." : "Select Today's Activity"}
                      </button>
                    )}
                  </div>
                </div>
                
                {group.today_activity && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-indigo-800">Today's Challenge</h3>
                      <span className="text-xs text-indigo-600 font-semibold">
                        Selected at {new Date(group.today_activity.selected_for_date).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xl font-semibold mt-2">{group.today_activity.title}</p>
                    {group.today_activity.description && (
                      <p className="text-gray-700 mt-1">{group.today_activity.description}</p>
                    )}
                    <div className="mt-4">
                      <button
                        onClick={() => navigate(`/groups/${groupId}/activities/${group.today_activity.id}/submit`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Submit Photo Evidence
                      </button>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold mb-2">Pending Activities</h3>
                  {group.pending_activities && group.pending_activities.length > 0 ? (
                    <div className="space-y-2">
                      {group.pending_activities.map((activity) => (
                        <div key={activity.id} className="border rounded p-3 bg-gray-50">
                          <p className="font-medium">{activity.title}</p>
                          {activity.description && (
                            <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No pending activities. Submit some!</p>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === "submissions" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Today's Challenge</h2>
                {group.today_activity ? (
                  <div>
                    <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                      <h3 className="font-bold text-lg">{group.today_activity.title}</h3>
                      {group.today_activity.description && (
                        <p className="mt-1">{group.today_activity.description}</p>
                      )}
                      <div className="mt-4">
                        <button
                          onClick={() => navigate(`/groups/${groupId}/activities/${group.today_activity.id}/submit`)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Submit Photo Evidence
                        </button>
                      </div>
                    </div>
                    
                    <SubmissionsList 
                      groupId={groupId} 
                      activityId={group.today_activity.id} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="mb-4">No activity has been selected for today yet.</p>
                    <button
                      onClick={handleSelectDailyActivity}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                      disabled={isSelectingActivity}
                    >
                      {isSelectingActivity ? "Selecting..." : "Select Today's Activity"}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "leaderboard" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Group Leaderboard</h2>
                {leaderboard.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-semibold text-gray-600 uppercase">Score</th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-semibold text-gray-600 uppercase">Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry, index) => (
                          <tr key={entry.user_id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="py-3 px-4 border-b border-gray-200">
                              <div className="flex items-center">
                                {index === 0 && <span className="text-yellow-500 mr-2">🥇</span>}
                                {index === 1 && <span className="text-gray-400 mr-2">🥈</span>}
                                {index === 2 && <span className="text-amber-600 mr-2">🥉</span>}
                                {index > 2 && <span className="w-6 text-center">{index + 1}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 border-b border-gray-200">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 mr-2">
                                  {entry.profile_photo_url ? (
                                    <img
                                      src={entry.profile_photo_url}
                                      alt={entry.username}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs">
                                      {entry.username.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium">{entry.username}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 border-b border-gray-200 text-right font-bold">
                              {entry.score} pts
                            </td>
                            <td className="py-3 px-4 border-b border-gray-200 text-right">
                              {entry.streak > 0 ? (
                                <span className="inline-flex items-center">
                                  <span className="text-orange-500 mr-1">🔥</span>
                                  {entry.streak}
                                </span>
                              ) : (
                                "0"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-6">
                    No scores yet. Complete activities to earn points!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SubmissionsList = ({ groupId, activityId }) => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await axios.get(`${API}/activities/${activityId}/submissions`);
        setSubmissions(response.data);
      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError("Failed to load submissions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [activityId]);

  const handleVote = async (submissionId) => {
    try {
      await axios.post(`${API}/submissions/${submissionId}/vote`);
      
      // Refresh submissions after voting
      const response = await axios.get(`${API}/activities/${activityId}/submissions`);
      setSubmissions(response.data);
    } catch (err) {
      console.error("Error voting:", err);
      alert("Failed to vote on submission");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No submissions yet.</p>
        <div className="mt-4">
          <button
            onClick={() => navigate(`/groups/${groupId}/activities/${activityId}/submit`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Be the First to Submit!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold mb-2">Submissions</h3>
      
      {submissions.map((submission) => (
        <div key={submission.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 mr-2">
                {submission.profile_photo_url ? (
                  <img
                    src={submission.profile_photo_url}
                    alt={submission.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">
                    {submission.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium">{submission.username}</div>
                <div className="text-xs text-gray-500">
                  {new Date(submission.submitted_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <img
                src={submission.photo_url}
                alt="Activity submission"
                className="w-full h-64 object-cover rounded"
              />
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => handleVote(submission.id)}
                className={`flex items-center space-x-1 px-3 py-1 rounded ${
                  submission.votes.includes(user.userId)
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                <span>{submission.votes.includes(user.userId) ? "★" : "☆"}</span>
                <span>{submission.vote_count} vote{submission.vote_count !== 1 ? "s" : ""}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SubmitActivity = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Basic validation
    if (!formData.title.trim()) {
      setError("Activity title is required");
      setIsLoading(false);
      return;
    }
    
    try {
      await axios.post(`${API}/activities`, {
        ...formData,
        group_id: groupId
      });
      
      navigate(`/groups/${groupId}`, { 
        state: { 
          activeTab: "activities",
          notification: "Activity submitted successfully! It can now be selected for a daily challenge."
        }
      });
    } catch (err) {
      console.error("Error submitting activity:", err);
      setError(err.response?.data?.detail || "Failed to submit activity. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Submit a New Activity</h1>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Activity Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="e.g., Morning Jog, Cook a New Recipe"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="4"
                placeholder="Add any details or instructions..."
              ></textarea>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit Activity"}
              </button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-indigo-50 rounded">
            <h3 className="font-semibold mb-2">Activity Tips</h3>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Keep activities fun and engaging</li>
              <li>Consider different skill levels in your group</li>
              <li>Activities should be completable within a day</li>
              <li>Make sure it's something that can be photographed as evidence</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubmitPhoto = () => {
  const { groupId, activityId } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    const fetchActivityDetails = async () => {
      try {
        // Get the group data which includes today's activity
        const response = await axios.get(`${API}/groups/${groupId}`);
        if (response.data.today_activity && response.data.today_activity.id === activityId) {
          setActivity(response.data.today_activity);
        } else {
          setError("Invalid activity or not today's challenge");
        }
      } catch (err) {
        console.error("Error fetching activity details:", err);
        setError("Failed to load activity details");
      }
    };

    fetchActivityDetails();
  }, [groupId, activityId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!photo) {
      setError("Please select a photo to upload");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append("activity_id", activityId);
      formData.append("photo", photo);
      
      await axios.post(`${API}/submissions`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      // Redirect to the group page with the submissions tab active
      navigate(`/groups/${groupId}`, { state: { activeTab: "submissions" } });
    } catch (err) {
      console.error("Error submitting photo:", err);
      if (err.response?.status === 400 && err.response?.data?.detail === "Already submitted for this activity") {
        setError("You've already submitted a photo for this activity.");
      } else if (err.response?.status === 400 && err.response?.data?.detail === "Activity has not been selected for a challenge day") {
        setError("This activity hasn't been selected for today's challenge.");
      } else {
        setError(err.response?.data?.detail || "Failed to submit photo. Please try again.");
      }
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Group
          </button>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Submit Photo Evidence</h1>
        </div>
        
        <div className="p-6">
          <div className="mb-6 bg-indigo-50 p-4 rounded">
            <h2 className="font-bold text-lg">{activity.title}</h2>
            {activity.description && <p className="mt-1">{activity.description}</p>}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="photo">
                Your Photo
              </label>
              
              {previewUrl ? (
                <div className="mb-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded border"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-4">
                  <div className="text-gray-600 mb-2">📷 No photo selected</div>
                  <div className="text-sm text-gray-500">Click below to choose a photo</div>
                </div>
              )}
              
              <input
                type="file"
                id="photo"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={isLoading || !photo}
              >
                {isLoading ? "Uploading..." : "Submit Evidence"}
              </button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-indigo-50 rounded">
            <h3 className="font-semibold mb-2">Submission Guidelines</h3>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Photo must clearly show you completing the activity</li>
              <li>Make sure the image is clear and well-lit</li>
              <li>Photos are timestamped when submitted</li>
              <li>Group members will vote on submissions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App min-h-screen bg-gray-100">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute element={<Home />} />} />
            <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />
            <Route path="/groups/create" element={<PrivateRoute element={<CreateGroup />} />} />
            <Route path="/groups/join" element={<PrivateRoute element={<JoinGroup />} />} />
            <Route path="/groups/:groupId" element={<PrivateRoute element={<GroupDetail />} />} />
            <Route path="/groups/:groupId/activities/new" element={<PrivateRoute element={<SubmitActivity />} />} />
            <Route path="/groups/:groupId/activities/:activityId/submit" element={<PrivateRoute element={<SubmitPhoto />} />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
