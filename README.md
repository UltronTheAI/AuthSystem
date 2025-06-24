# AuthSystem

This project implements a robust authentication system with features such as user registration, login, email verification, text code verification, profile management (including image uploads with abuse detection), and account deletion.

## Features

- User Registration with email and username
- User Login with JWT authentication
- Email Verification for new registrations
- Text Code Verification with rate limiting
- Profile Image Uploads with Cloudinary integration
- Gemini API integration for text and image abuse detection
- Account Deletion with optional Cloudinary image removal

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd AuthSystem
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add the following environment variables:
    ```
    PORT=5000
    MONGO_URI=<Your MongoDB Connection String>
    JWT_ACCESS_SECRET=<Your JWT Secret Key>
    GMAIL=<Your Gmail Address for sending emails>
    GMAIL_PASSWORD=<Your Gmail App Password>
    CLOUDINARY_CLOUD_NAME=<Your Cloudinary Cloud Name>
    CLOUDINARY_API_KEY=<Your Cloudinary API Key>
    CLOUDINARY_API_SECRET=<Your Cloudinary API Secret>
    GEMINI_API_KEY=<Your Gemini API Key>
    ```

4.  **Run the application:**
    ```bash
    npm start
    ```

    The server will run on `http://localhost:5000` (or your specified PORT).

## API Documentation

For detailed API endpoint documentation, refer to [API.md](docs/API.md).