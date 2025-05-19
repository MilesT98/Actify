
import requests
import sys
import json
from datetime import datetime

class ActifyAPITester:
    def __init__(self, base_url="https://e1ffcce3-e7c4-41ff-9685-adbbd39fef6d.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.username = None
        self.tests_run = 0
        self.tests_passed = 0
        self.group_ids = []

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
        return success, response

    def test_get_user_groups(self):
        """Test getting user groups"""
        if not self.token:
            print("❌ Cannot test user groups - not logged in")
            return False
            
        success, response = self.run_test(
            "Get User Groups",
            "GET",
            "groups/user",
            200
        )
        
        if success and isinstance(response, list):
            # Store group IDs for later use
            self.group_ids = [group["id"] for group in response]
            print(f"Found {len(self.group_ids)} groups")
        
        return success, response

    def test_get_active_challenges(self):
        """Test getting active challenges"""
        if not self.token:
            print("❌ Cannot test active challenges - not logged in")
            return False
            
        success, response = self.run_test(
            "Get Active Challenges",
            "GET",
            "challenges/active",
            200
        )
        return success, response

    def test_get_global_leaderboard(self):
        """Test getting global leaderboard"""
        if not self.token:
            print("❌ Cannot test leaderboard - not logged in")
            return False
            
        success, response = self.run_test(
            "Get Global Leaderboard",
            "GET",
            "leaderboard/global",
            200
        )
        return success, response

    def test_get_group_details(self, group_id):
        """Test getting group details"""
        if not self.token:
            print("❌ Cannot test group details - not logged in")
            return False
            
        success, response = self.run_test(
            f"Get Group Details for {group_id}",
            "GET",
            f"groups/{group_id}",
            200
        )
        return success, response

    def test_get_group_leaderboard(self, group_id):
        """Test getting group leaderboard"""
        if not self.token:
            print("❌ Cannot test group leaderboard - not logged in")
            return False
            
        success, response = self.run_test(
            f"Get Group Leaderboard for {group_id}",
            "GET",
            f"groups/{group_id}/leaderboard",
            200
        )
        return success, response

def main():
    # Setup
    tester = ActifyAPITester()
    
    # Test credentials - using the ones specified in the request
    username = "testuser"
    password = "testpassword"
    
    print("\n===== TESTING ACTIFY API =====\n")
    
    # Test login
    if not tester.test_login(username, password):
        print("❌ Login failed, stopping tests")
        return 1
    
    print("\n===== TESTING USER PROFILE =====\n")
    # Test getting user profile
    profile_success, profile_data = tester.test_get_user_profile()
    if not profile_success:
        print("❌ User profile retrieval failed")
    
    print("\n===== TESTING GROUPS =====\n")
    # Test getting user groups
    groups_success, groups_data = tester.test_get_user_groups()
    if not groups_success:
        print("❌ User groups retrieval failed")
    else:
        print(f"Found {len(tester.group_ids)} groups")
        
        # Test each group's details
        for group_id in tester.group_ids:
            group_success, group_data = tester.test_get_group_details(group_id)
            if not group_success:
                print(f"❌ Group details retrieval failed for {group_id}")
            
            # Test group leaderboard
            leaderboard_success, leaderboard_data = tester.test_get_group_leaderboard(group_id)
            if not leaderboard_success:
                print(f"❌ Group leaderboard retrieval failed for {group_id}")
    
    print("\n===== TESTING CHALLENGES =====\n")
    # Test getting active challenges
    challenges_success, challenges_data = tester.test_get_active_challenges()
    if not challenges_success:
        print("❌ Active challenges retrieval failed")
    
    print("\n===== TESTING LEADERBOARD =====\n")
    # Test getting global leaderboard
    leaderboard_success, leaderboard_data = tester.test_get_global_leaderboard()
    if not leaderboard_success:
        print("❌ Global leaderboard retrieval failed")
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
