import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";
import "./App.css";
import { ActifyFeatures } from "./AppFeatures";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create an authentication context
const AuthContext = React.createContext();

// Authentication hook
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
      console.log("User session restored from localStorage", { token, userId, username });
    } else {
      console.log("No user session found in localStorage");
    }
    setLoading(false);
  }, []);

  const login = (token, userId, username) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username);
    console.log("Saved to localStorage:", { token, userId, username });
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

  const authContextValue = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Route guard for authenticated routes
const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return element;
};

// Utils
const formatDate = (dateString) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Custom Hooks
const useFormInput = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  
  const handleChange = (e) => {
    setValue(e.target.value);
  };
  
  return {
    value,
    onChange: handleChange,
  };
};

// Reusable Components
const Button = ({ onClick, disabled, children, className }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className || ""}`}
    >
      {children}
    </button>
  );
};

const FormInput = ({ label, type = "text", ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={props.id}>
        {label}
      </label>
      <input
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        type={type}
        {...props}
      />
    </div>
  );
};

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ src, alt, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };
  
  return (
    <div className={`${sizeClasses[size]} overflow-hidden rounded-full bg-gray-200`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
          {alt ? alt.charAt(0).toUpperCase() : "U"}
        </div>
      )}
    </div>
  );
};

const Loader = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Main App Pages
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [featuredChallenges, setFeaturedChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // If user is logged in, fetch their data
        if (user) {
          try {
            const userResponse = await axios.get(`${API}/users/me`);
            setUserData(userResponse.data);
          } catch (userErr) {
            console.error("Error fetching user data:", userErr);
            // Don't set global error for just user data
          }
        }
        
        // Fetch top users
        try {
          const topUsersResponse = await axios.get(`${API}/users/top`);
          setTopUsers(topUsersResponse.data || []);
        } catch (topUsersErr) {
          console.error("Error fetching top users:", topUsersErr);
          setTopUsers([]);
        }
        
        // Fetch featured challenges
        try {
          const challengesResponse = await axios.get(`${API}/challenges/featured`);
          setFeaturedChallenges(challengesResponse.data || []);
        } catch (challengesErr) {
          console.error("Error fetching featured challenges:", challengesErr);
          setFeaturedChallenges([]);
        }

        // No global error set, just using empty arrays for missing data
        setError(null);
      } catch (err) {
        console.error("Global error fetching home data:", err);
        setError("Failed to load some data. The application will still work with limited functionality.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHomeData();
  }, [user]);

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
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-center font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Hero Section */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-900 mb-6">
            Daily Challenges, <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Real Connections</span>
          </h1>
          
          <p className="text-lg text-gray-700 mb-8">
            ACTIFY brings friends together through daily challenges and activities. Compete, share, and build lasting connections through shared experiences.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
              <button
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                Join Now
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-white border-2 border-indigo-600 text-indigo-600 font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:bg-indigo-50 transition-all duration-300"
              >
                Log In
              </button>
            </div>
          )}
          
          {user && userData && (
            <div className="mb-12">
              <div className="bg-white border border-indigo-100 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-200 flex items-center">
                <Avatar src={userData.profile_photo_url} alt={userData.username} size="md" />
                <div className="ml-4">
                  <p className="font-bold text-indigo-900">Welcome back, {userData.username}!</p>
                  <p className="text-sm text-gray-600">Current streak: {userData.streak} days</p>
                </div>
                <button
                  onClick={() => navigate("/challenges/today")}
                  className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                >
                  Today's Challenge
                </button>
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 bg-white rounded-lg shadow-md p-6 border border-indigo-100">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-indigo-600">100K+</div>
              <div className="text-gray-600 text-sm md:text-base">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-indigo-600">2.5M+</div>
              <div className="text-gray-600 text-sm md:text-base">Challenges Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-indigo-600">15K+</div>
              <div className="text-gray-600 text-sm md:text-base">Groups Created</div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Featured Image */}
        <div className="relative flex justify-center items-center">
          <div className="relative w-full h-80 md:h-96 lg:h-[32rem] rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/30 z-10"></div>
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1784&q=80"
              alt="People enjoying activities together"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-20">
              <h3 className="font-bold text-indigo-900">Trending Challenge</h3>
              <p className="text-gray-700">"Strike a yoga pose in the most unexpected place!"</p>
            </div>
          </div>
          
          {/* Floating elements */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-400 rounded-full opacity-20"></div>
          <div className="absolute -bottom-14 -left-14 w-40 h-40 bg-indigo-600 rounded-full opacity-10"></div>
        </div>
      </div>
      
      {/* How it works section */}
      <div className="mt-20">
        <div className="bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-50 rounded-xl shadow-xl p-10 border border-indigo-200 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-300 to-transparent rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-purple-300 to-transparent rounded-full opacity-20 transform -translate-x-20 translate-y-20"></div>
          
          <h2 className="text-3xl font-extrabold mb-10 text-center text-indigo-900 relative">
            <span className="relative inline-block">
              How ACTIFY Works
              <span className="absolute -bottom-3 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"></span>
            </span>
          </h2>
          
          <div className="grid md:grid-cols-5 gap-4">
            {/* Step 1 */}
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-indigo-600 flex flex-col items-center text-center h-full">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0 shadow-lg mb-4">1</div>
              <h3 className="font-bold text-lg text-indigo-900 mb-2">Join or Create a Group</h3>
              <p className="text-gray-600 mt-1 mb-4">Form a group with friends (up to 15 people)</p>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mt-auto text-indigo-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            {/* Step 2 */}
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-indigo-600 flex flex-col items-center text-center h-full">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0 shadow-lg mb-4">2</div>
              <h3 className="font-bold text-lg text-indigo-900 mb-2">Submit Weekly Activities</h3>
              <p className="text-gray-600 mt-1 mb-4">Each member suggests one activity per week</p>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mt-auto text-indigo-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            
            {/* Step 3 */}
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-indigo-600 flex flex-col items-center text-center h-full">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0 shadow-lg mb-4">3</div>
              <h3 className="font-bold text-lg text-indigo-900 mb-2">Complete Daily Challenges</h3>
              <p className="text-gray-600 mt-1 mb-4">A random activity is selected each day</p>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mt-auto text-indigo-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905A3.61 3.61 0 018.5 7.5" />
              </svg>
            </div>
            
            {/* Step 4 */}
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-indigo-600 flex flex-col items-center text-center h-full">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0 shadow-lg mb-4">4</div>
              <h3 className="font-bold text-lg text-indigo-900 mb-2">Submit Photo Evidence</h3>
              <p className="text-gray-600 mt-1 mb-4">Take a photo to prove you completed the activity</p>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mt-auto text-indigo-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            {/* Step 5 */}
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-indigo-600 flex flex-col items-center text-center h-full">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0 shadow-lg mb-4">5</div>
              <h3 className="font-bold text-lg text-indigo-900 mb-2">Vote & Earn Points</h3>
              <p className="text-gray-600 mt-1 mb-4">Vote on submissions and climb the leaderboard</p>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mt-auto text-indigo-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          
          {(!userData?.groups || userData?.groups.length === 0) && (
            <div className="mt-10 text-center">
              <button
                onClick={() => navigate("/groups/create")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-lg"
              >
                Get Started Now →
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* ActifyFeatures component */}
      <ActifyFeatures />
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
    profilePhoto: null,
    interests: []
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({
    isUpdating: false,
    success: false,
    error: ""
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.userId) {
        setIsLoading(false);
        setError("User ID not found. Please log in again.");
        return;
      }

      try {
        const response = await axios.get(`${API}/users/me`);
        
        if (response.data) {
          setUserData(response.data);
          setFormData({
            bio: response.data.bio || "",
            profilePhoto: null,
            interests: response.data.interests || []
          });
        } else {
          setError("User data not found");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(`Error loading profile: ${err.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user?.userId]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === "file" && name === "profilePhoto") {
      const file = e.target.files[0];
      
      if (file) {
        setFormData({
          ...formData,
          profilePhoto: file
        });
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleInterestChange = (e) => {
    const interest = e.target.value;
    if (e.target.checked) {
      setFormData({
        ...formData,
        interests: [...formData.interests, interest]
      });
    } else {
      setFormData({
        ...formData,
        interests: formData.interests.filter(item => item !== interest)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateStatus({ isUpdating: true, success: false, error: "" });

    try {
      const dataToUpdate = {
        bio: formData.bio,
        interests: formData.interests
      };
      
      // Update user data
      const response = await axios.put(`${API}/users/me`, dataToUpdate);
      
      // If there's a profile photo to upload
      if (formData.profilePhoto) {
        const formObj = new FormData();
        formObj.append("profile_photo", formData.profilePhoto);
        
        // Upload photo
        await axios.post(`${API}/users/me/photo`, formObj, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      }
      
      // Fetch updated user data
      const updatedUserResponse = await axios.get(`${API}/users/me`);
      setUserData(updatedUserResponse.data);
      
      setUpdateStatus({
        isUpdating: false,
        success: true,
        error: ""
      });
      
      setIsEditing(false);
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

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-center font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-center font-medium">User profile data could not be loaded.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
          >
            Reload Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 relative">
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="absolute top-4 right-4 bg-white text-indigo-600 font-bold py-2 px-4 rounded shadow-md hover:bg-indigo-50"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="-mt-16 md:-mt-20">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {isEditing && previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover"
                  />
                ) : userData?.profile_photo_url ? (
                  <img
                    src={userData?.profile_photo_url}
                    alt={userData?.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-gray-400">{userData?.username?.charAt(0).toUpperCase() || '?'}</div>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              {!isEditing ? (
                <>
                  <h2 className="text-2xl font-bold text-center md:text-left">{userData?.username || 'User'}</h2>
                  <p className="text-gray-600 mb-4 text-center md:text-left">{userData?.email || 'No email provided'}</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Bio</h3>
                        <p className="text-gray-700">
                          {userData?.bio || "No bio provided yet."}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Member Since</h3>
                        <p className="text-gray-700">
                          {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Interests</h3>
                        {userData?.interests && userData.interests.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {userData.interests.map((interest, index) => (
                              <span key={index} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                                {interest}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-700">No interests selected yet.</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Stats</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-sm text-gray-600">Streak</p>
                            <p className="font-bold text-indigo-600">{userData?.streak || 0} days</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-sm text-gray-600">Points</p>
                            <p className="font-bold text-indigo-600">{userData?.total_points || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-sm text-gray-600">Challenges</p>
                            <p className="font-bold text-indigo-600">{userData?.completed_challenges || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Profile Photo
                    </label>
                    <input 
                      type="file" 
                      name="profilePhoto" 
                      onChange={handleChange}
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Bio
                    </label>
                    <textarea 
                      name="bio" 
                      value={formData.bio} 
                      onChange={handleChange}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      rows="4"
                      placeholder="Tell us about yourself..."
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Interests
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Fitness', 'Outdoors', 'Art', 'Food', 'Travel', 'Music', 'Reading', 'Technology', 'Sports'].map((interest) => (
                        <div key={interest} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`interest-${interest}`}
                            name="interests"
                            value={interest}
                            checked={formData.interests.includes(interest)}
                            onChange={handleInterestChange}
                            className="mr-2"
                          />
                          <label htmlFor={`interest-${interest}`}>{interest}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {updateStatus.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                      {updateStatus.error}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateStatus.isUpdating}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
                    >
                      {updateStatus.isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
          {/* Placeholder for activity history */}
          <p className="text-gray-500 italic">Activity history will appear here.</p>
        </div>
        
        {/* Group Membership */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Your Groups</h3>
          {/* Placeholder for groups */}
          <p className="text-gray-500 italic">Your groups will appear here.</p>
        </div>
      </div>
    </div>
  );
};

const Groups = () => {
  const { user } = useAuth();
  const [userGroups, setUserGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Fetch user's groups
        const userGroupsResponse = await axios.get(`${API}/groups/user`);
        setUserGroups(userGroupsResponse.data || []);
        
        // Fetch public groups
        const publicGroupsResponse = await axios.get(`${API}/groups/public`);
        setPublicGroups(publicGroupsResponse.data || []);
      } catch (err) {
        console.error("Error fetching groups:", err);
        setError(err.response?.data?.detail || "Failed to load group data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroups();
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
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Groups</h1>
        <Link
          to="/groups/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Group
        </Link>
      </div>
      
      {userGroups.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-8">
          <p>You are not a member of any groups yet. Join an existing group or create a new one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {userGroups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              <div className="p-4">
                <h2 className="text-xl font-bold mb-2">{group.name}</h2>
                <p className="text-gray-600 mb-2">{group.members.length} members</p>
                <p className="text-gray-700 line-clamp-2">{group.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      <h2 className="text-xl font-bold mb-4">Public Groups</h2>
      {publicGroups.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-500 italic">No public groups available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicGroups.map((group) => (
            <div 
              key={group.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              <div className="h-24 bg-gradient-to-r from-gray-300 to-gray-400"></div>
              <div className="p-4">
                <h2 className="text-lg font-bold mb-2">{group.name}</h2>
                <p className="text-gray-600 mb-2">{group.members.length} members</p>
                <p className="text-gray-700 line-clamp-2 mb-4">{group.description}</p>
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-4 rounded text-sm"
                  // Join group functionality would go here
                >
                  Join Group
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CreateGroup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/groups`, formData);
      navigate(`/groups/${response.data.id}`);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.response?.data?.detail || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Create a New Group</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="name">
              Group Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows="4"
              required
            ></textarea>
          </div>
          
          <div className="flex items-center">
            <input
              id="isPrivate"
              name="isPrivate"
              type="checkbox"
              checked={formData.isPrivate}
              onChange={handleChange}
              className="mr-2"
            />
            <label className="text-gray-700" htmlFor="isPrivate">
              Private Group (invitation only)
            </label>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
              {error}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/groups")}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GroupDetail = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await axios.get(`${API}/groups/${groupId}`);
        setGroup(response.data);
      } catch (err) {
        console.error("Error fetching group details:", err);
        setError(err.response?.data?.detail || "Failed to load group data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [groupId]);
  
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
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white">{group.name}</h1>
            <p className="text-white opacity-80">{group.members.length} members</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">About</h2>
            <p className="text-gray-700">{group.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Members</h2>
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center bg-gray-50 p-2 rounded">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      {member.profile_photo_url ? (
                        <img src={member.profile_photo_url} alt={member.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{member.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{member.username}</p>
                      {member.id === group.owner_id && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-4">This Week's Activities</h2>
              {group.activities && group.activities.length > 0 ? (
                <div className="space-y-3">
                  {group.activities.map((activity) => (
                    <div key={activity.id} className="bg-gray-50 p-3 rounded">
                      <p className="font-semibold">{activity.title}</p>
                      <p className="text-gray-600 text-sm">{activity.description}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Suggested by {activity.author_username}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          activity.status === 'selected' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status === 'selected' ? 'Selected' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No activities suggested for this week yet.</p>
              )}
              
              <div className="mt-4">
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
                  // Suggest activity functionality would go here
                >
                  Suggest an Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Challenges = () => {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [pastChallenges, setPastChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        // Fetch active challenges
        const activeResponse = await axios.get(`${API}/challenges/active`);
        setActiveChallenges(activeResponse.data || []);
        
        // Fetch past challenges
        const pastResponse = await axios.get(`${API}/challenges/history`);
        setPastChallenges(pastResponse.data || []);
      } catch (err) {
        console.error("Error fetching challenges:", err);
        setError(err.response?.data?.detail || "Failed to load challenge data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChallenges();
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
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Challenges</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Today's Challenge</h2>
        {activeChallenges.find(c => c.is_today) ? (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
            <h3 className="font-bold text-lg text-indigo-900 mb-2">
              {activeChallenges.find(c => c.is_today).title}
            </h3>
            <p className="text-gray-700 mb-4">
              {activeChallenges.find(c => c.is_today).description}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Ends in: {activeChallenges.find(c => c.is_today).time_remaining}
              </span>
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                // Submit evidence functionality would go here
              >
                Submit Evidence
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">No challenge active today.</p>
        )}
      </div>
      
      <h2 className="text-xl font-bold mb-4">Upcoming Challenges</h2>
      {activeChallenges.filter(c => !c.is_today).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {activeChallenges.filter(c => !c.is_today).map((challenge) => (
            <div key={challenge.id} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-lg mb-2">{challenge.title}</h3>
              <p className="text-gray-700 mb-2">{challenge.description}</p>
              <p className="text-sm text-gray-600">Starts: {formatDate(challenge.start_date)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic mb-12">No upcoming challenges.</p>
      )}
      
      <h2 className="text-xl font-bold mb-4">Past Challenges</h2>
      {pastChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastChallenges.map((challenge) => (
            <div key={challenge.id} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-lg mb-2">{challenge.title}</h3>
              <p className="text-gray-700 mb-2">{challenge.description}</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Date: {formatDate(challenge.date)}</p>
                {challenge.completed ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                    Missed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No past challenges.</p>
      )}
    </div>
  );
};

const Leaderboard = () => {
  const [globalLeaders, setGlobalLeaders] = useState([]);
  const [friendLeaders, setFriendLeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Fetch global leaderboard
        const globalResponse = await axios.get(`${API}/leaderboard/global`);
        setGlobalLeaders(globalResponse.data || []);
        
        // Fetch friends leaderboard
        const friendsResponse = await axios.get(`${API}/leaderboard/friends`);
        setFriendLeaders(friendsResponse.data || []);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err.response?.data?.detail || "Failed to load leaderboard data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeaderboard();
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
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Global Leaders</h2>
          {globalLeaders.length > 0 ? (
            <div className="space-y-3">
              {globalLeaders.map((user, index) => (
                <div 
                  key={user.id} 
                  className={`flex items-center p-3 rounded-lg ${
                    index < 3 ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100' : 'bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center font-bold text-indigo-600 mr-3">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                    {user.profile_photo_url ? (
                      <img src={user.profile_photo_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-xs text-gray-600">Streak: {user.streak} days</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{user.total_points} pts</p>
                    <p className="text-xs text-gray-600">{user.completed_challenges} challenges</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No global leaderboard data available.</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Friend Leaders</h2>
          {friendLeaders.length > 0 ? (
            <div className="space-y-3">
              {friendLeaders.map((user, index) => (
                <div 
                  key={user.id} 
                  className={`flex items-center p-3 rounded-lg ${
                    index < 3 ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100' : 'bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center font-bold text-indigo-600 mr-3">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                    {user.profile_photo_url ? (
                      <img src={user.profile_photo_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-xs text-gray-600">Streak: {user.streak} days</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{user.total_points} pts</p>
                    <p className="text-xs text-gray-600">{user.completed_challenges} challenges</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No friend leaderboard data available. Add friends to see their rankings.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      // Register user
      const response = await axios.post(`${API}/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name
      });
      
      // Get token
      const tokenResponse = await axios.post(`${API}/auth/token`, 
        new URLSearchParams({
          'username': formData.username,
          'password': formData.password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Login user
      login(
        tokenResponse.data.access_token,
        tokenResponse.data.user_id,
        tokenResponse.data.username
      );
      
      // Redirect to home
      navigate("/");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Join ACTIFY</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              minLength="8"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
            >
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800">
                Log In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const from = location.state?.from?.pathname || "/";
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/auth/token`, 
        new URLSearchParams({
          'username': formData.username,
          'password': formData.password
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
      
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome Back</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
            >
              {isSubmitting ? "Logging In..." : "Log In"}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-800">
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <h1 className="text-5xl font-bold text-indigo-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate("/")}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg"
      >
        Go Home
      </button>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-md">
            <div className="container mx-auto px-4">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link to="/" className="text-2xl font-bold text-indigo-600">
                    ACTIFY
                  </Link>
                </div>
                
                <div className="flex items-center">
                  <HeaderLinks />
                </div>
              </div>
            </div>
          </nav>
          
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />
              <Route path="/groups" element={<PrivateRoute element={<Groups />} />} />
              <Route path="/groups/create" element={<PrivateRoute element={<CreateGroup />} />} />
              <Route path="/groups/:groupId" element={<PrivateRoute element={<GroupDetail />} />} />
              <Route path="/challenges" element={<PrivateRoute element={<Challenges />} />} />
              <Route path="/leaderboard" element={<PrivateRoute element={<Leaderboard />} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          
          <footer className="bg-gray-800 text-white py-8">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4">ACTIFY</h3>
                  <p className="text-gray-300">
                    Daily challenges to connect with friends and build lasting habits.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/" className="text-gray-300 hover:text-white">
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link to="/groups" className="text-gray-300 hover:text-white">
                        Groups
                      </Link>
                    </li>
                    <li>
                      <Link to="/challenges" className="text-gray-300 hover:text-white">
                        Challenges
                      </Link>
                    </li>
                    <li>
                      <Link to="/leaderboard" className="text-gray-300 hover:text-white">
                        Leaderboard
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Connect With Us</h3>
                  <div className="flex space-x-4">
                    <a href="#" className="text-gray-300 hover:text-white">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a href="#" className="text-gray-300 hover:text-white">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a href="#" className="text-gray-300 hover:text-white">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} ACTIFY. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Additional Components
const HeaderLinks = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  return (
    <div className="hidden md:flex items-center space-x-4">
      <Link to="/" className="px-3 py-2 text-gray-700 hover:text-indigo-600">
        Home
      </Link>
      
      {isAuthenticated ? (
        <>
          <Link to="/groups" className="px-3 py-2 text-gray-700 hover:text-indigo-600">
            Groups
          </Link>
          <Link to="/challenges" className="px-3 py-2 text-gray-700 hover:text-indigo-600">
            Challenges
          </Link>
          <Link to="/leaderboard" className="px-3 py-2 text-gray-700 hover:text-indigo-600">
            Leaderboard
          </Link>
          <Link to="/profile" className="px-3 py-2 text-gray-700 hover:text-indigo-600">
            Profile
          </Link>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="px-3 py-2 text-gray-700 hover:text-red-600"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="px-3 py-2 text-gray-700 hover:text-indigo-600">
            Login
          </Link>
          <Link 
            to="/register" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            Sign Up
          </Link>
        </>
      )}
    </div>
  );
};

export default App;
