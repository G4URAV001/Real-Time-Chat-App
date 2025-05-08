# ChitChat - Real-Time Messaging Application

ChitChat is a real-time messaging application built with modern web technologies. It features user authentication, public and private chat rooms, and direct messaging capabilities.

## Technologies Used

### Frontend:
- React with TypeScript
- Tailwind CSS and Shadcn/UI components
- Socket.io client for real-time communication
- Vite for fast development and bundling

### Backend:
- Node.js and Express
- MongoDB database
- Socket.io for real-time communication
- JWT for authentication

## Features

- **User Authentication**: Secure signup/login system with JWT
- **Real-time Messaging**: Instant delivery of messages using Socket.io
- **Room Management**: 
  - Create public rooms that anyone can join
  - Create private rooms with invite codes
  - Room creator controls (edit details, remove members, etc.)
- **Direct Messaging**: Private conversations between users
- **Online User Tracking**: See who's currently online
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- MongoDB (local or Atlas connection)

### Setup Instructions

#### Backend Setup:
1. Navigate to the backend directory:
   ```sh
   cd backend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the backend directory with the following content:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chitchat
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the backend server:
   ```sh
   npm run dev
   ```

#### Frontend Setup:
1. From the root directory, install dependencies:
   ```sh
   npm install
   ```

2. Make sure you have a `.env` file in the root directory with:
   ```
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

3. Start the frontend development server:
   ```sh
   npm run dev
   ```

4. Open your browser and navigate to http://localhost:5173

## Usage Guide

### Creating an Account
1. Click "Sign Up" on the login page
2. Enter a username, email, and password
3. Submit the form to create your account

### Joining a Room
- **Public Rooms**: Click on "Public Rooms" in the sidebar, browse available rooms, and click "Join"
- **Private Rooms**: Click on "Private Room" in the sidebar, enter an invite code, and click "Join"

### Creating a Room
1. Click the "New Chat Room" button in the sidebar
2. Enter the room name and optional description
3. Toggle the "Private Room" switch if you want a private room
4. Click "Create Room" to finish

### Direct Messaging
1. Go to the "Users" tab in the sidebar
2. Click on a user to start a direct conversation
3. Or, click on "New Conversation" and select a user

### Room Management
- Click the information icon (i) in the header when in a room to:
  - View room details and members
  - Get or generate new invite codes (for private rooms)
  - Remove members (if you're the room creator)

## License
This project is licensed under the MIT License - see the LICENSE file for details.
