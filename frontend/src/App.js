import { useState, useEffect, useRef } from "react";
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
const SafeImage = ({ src, alt, className, fallbackClassName, children }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Attempt to load image from URL and potentially add CORS parameters
  const fullImageUrl = src && !src.includes('?') ? `${src}?${new Date().getTime()}` : src;
  
  const handleImageError = () => {
    console.error(`Failed to load image: ${src}`);
    setImgError(true);
  };
  
  const handleImageLoad = () => {
    setImgLoaded(true);
  };
  
  return (
    <>
      {src && !imgError ? (
        <img
          src={fullImageUrl}
          alt={alt || "Image"}
          className={className}
          style={{ display: imgLoaded ? "block" : "none" }}
          onError={handleImageError}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
      ) : (
        <div className={fallbackClassName || className}>
          {children || (
            <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-400">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-1/3 w-1/3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {src && !imgLoaded && !imgError && (
        <div className={`${className} absolute inset-0 flex items-center justify-center bg-gray-100`}>
          <div className="spinner"></div>
        </div>
      )}
    </>
  );
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const notificationRef = useRef(null);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (showNotifications && notifications.length === 0) {
        setIsLoading(true);
        try {
          const response = await axios.get(`${API}/notifications`);
          setNotifications(response.data);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();
  }, [showNotifications]);

  const handleNotificationClick = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/mark-read/${notificationId}`);
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/mark-all-read`);
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-white hover:bg-indigo-500 rounded-full focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-10">
          <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="py-4 text-center text-gray-500">
                <div className="spinner mx-auto"></div>
                <p className="mt-1">Loading...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b hover:bg-gray-50 ${notification.read ? 'bg-white' : 'bg-indigo-50'}`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <p>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold flex items-center">
          <span className="bg-white text-indigo-600 rounded-lg p-1 mr-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          ACTIFY
        </Link>
        <div className="space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <Link to="/profile" className="hover:text-indigo-200 transition-colors duration-200 flex items-center bg-indigo-600 bg-opacity-40 px-3 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{user.username}</span>
              </Link>
              <button 
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full shadow-sm hover:shadow transition-all duration-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link to="/login" className="bg-indigo-600 bg-opacity-40 px-4 py-1 rounded-full hover:bg-opacity-60 transition-all duration-200">Login</Link>
              <Link to="/register" className="bg-white text-indigo-700 px-4 py-1 rounded-full shadow-sm hover:shadow-md transition-all duration-200">Register</Link>
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
      <h1 className="text-3xl font-bold mb-6 text-center">Join ACTIFY</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4 border border-gray-100">
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full shadow-md hover:shadow-lg transition-all duration-200"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              "Sign Up"
            )}
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
      <h1 className="text-3xl font-bold mb-6 text-center">Login to ACTIFY</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{message}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4 border border-gray-100">
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full shadow-md hover:shadow-lg transition-all duration-200"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging In...
              </span>
            ) : (
              "Sign In"
            )}
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
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
            <h2 className="text-2xl font-bold">Welcome to ACTIFY, {user.username}!</h2>
          </div>
          <div className="p-6">
          
          {userData?.groups && userData.groups.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Groups</h3>
              <div className="space-y-3">
                {userData.groups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-white transition-all duration-200 hover:shadow-md transform hover:-translate-y-1">
                    <Link 
                      to={`/groups/${group.id}`}
                      className="text-lg font-medium text-indigo-600 hover:text-indigo-800 flex justify-between items-center"
                    >
                      <span>{group.name}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={() => navigate("/groups/create")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create New Group
                </button>
                <button
                  onClick={() => navigate("/groups/join")}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  Join a Group
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-b from-gray-50 to-white rounded-lg border-2 border-dashed border-gray-300">
              <div className="inline-block p-6 bg-indigo-100 text-indigo-600 rounded-full mb-4 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-xl font-semibold mb-2">You're not part of any groups yet</p>
              <p className="text-gray-600 mb-8 px-4">Create a group or join an existing one to get started with challenges</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
                <button
                  onClick={() => navigate("/groups/create")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create a Group
                </button>
                <button
                  onClick={() => navigate("/groups/join")}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  Join a Group
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
        
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
          
          {(!userData?.groups || userData.groups.length === 0) && (
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API}/users/me`);
        setUserData(response.data);
        setFormData({
          bio: response.data.bio || "",
          profilePhoto: null,
          interests: response.data.interests || []
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
      
      // Add interests as a comma-separated string
      if (formData.interests && formData.interests.length > 0) {
        formDataObj.append("interests", formData.interests.join(","));
      }
      
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
        profile_photo_url: response.data.profile_photo_url,
        interests: response.data.interests || []
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
          <h1 className="text-2xl font-bold text-white">My ACTIFY Profile</h1>
        </div>
        
        <div className="p-6">
          {!isEditing ? (
            <div>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {userData?.profile_photo_url ? (
                    <img
                      src={userData.profile_photo_url}
                      alt={userData?.username || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl text-gray-400">{userData?.username?.charAt(0).toUpperCase() || '?'}</div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-center md:text-left">{userData?.username || 'User'}</h2>
                  <p className="text-gray-600 mb-4 text-center md:text-left">{userData?.email || 'No email provided'}</p>
                  
                  <div className="bg-gray-50 p-4 rounded mb-4">
                    <h3 className="font-semibold mb-2">Bio</h3>
                    <p className="text-gray-700">
                      {userData?.bio || "No bio provided yet."}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded mb-4">
                    <h3 className="font-semibold mb-2">Interests</h3>
                    {userData.interests && userData.interests.length > 0 ? (
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
                  ) : userData?.profile_photo_url ? (
                    <img
                      src={userData.profile_photo_url}
                      alt={userData?.username || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-4xl text-gray-400">{userData?.username?.charAt(0).toUpperCase() || '?'}</div>
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
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {userData.available_interests ? (
                    userData.available_interests.map((interest, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const isSelected = formData.interests.includes(interest);
                          if (isSelected) {
                            // Remove interest if already selected
                            setFormData({
                              ...formData,
                              interests: formData.interests.filter(i => i !== interest)
                            });
                          } else {
                            // Add interest if not selected
                            setFormData({
                              ...formData,
                              interests: [...formData.interests, interest]
                            });
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.interests.includes(interest) 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {interest}
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Loading interests...</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Select your interests to better personalize your experience
                </p>
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
          <h1 className="text-2xl font-bold text-white">Create a New ACTIFY Group</h1>
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
          <h1 className="text-2xl font-bold text-white">Join an ACTIFY Group</h1>
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
      
      // Show notification
      setNotification("Today's activity has been selected successfully!");
      
      // Automatically switch to the submissions tab
      setActiveTab("submissions");
    } catch (err) {
      console.error("Error selecting activity:", err);
      setError(err.response?.data?.detail || "Failed to select daily activity");
    } finally {
      setIsSelectingActivity(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setNotification(`Invite code ${group.invite_code} copied to clipboard!`);
    
    // Clear the notification after 3 seconds
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };
  
  const handlePromoteToAdmin = async (userId) => {
    try {
      const response = await axios.post(`${API}/groups/${groupId}/admins/${userId}/add`);
      setNotification("User promoted to admin successfully!");
      
      // Refresh group data
      const groupResponse = await axios.get(`${API}/groups/${groupId}`);
      setGroup(groupResponse.data);
    } catch (err) {
      console.error("Error promoting to admin:", err);
      setError(err.response?.data?.detail || "Failed to promote user to admin");
    }
  };
  
  const handleRemoveMember = async (userId) => {
    if (window.confirm("Are you sure you want to remove this member from the group?")) {
      try {
        const response = await axios.post(`${API}/groups/${groupId}/members/${userId}/remove`);
        setNotification("Member removed successfully!");
        
        // Refresh group data
        const groupResponse = await axios.get(`${API}/groups/${groupId}`);
        setGroup(groupResponse.data);
      } catch (err) {
        console.error("Error removing member:", err);
        setError(err.response?.data?.detail || "Failed to remove member");
      }
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
                <div key={member.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1 group relative">
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
                  
                  {/* Admin badge */}
                  {group.admins && group.admins.includes(member.id) && (
                    <span className="ml-1 text-xs bg-indigo-200 text-indigo-800 px-1 rounded">
                      Admin
                    </span>
                  )}
                  
                  {/* Admin controls - only show if current user is an admin */}
                  {group.admins && group.admins.includes(user.userId) && member.id !== user.userId && (
                    <div className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 h-full flex items-center">
                      <div className="ml-2 bg-white shadow-md rounded-md border border-gray-200 z-10">
                        {group.admins && !group.admins.includes(member.id) ? (
                          <button
                            onClick={() => handlePromoteToAdmin(member.id)}
                            className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b border-gray-200"
                          >
                            Make Admin
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-gray-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
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
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-600 uppercase">Badges</th>
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
                                
                                {entry.previous_rank > 0 && entry.rank < entry.previous_rank && (
                                  <span className="ml-1 text-green-600 text-xs">
                                    ↑{entry.previous_rank - entry.rank}
                                  </span>
                                )}
                                {entry.previous_rank > 0 && entry.rank > entry.previous_rank && (
                                  <span className="ml-1 text-red-600 text-xs">
                                    ↓{entry.rank - entry.previous_rank}
                                  </span>
                                )}
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
                                <div>
                                  <span className="font-medium">{entry.username}</span>
                                  {entry.submissions_count > 0 && (
                                    <div className="text-xs text-gray-500">
                                      {entry.submissions_count} submission{entry.submissions_count !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
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
                            <td className="py-3 px-4 border-b border-gray-200 text-center">
                              <div className="flex justify-center space-x-1">
                                {entry.badges && entry.badges.map((badge, idx) => {
                                  let badgeEmoji = "🏆";
                                  if (badge === "regular") badgeEmoji = "⭐";
                                  if (badge === "committed") badgeEmoji = "💪";
                                  if (badge === "champion") badgeEmoji = "👑";
                                  
                                  return (
                                    <span 
                                      key={idx} 
                                      className="tooltip" 
                                      title={badge}
                                    >
                                      {badgeEmoji}
                                    </span>
                                  );
                                })}
                              </div>
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
            
            <div className="mb-3 relative">
              <SafeImage
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
    description: "",
    emoji: "",
    difficulty: "medium",
    deadline_days: 7
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Common emoji options
  const popularEmojis = [
    "🏃‍♂️", "🏋️‍♀️", "🧘‍♀️", "🚴‍♀️", "🥗", "🍎", "📚", "🎨", "🎭", 
    "🎸", "🧠", "💰", "👨‍👩‍👧‍👦", "❤️", "🌱", "🌊", "🏔️", "🧹", "✍️"
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleEmojiSelect = (emoji) => {
    setFormData({
      ...formData,
      emoji
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
      // Create FormData object for the multipart/form-data request
      const requestData = new FormData();
      requestData.append("title", formData.title);
      requestData.append("description", formData.description || "");
      requestData.append("emoji", formData.emoji || "");
      requestData.append("group_id", groupId);
      requestData.append("difficulty", formData.difficulty);
      requestData.append("deadline_days", formData.deadline_days);
      
      await axios.post(`${API}/activities`, requestData);
      
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
          <h1 className="text-2xl font-bold text-white">Submit a New ACTIFY Challenge</h1>
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
              <div className="flex">
                <div className="w-12 flex items-center justify-center bg-gray-100 border border-r-0 border-gray-300 rounded-l">
                  {formData.emoji || "🎯"}
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded-r w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g., Morning Jog, Cook a New Recipe"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Choose an Emoji
              </label>
              <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded">
                {popularEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`text-2xl p-2 rounded hover:bg-gray-200 ${
                      formData.emoji === emoji ? 'bg-indigo-100 border border-indigo-300' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
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
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="difficulty">
                Difficulty Level
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="easy">Easy - Anyone can do it</option>
                <option value="medium">Medium - Requires some effort</option>
                <option value="hard">Hard - Challenging activity</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="deadline_days">
                Available for (days)
              </label>
              <select
                id="deadline_days"
                name="deadline_days"
                value={formData.deadline_days}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="3">3 days</option>
                <option value="7">1 week</option>
                <option value="14">2 weeks</option>
                <option value="30">1 month</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">How long this activity will be available for selection</p>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : "Submit Activity"}
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
  const [isActivityLoading, setIsActivityLoading] = useState(true);

  useEffect(() => {
    const fetchActivityDetails = async () => {
      setIsActivityLoading(true);
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
      } finally {
        setIsActivityLoading(false);
      }
    };

    fetchActivityDetails();
  }, [groupId, activityId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }
      
      setPhoto(file);
      setError(""); // Clear any previous errors
      
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
      navigate(`/groups/${groupId}`, { 
        state: { 
          activeTab: "submissions",
          notification: "Your photo evidence has been submitted successfully!" 
        } 
      });
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

  if (isActivityLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error && !photo) {
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
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Activity not found or not selected for today. Please go back and select a daily activity first.
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Submit ACTIFY Challenge Proof</h1>
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
                <div className="mb-4 relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded border"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Remove photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => document.getElementById('photo').click()}
                >
                  <div className="text-gray-600 mb-2">📷 No photo selected</div>
                  <div className="text-sm text-gray-500">Click here to choose a photo</div>
                </div>
              )}
              
              <input
                type="file"
                id="photo"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              
              <button
                type="button"
                onClick={() => document.getElementById('photo').click()}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                {previewUrl ? "Change Photo" : "Select Photo"}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={isLoading || !photo}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : "Submit Evidence"}
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
              <li>Maximum file size: 5MB</li>
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
