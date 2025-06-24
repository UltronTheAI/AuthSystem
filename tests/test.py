import requests
import json
import time
from datetime import datetime

# Base URL
BASE_URL = "http://localhost:5000/api"

# Test user data
TEST_USER = {
    "email": "epicdeveloper14@gmail.com",
    "password": "password123@#567565",
    "username": "pro_epic_programmer",
    "firstName": "swaraj",
    "surname": "puppalwar"
}

# Inappropriate data for negative tests
INAPPROPRIATE_USER = {
    "email": "test@example.com",
    "password": "pass123",
    "username": "sexytest",
    "firstName": "inappropriate",
    "surname": "badword"
}

# Test report
report = {
    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "tests": []
}

def test_register():
    # Positive test
    files = {'profileImage': open('test_image.jpg', 'rb')}  # Use a safe test image
    response = requests.post(f"{BASE_URL}/register", data=TEST_USER, files=files)
    report["tests"].append({
        "endpoint": "/register",
        "test": "Positive - Valid user",
        "status_code": response.status_code,
        "response": response.json()
    })
    token = None
    if response.status_code == 201:
        print("Registration successful, check email for verification.")

    # Negative test - Duplicate email
    response = requests.post(f"{BASE_URL}/register", data=TEST_USER, files=files)
    report["tests"].append({
        "endpoint": "/register",
        "test": "Negative - Duplicate email",
        "status_code": response.status_code,
        "response": response.json()
    })

    # Negative test - Inappropriate username
    response = requests.post(f"{BASE_URL}/register", data=INAPPROPRIATE_USER, files=files)
    report["tests"].append({
        "endpoint": "/register",
        "test": "Negative - Inappropriate username",
        "status_code": response.status_code,
        "response": response.json()
    })

def test_verify_email(token):
    # Positive test
    response = requests.get(f"{BASE_URL}/verify?token={token}")
    report["tests"].append({
        "endpoint": "/verify",
        "test": "Positive - Valid token",
        "status_code": response.status_code,
        "response": response.json()
    })

    # Negative test - Invalid token
    response = requests.get(f"{BASE_URL}/verify?token=invalidtoken")
    report["tests"].append({
        "endpoint": "/verify",
        "test": "Negative - Invalid token",
        "status_code": response.status_code,
        "response": response.json()
    })

def test_login():
    # Positive test
    response = requests.post(f"{BASE_URL}/login", json=TEST_USER)
    report["tests"].append({
        "endpoint": "/login",
        "test": "Positive - Valid credentials",
        "status_code": response.status_code,
        "response": response.json()
    })
    token = response.json().get("token") if response.status_code == 200 else None

    # Negative test - Wrong password
    wrong_user = TEST_USER.copy()
    wrong_user["password"] = "wrongpass"
    response = requests.post(f"{BASE_URL}/login", json=wrong_user)
    report["tests"].append({
        "endpoint": "/login",
        "test": "Negative - Wrong password",
        "status_code": response.status_code,
        "response": response.json()
    })
    return token

def test_text_verify():
    # Positive test
    response = requests.post(f"{BASE_URL}/text-verify", json={"email": TEST_USER["email"]})
    report["tests"].append({
        "endpoint": "/text-verify",
        "test": "Positive - Valid email",
        "status_code": response.status_code,
        "response": response.json()
    })

    # Negative test - Non-existent email
    response = requests.post(f"{BASE_URL}/text-verify", json={"email": "nonexistent@example.com"})
    report["tests"].append({
        "endpoint": "/text-verify",
        "test": "Negative - Non-existent email",
        "status_code": response.status_code,
        "response": response.json()
    })

def test_verify_text():
    # Positive test (assuming code is received, use a placeholder)
    response = requests.post(f"{BASE_URL}/verify-text", json={"email": TEST_USER["email"], "code": "123456"})
    report["tests"].append({
        "endpoint": "/verify-text",
        "test": "Positive - Valid code",
        "status_code": response.status_code,
        "response": response.json()
    })

    # Negative test - Wrong code
    response = requests.post(f"{BASE_URL}/verify-text", json={"email": TEST_USER["email"], "code": "654321"})
    report["tests"].append({
        "endpoint": "/verify-text",
        "test": "Negative - Wrong code",
        "status_code": response.status_code,
        "response": response.json()
    })

def test_update_profile(token):
    # Positive test
    files = {'profileImage': open('test_image.jpg', 'rb')}
    headers = {"x-auth-token": token}
    response = requests.put(f"{BASE_URL}/update-profile", files=files, headers=headers)
    report["tests"].append({
        "endpoint": "/update-profile",
        "test": "Positive - Valid image update",
        "status_code": response.status_code,
        "response": response.json()
    })

    # Negative test - Inappropriate image (use an inappropriate test image if available)
    files = {'profileImage': open('inappropriate_image.jpg', 'rb')}  # Ensure this file exists
    response = requests.put(f"{BASE_URL}/update-profile", files=files, headers=headers)
    report["tests"].append({
        "endpoint": "/update-profile",
        "test": "Negative - Inappropriate image",
        "status_code": response.status_code,
        "response": response.json()
    })

def test_delete_account(token):
    # Positive test
    headers = {"x-auth-token": token}
    response = requests.delete(f"{BASE_URL}/delete-account", headers=headers)
    report["tests"].append({
        "endpoint": "/delete-account",
        "test": "Positive - Valid deletion",
        "status_code": response.status_code,
        "response": response.json()
    })

    # Negative test - Invalid token
    headers = {"x-auth-token": "invalidtoken"}
    response = requests.delete(f"{BASE_URL}/delete-account", headers=headers)
    report["tests"].append({
        "endpoint": "/delete-account",
        "test": "Negative - Invalid token",
        "status_code": response.status_code,
        "response": response.json()
    })

# Run tests
if __name__ == "__main__":
    print("Starting AuthSystem API Tests...")
    
    # Test registration
    test_register()
    
    # Simulate email verification (token needs to be extracted from email or mocked)
    token = "mock_verification_token"  # Replace with actual token from email
    test_verify_email(token)
    
    # Test login to get JWT
    token = test_login()
    
    # Test text verification
    test_text_verify()
    test_verify_text()
    
    # Test profile update
    if token:
        test_update_profile(token)
    
    # Test account deletion
    if token:
        test_delete_account(token)
    
    # Generate and save report
    with open("test_report.json", "w") as f:
        json.dump(report, f, indent=4)
    print("Test report saved to test_report.json")

    print("All tests completed.")