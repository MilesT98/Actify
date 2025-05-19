
import requests
import sys
import json
from datetime import datetime

class AuthAPITester:
    def __init__(self, base_url="https://e1ffcce3-e7c4-41ff-9685-adbbd39fef6d.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.username = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if headers.get('Content-Type') == 'application/x-www-form-urlencoded':
                    response = requests.post(url, data=data, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            
            print(f"Status Code: {response.status_code}")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self, username, email, password):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,  # Expecting 200 OK
            data={
                "username": username,
                "email": email,
                "password": password
            }
        )
        return success, response

    def test_login(self, username, password):
        """Test user login"""
        # For login, we need to use form data
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        data = {
            'username': username,
            'password': password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/token",
            200,
            data=data,
            headers=headers
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user_id']
            self.username = response['username']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            print("❌ Cannot test user profile - not logged in")
            return False
            
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "users/me",
            200
        )
        return success

def main():
    # Setup
    tester = AuthAPITester()
    
    # Test credentials
    username = "testuserAuto"
    email = "testauto@example.com"
    password = "testpassword123"
    
    print("\n===== TESTING USER AUTHENTICATION API =====\n")
    
    # Test registration
    reg_success, reg_response = tester.test_register(username, email, password)
    if not reg_success:
        if "detail" in reg_response and "already registered" in reg_response["detail"]:
            print("⚠️ User already exists, continuing with login test")
        else:
            print("❌ Registration failed with unexpected error")
    
    # Test login
    if not tester.test_login(username, password):
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test getting user profile
    if not tester.test_get_user_profile():
        print("❌ User profile retrieval failed")
        return 1
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
