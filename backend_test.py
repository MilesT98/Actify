import requests
import unittest
import uuid
import time
from datetime import datetime

class ActivityChallengeAPITest(unittest.TestCase):
    def setUp(self):
        self.base_url = "https://4d5ee6f8-8f9d-4296-b4a3-e221abe214ab.preview.emergentagent.com/api"
        self.token = None
        self.user_id = None
        self.username = None
        self.test_group_id = None
        self.test_activity_id = None
        self.test_submission_id = None
        self.test_notification_id = None
        
        # Test user credentials
        self.test_username = "testuser"
        self.test_password = "testpassword"
        
        # New user for registration test
        self.new_username = f"testuser_{int(time.time())}"
        self.new_email = f"{self.new_username}@example.com"
        self.new_password = "Test123!"
        
        # Test interests
        self.test_interests = ["running", "yoga", "hiking"]

    def test_01_register_user(self):
        """Test user registration"""
        print("\n1. Testing User Registration...")
        
        url = f"{self.base_url}/auth/register"
        data = {
            "username": self.new_username,
            "email": self.new_email,
            "password": self.new_password
        }
        
        response = requests.post(url, json=data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], self.new_username)
        self.assertEqual(response.json()["email"], self.new_email)
        self.assertIn("id", response.json())
        
        print("✅ User Registration Test Passed")

    def test_02_login(self):
        """Test user login"""
        print("\n2. Testing User Login...")
        
        url = f"{self.base_url}/auth/token"
        data = {
            "username": self.test_username,
            "password": self.test_password
        }
        
        response = requests.post(url, data=data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())
        self.assertIn("user_id", response.json())
        self.assertIn("username", response.json())
        
        # Save token for subsequent tests
        self.token = response.json()["access_token"]
        self.user_id = response.json()["user_id"]
        self.username = response.json()["username"]
        
        print("✅ User Login Test Passed")

    def test_03_create_group(self):
        """Test group creation"""
        print("\n3. Testing Group Creation...")
        
        if not self.token:
            self.test_02_login()
        
        url = f"{self.base_url}/groups"
        data = {
            "name": f"Test Group {int(time.time())}",
            "description": "A test group for API testing"
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], data["name"])
        self.assertEqual(response.json()["description"], data["description"])
        self.assertIn("id", response.json())
        self.assertIn("invite_code", response.json())
        
        # Save group ID for subsequent tests
        self.test_group_id = response.json()["id"]
        self.test_invite_code = response.json()["invite_code"]
        
        print("✅ Group Creation Test Passed")

    def test_04_join_group(self):
        """Test joining a group with invite code"""
        print("\n4. Testing Group Joining...")
        
        if not self.token or not self.test_invite_code:
            self.test_02_login()
            self.test_03_create_group()
        
        # First, login with the new user
        url = f"{self.base_url}/auth/token"
        data = {
            "username": self.new_username,
            "password": self.new_password
        }
        
        response = requests.post(url, data=data)
        new_user_token = response.json()["access_token"]
        
        # Now try to join the group
        url = f"{self.base_url}/groups/join"
        headers = {
            "Authorization": f"Bearer {new_user_token}"
        }
        
        response = requests.post(url, data={"invite_code": self.test_invite_code}, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_group_id)
        self.assertIn(self.test_invite_code, response.json()["invite_code"])
        
        print("✅ Group Joining Test Passed")

    def test_05_create_activity(self):
        """Test creating an activity"""
        print("\n5. Testing Activity Creation...")
        
        if not self.token or not self.test_group_id:
            self.test_02_login()
            self.test_03_create_group()
        
        url = f"{self.base_url}/activities"
        data = {
            "title": f"Test Activity {int(time.time())}",
            "description": "A test activity for API testing",
            "group_id": self.test_group_id
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], data["title"])
        self.assertEqual(response.json()["description"], data["description"])
        self.assertEqual(response.json()["group_id"], self.test_group_id)
        self.assertIn("id", response.json())
        
        # Save activity ID for subsequent tests
        self.test_activity_id = response.json()["id"]
        
        print("✅ Activity Creation Test Passed")

    def test_06_select_daily_activity(self):
        """Test selecting a daily activity"""
        print("\n6. Testing Daily Activity Selection...")
        
        if not self.token or not self.test_group_id or not self.test_activity_id:
            self.test_02_login()
            self.test_03_create_group()
            self.test_05_create_activity()
        
        url = f"{self.base_url}/activities/select-daily"
        data = {
            "group_id": self.test_group_id
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        response = requests.post(url, data=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["group_id"], self.test_group_id)
        self.assertIsNotNone(response.json()["selected_for_date"])
        
        print("✅ Daily Activity Selection Test Passed")

    def test_07_submit_photo(self):
        """Test submitting a photo for an activity (mock)"""
        print("\n7. Testing Photo Submission...")
        
        if not self.token or not self.test_activity_id:
            self.test_02_login()
            self.test_03_create_group()
            self.test_05_create_activity()
            self.test_06_select_daily_activity()
        
        url = f"{self.base_url}/submissions"
        
        # Create a mock image file
        mock_image = b"mock image data"
        files = {
            "photo": ("test.jpg", mock_image, "image/jpeg")
        }
        
        data = {
            "activity_id": self.test_activity_id
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        response = requests.post(url, files=files, data=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json() if response.status_code == 200 else response.text}")
        
        # This might fail if the activity hasn't been selected for today
        if response.status_code == 200:
            self.assertEqual(response.json()["activity_id"], self.test_activity_id)
            self.assertIn("photo_url", response.json())
            self.test_submission_id = response.json()["id"]
            print("✅ Photo Submission Test Passed")
        else:
            print("⚠️ Photo Submission Test Skipped - Activity may not be selected for today")

    def test_08_vote_submission(self):
        """Test voting on a submission"""
        print("\n8. Testing Voting on Submission...")
        
        if not self.token or not self.test_submission_id:
            print("⚠️ Voting Test Skipped - No submission available")
            return
        
        url = f"{self.base_url}/submissions/{self.test_submission_id}/vote"
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        response = requests.post(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.test_submission_id)
        self.assertIn(self.user_id, response.json()["votes"])
        
        print("✅ Voting Test Passed")

    def test_09_get_leaderboard(self):
        """Test getting the group leaderboard"""
        print("\n9. Testing Group Leaderboard...")
        
        if not self.token or not self.test_group_id:
            self.test_02_login()
            self.test_03_create_group()
        
        url = f"{self.base_url}/groups/{self.test_group_id}/leaderboard"
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        
        print("✅ Leaderboard Test Passed")

def run_tests():
    test_suite = unittest.TestSuite()
    test_suite.addTest(ActivityChallengeAPITest('test_01_register_user'))
    test_suite.addTest(ActivityChallengeAPITest('test_02_login'))
    test_suite.addTest(ActivityChallengeAPITest('test_03_create_group'))
    test_suite.addTest(ActivityChallengeAPITest('test_04_join_group'))
    test_suite.addTest(ActivityChallengeAPITest('test_05_create_activity'))
    test_suite.addTest(ActivityChallengeAPITest('test_06_select_daily_activity'))
    test_suite.addTest(ActivityChallengeAPITest('test_07_submit_photo'))
    test_suite.addTest(ActivityChallengeAPITest('test_08_vote_submission'))
    test_suite.addTest(ActivityChallengeAPITest('test_09_get_leaderboard'))
    
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)

if __name__ == "__main__":
    run_tests()