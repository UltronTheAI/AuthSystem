# AuthSystem API Documentation

This document provides detailed information about the API endpoints available in the AuthSystem.

## Base URL

`/api`

## Authentication

Some endpoints require a JSON Web Token (JWT) for authentication. Include the token in the `x-auth-token` header of your requests.

## Endpoints

### 1. Register User

-   **URL:** `/api/register`
-   **Method:** `POST`
-   **Description:** Registers a new user. Optionally accepts a profile image.
-   **Request Body (application/json or multipart/form-data):**
    ```json
    {
        "email": "user@example.com",
        "password": "password123",
        "username": "johndoe",
        "firstName": "John",
        "surname": "Doe"
    }
    ```
    -   `profileImage` (optional): File upload for profile picture.
-   **Responses:**
    -   `201 Created`: `{"message": "Registration successful. Please verify your email."}`
    -   `400 Bad Request`: `{"message": "Email or username already exists"}` or `{"message": "Inappropriate content detected in user details"}` or `{"message": "Inappropriate content detected in profile image"}`
    -   `500 Server Error`

### 2. Verify Email

-   **URL:** `/api/verify?token=<verification_token>`
-   **Method:** `GET`
-   **Description:** Verifies a user's email address using a token sent to their email.
-   **Query Parameters:**
    -   `token` (string, required): The verification token received via email.
-   **Responses:**
    -   `200 OK`: `{"message": "Email verified successfully. You can now log in."}`
    -   `400 Bad Request`: `{"message": "Invalid or expired token"}`
    -   `500 Server Error`

### 3. Login User

-   **URL:** `/api/login`
-   **Method:** `POST`
-   **Description:** Authenticates a user and returns a JWT.
-   **Request Body (application/json):**
    ```json
    {
        "email": "user@example.com",
        "password": "password123"
    }
    ```
-   **Responses:**
    -   `200 OK`: `{"message": "Login successful", "token": "<jwt_token>"}`
    -   `401 Unauthorized`: `{"message": "Invalid credentials or unverified email"}`
    -   `500 Server Error`

### 4. Send Text Verification Code

-   **URL:** `/api/text-verify`
-   **Method:** `POST`
-   **Description:** Sends a text verification code to the user's registered email.
-   **Request Body (application/json):**
    ```json
    {
        "email": "user@example.com"
    }
    ```
-   **Responses:**
    -   `200 OK`: `{"message": "Verification code sent to your email"}`
    -   `404 Not Found`: `{"message": "User not found"}`
    -   `500 Server Error`

### 5. Verify Text Code

-   **URL:** `/api/verify-text`
-   **Method:** `POST`
-   **Description:** Verifies the text code sent to the user's email. Includes rate limiting.
-   **Request Body (application/json):**
    ```json
    {
        "email": "user@example.com",
        "code": "123456"
    }
    ```
-   **Responses:**
    -   `200 OK`: `{"message": "Text code verified successfully"}`
    -   `400 Bad Request`: `{"message": "Invalid verification code", "attemptsLeft": <number>}`
    -   `404 Not Found`: `{"message": "User not found"}`
    -   `429 Too Many Requests`: `{"message": "Too many failed attempts. Account locked for 30 minutes"}` or `{"message": "Too many failed attempts. Please try again in <minutes> minutes"}`
    -   `500 Server Error`

### 6. Update Account Details

-   **URL:** `/api/update-account`
-   **Method:** `PUT`
-   **Description:** Updates the user's account details, including username, email, first name, surname, and optionally profile image. Requires authentication.
-   **Headers:**
    -   `x-auth-token`: `<jwt_token>`
-   **Request Body (application/json or multipart/form-data):**
    ```json
    {
        "username": "newusername",
        "email": "newemail@example.com",
        "firstName": "New",
        "surname": "Name"
    }
    ```
    -   `profileImage` (optional): File upload for new profile picture.
-   **Responses:**
    -   `200 OK`: `{"message": "Account updated successfully"}`
    -   `400 Bad Request`: `{"message": "Username or email already exists"}` or `{"message": "Inappropriate content detected in user details"}` or `{"message": "Inappropriate content detected in profile image"}`
    -   `401 Unauthorized`: If no token or invalid token.
    -   `500 Server Error`

### 7. Request Password Reset

-   **URL:** `/api/request-password-reset`
-   **Method:** `POST`
-   **Description:** Sends a password reset email to the user's registered email address.
-   **Request Body (application/json):**
    ```json
    {
        "email": "user@example.com"
    }
    ```
-   **Responses:**
    -   `200 OK`: `{"message": "Password reset email sent if email exists"}`
    -   `500 Server Error`

### 8. Reset Password

-   **URL:** `/api/reset-password`
-   **Method:** `POST`
-   **Description:** Resets the user's password using a token received via email.
-   **Request Body (application/json):**
    ```json
    {
        "token": "<reset_token>",
        "newPassword": "new_strong_password"
    }
    ```
-   **Responses:**
    -   `200 OK`: `{"message": "Password reset successfully"}`
    -   `400 Bad Request`: `{"message": "Invalid or expired token"}`
    -   `500 Server Error`

### 9. Delete Account

-   **URL:** `/api/delete-account`
-   **Method:** `DELETE`
-   **Description:** Deletes the user's account and optionally their profile image from Cloudinary. Requires authentication.
-   **Headers:**
    -   `x-auth-token`: `<jwt_token>`
-   **Responses:**
    -   `200 OK`: `{"message": "Account deleted successfully"}`
    -   `401 Unauthorized`: If no token or invalid token.
    -   `404 Not Found`: `{"message": "User not found"}`
    -   `500 Server Error`