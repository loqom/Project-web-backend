# Pathfinder

**Domain-specific project finder backend**

## Overview

Pathfinder is a Node.js Express API that helps users discover and manage domain-specific projects. It provides authentication, project pipelines, problem tracking, feed updates, and team collaboration features.

## Features

- **Authentication** - JWT-based auth with bcrypt password hashing
- **Project Management** - Create, view, and manage projects
- **Pipelines** - Project pipeline tracking and stages
- **Problem Tracking** - Track and solve domain problems
- **Feed** - Project updates and activity feed
- **Teams** - Team management and member collaboration
- **Email Notifications** - Email service integration
- **Python Integration** - Python service support

## Tech Stack

- **Framework** - Express.js (Node.js)
- **Database** - MongoDB with Mongoose
- **Auth** - JSON Web Tokens, bcrypt
- **Other** - dotenv, cors, cookie-parser, axios, validator

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pathfinder
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1d
BCRYPT_SALT_ROUNDS=10
FRONTEND_URL=http://localhost:5173
EMAIL_SERVICE=gmail
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password
```

### Running the App

```bash
# Development
npm run dev

# Production
npm start
```

API will be available at `http://localhost:5000`

## API Routes

| Route | Description |
|-------|-------------|
| `/api/auth` | Authentication (login, register) |
| `/api/pipeline` | Pipeline management |
| `/api/projects` | Project CRUD operations |
| `/api/problems` | Problem tracking |
| `/api/feed` | Activity feed |
| `/api/teams` | Team management |

## Project Structure

```
src/
├── app.js           # Entry point & Express config
├── config/          # Database configuration
├── controller/      # Route controllers
├── middlewares/     # Custom middleware
├── models/          # MongoDB schemas
├── routes/          # API routes
└── services/        # Business logic (email, python)
```

## License

ISC