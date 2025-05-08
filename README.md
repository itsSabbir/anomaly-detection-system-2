# Anomaly Detection System (Core ML Pipeline & Original Scope Considerations)

This project implements the core machine learning pipeline for an automated anomaly detection system. It has been developed through several stages, initially envisioning a broader scope as outlined in project requirements, and subsequently pivoting to focus on delivering a demonstrable end-to-end ML pipeline. The system's primary function is to receive video uploads, process them using a Python script leveraging YOLOv5 for object detection, apply custom rules to identify anomalies, and if an anomaly is detected, save the relevant video frame and store alert metadata in a PostgreSQL database (AWS RDS). The backend and ML processing components are designed for deployment on AWS EC2.

This document provides a comprehensive guide to the system's architecture, setup, operation, deployment, key decisions made throughout its development (including alignment with initial requirements), detailed theoretical implementations for original scope items not fully realized in the current version, and plans for future enhancements. It is intended to be an exhaustive resource for understanding, operating, and extending the system.

## Table of Contents

1.  [Project Evolution & Objective Alignment](#1-project-evolution--objective-alignment)
2.  [Features (Implemented vs. Original Scope)](#2-features-implemented-vs-original-scope)
3.  [System Architecture (Implemented Core Pipeline)](#3-system-architecture-implemented-core-pipeline)
    *   [3.1 Conceptual Overview](#31-conceptual-overview)
    *   [3.2 Component Breakdown and Interactions](#32-component-breakdown-and-interactions)
    *   [3.3 Data Flow](#33-data-flow)
    *   [3.4 Key Design Principles](#34-key-design-principles)
4.  [Technology Stack](#4-technology-stack)
    *   [4.1 Frontend](#41-frontend)
    *   [4.2 Backend](#42-backend)
    *   [4.3 Machine Learning](#43-machine-learning)
    *   [4.4 Database](#44-database)
    *   [4.5 Deployment & Operations](#45-deployment--operations)
    *   [4.6 Development Tooling & Quality](#46-development-tooling--quality)
5.  [Project Structure](#5-project-structure)
6.  [Detailed Setup and Installation](#6-detailed-setup-and-installation)
    *   [6.1 Prerequisites](#61-prerequisites)
    *   [6.2 AWS Account and CLI Configuration](#62-aws-account-and-cli-configuration)
    *   [6.3 Repository Cloning](#63-repository-cloning)
    *   [6.4 AWS RDS PostgreSQL Database Setup](#64-aws-rds-postgresql-database-setup)
        *   [6.4.1 Creating the RDS Instance](#641-creating-the-rds-instance)
        *   [6.4.2 Configuring Security Groups for RDS](#642-configuring-security-groups-for-rds)
        *   [6.4.3 Database Schema Initialization](#643-database-schema-initialization)
    *   [6.5 Backend Setup](#65-backend-setup)
        *   [6.5.1 Node.js and npm](#651-nodejs-and-npm)
        *   [6.5.2 Environment Configuration (`.env` file)](#652-environment-configuration-env-file)
        *   [6.5.3 Python Virtual Environment and Dependencies](#653-python-virtual-environment-and-dependencies)
        *   [6.5.4 Installing Backend Dependencies and Running](#654-installing-backend-dependencies-and-running)
    *   [6.6 Frontend Setup (Minimal UI)](#66-frontend-setup-minimal-ui)
        *   [6.6.1 Environment Configuration (`.env` file)](#661-environment-configuration-env-file)
        *   [6.6.2 Installing Frontend Dependencies and Running](#662-installing-frontend-dependencies-and-running)
    *   [6.7 Initial Database Connection Troubleshooting Insights](#67-initial-database-connection-troubleshooting-insights)
7.  [Running the Application Locally](#7-running-the-application-locally)
    *   [7.1 Starting the Backend Server](#71-starting-the-backend-server)
    *   [7.2 Starting the Frontend Development Server](#72-starting-the-frontend-development-server)
    *   [7.3 Accessing the Application](#73-accessing-the-application)
8.  [Testing and Verification](#8-testing-and-verification)
    *   [8.1 Manual End-to-End Testing Procedure](#81-manual-end-to-end-testing-procedure)
    *   [8.2 Automated Pipeline Test Script (`test_pipeline_detailed.sh`)](#82-automated-pipeline-test-script-test_pipeline_detailedsh)
    *   [8.3 Comprehensive Verification Checklist](#83-comprehensive-verification-checklist)
9.  [Deployment to AWS EC2](#9-deployment-to-aws-ec2)
    *   [9.1 EC2 Instance Launch and Configuration](#91-ec2-instance-launch-and-configuration)
    *   [9.2 Connecting to the EC2 Instance](#92-connecting-to-the-ec2-instance)
    *   [9.3 Server Environment Setup](#93-server-environment-setup)
    *   [9.4 Application Deployment](#94-application-deployment)
    *   [9.5 Running the Application with PM2](#95-running-the-application-with-pm2)
    *   [9.6 (Optional) Nginx as a Reverse Proxy](#96-optional-nginx-as-a-reverse-proxy)
    *   [9.7 Serving Anomaly Frames](#97-serving-anomaly-frames)
    *   [9.8 Final Checks and Health Verification](#98-final-checks-and-health-verification)
10. [Addressing Original Project Requirements: Status & Theoretical Implementations](#10-addressing-original-project-requirements-status--theoretical-implementations)
    *   [10.1 Frontend Framework (Req 1.1)](#101-frontend-framework-req-11)
    *   [10.2 Frontend GUI (Req 1.2)](#102-frontend-gui-req-12)
    *   [10.3 Backend Framework (Req 1.3)](#103-backend-framework-req-13)
    *   [10.4 Backend Storage (Req 1.4)](#104-backend-storage-req-14)
    *   [10.5 Machine Learning Integration (Req 1.5)](#105-machine-learning-integration-req-15)
    *   [10.6 Anomaly Detection System Core (Req 1.6)](#106-anomaly-detection-system-core-req-16)
    *   [10.7 Non-Functional Requirements](#107-non-functional-requirements)
11. [Vibe Coding and AI-Assisted Development (Req 3.0)](#11-vibe-coding-and-ai-assisted-development-req-30)
12. [Verification for Evaluators (AWS Credentials)](#12-verification-for-evaluators-aws-credentials)
13. [Key Decisions, Trade-offs, and Project Evolution Summary](#13-key-decisions-trade-offs-and-project-evolution-summary)
14. [Future Improvements & Potential Extensions (Beyond Original Scope)](#14-future-improvements--potential-extensions-beyond-original-scope)

## 1. Project Evolution & Objective Alignment

The overarching objective, as stated in the requirements, is to "Evaluate the candidate's ability to design and implement a modular, ML-integrated anomaly detection system using a Node.js backend, with emphasis on core business logic, decoupling, and modern AI-assisted development (vibe coding)."

This project was undertaken with this objective in mind. Initially, a comprehensive feature set (detailed in Section 10) was planned. However, to ensure a demonstrable and functional core ML pipeline within the assessment timeline, a strategic **pivot** was made. This focused development efforts on:
1.  Robust backend setup (Node.js, Express.js).
2.  AWS integration for persistent storage (RDS PostgreSQL) and deployment (EC2).
3.  A functional video upload mechanism via a minimal frontend.
4.  End-to-end ML processing using YOLOv5 for object detection.
5.  Implementation of custom anomaly detection rules.
6.  Saving alert metadata and associated frames.
7.  Clear demonstration of AI-assisted development practices ("vibe coding").

The current implementation successfully delivers this core ML pipeline, providing a strong foundation and showcasing the ability to integrate complex components. Section 10 of this document meticulously details how each original requirement was addressed, what was implemented, the rationale for any deviations, and, crucially, provides **detailed theoretical solution strategies** for those requirements not fully realized in this iteration. This approach demonstrates both practical execution skills and a comprehensive understanding of the broader system vision.

## 2. Features (Implemented vs. Original Scope)

| Feature Category        | Original Scope Requirement                                        | Implemented Status in Pivoted Version                                     | Notes / Reference to Theoretical Implementation |
| :---------------------- | :---------------------------------------------------------------- | :------------------------------------------------------------------------ | :---------------------------------------------- |
| **Frontend Framework**  | React with TypeScript                                             | **Fully Implemented**                                                     | Section [10.1](#101-frontend-framework-req-11)          |
| **Frontend GUI**        | Search page, filters, results table, modal dialog for details (MUI) | **Pivoted:** Minimal UI for video upload only (MUI used).             | Section [10.2.2](#1022-theoretical-implementation-full-frontend-gui) describes theoretical full UI. |
| **Backend Framework**   | Node.js, Deployed on AWS EC2                                      | **Fully Implemented**                                                     | Section [10.3](#103-backend-framework-req-13)          |
| **Backend Storage**     | AWS RDS, Decoupled CRUD, Frame data solution                      | **Partially Implemented:** RDS used for Alert Create. Frame data stored locally on EC2. | Section [10.4.2](#1042-theoretical-implementation-full-decoupled-crud-operations) describes theoretical full CRUD & S3. |
| **ML Integration**      | YOLO, Optional LSTM, Stanford Drone Dataset, In-browser (WASM/WebGPU) | **Partially Implemented:** YOLOv5 (backend).                              | Section [10.5](#105-machine-learning-integration-req-15) describes theoretical LSTM, Dataset use, In-browser ML. |
| **Anomaly Detection** | Video upload, custom rules, alert creation (timestamp, type, etc.) | **Fully Implemented** (core logic)                                      | Section [10.6](#106-anomaly-detection-system-core-req-16) |
| **Unit Testing**        | Jest, 80%+ coverage                                               | **Pivoted:** Focus on manual E2E and basic script. Minimal unit tests. | Section [10.7.1](#1071-unit-testing-req-21) describes theoretical full testing. |
| **Code Quality**        | Pass ESLint checks                                                | **Fully Implemented**                                                     | Section [10.7.2](#1072-code-quality-req-22)         |
| **AWS Implementation**  | Free trial account, Reviewer credentials                          | **Fully Implemented**                                                     | Section [10.7.3](#1073-aws-implementation-req-23)         |
| **AI Development**      | Vibe coding with LLMs, prompt logging                             | **Fully Implemented**                                                     | Section [11](#11-vibe-coding-and-ai-assisted-development-req-30)          |

## 3. System Architecture (Implemented Core Pipeline)

### 3.1 Conceptual Overview

The implemented system is a web-based application designed for automated anomaly detection in uploaded video files. It integrates a frontend for user interaction, a backend for request handling and orchestration, a machine learning component for video analysis, and a database for persistent storage of detected anomalies. The core pipeline demonstrates an end-to-end flow from video upload to alert generation and storage.

### 3.2 Component Breakdown and Interactions

The system comprises several key components that interact to perform its functions:

1.  **Frontend (React with TypeScript & MUI):**
    *   **Role:** Provides a minimal User Interface (UI) for video uploads.
    *   **Functionality:** Allows users to select a video file from their local system and initiate the upload process to the backend. Displays status messages regarding the upload and processing progress/outcome.
    *   **Interaction:** Communicates with the Backend API via HTTP POST requests (using Axios) to send video data.

2.  **Backend API (Node.js with Express.js):**
    *   **Role:** Serves as the central orchestrator, handling incoming requests, managing the ML processing pipeline, and interacting with the database.
    *   **Functionality:**
        *   Receives video uploads via a dedicated API endpoint (e.g., `/api/upload`).
        *   Temporarily stores the uploaded video file on the server's filesystem.
        *   Invokes the Python ML script as a child process, passing the video file path and an output path for frames.
        *   Receives processing results (JSON metadata of detected anomalies) and error information from the Python script via standard output/error streams.
        *   If anomalies are detected, it parses the metadata and inserts alert records into the PostgreSQL database.
        *   Manages and cleans up temporary video files.
        *   Provides a health check endpoint (e.g., `/api/health`).
        *   Serves static files (specifically, the saved anomaly frames from a designated directory like `backend/frames/`).
    *   **Interaction:**
        *   Listens for HTTP requests from the Frontend.
        *   Spawns and communicates with the Python ML Script.
        *   Executes SQL queries against the AWS RDS PostgreSQL Database.

3.  **Machine Learning Script (Python with YOLOv5 & OpenCV):**
    *   **Role:** Performs the core video analysis for object detection and anomaly identification.
    *   **Functionality:**
        *   Receives a video file path and an output directory path as command-line arguments from the Node.js backend.
        *   Utilizes OpenCV to read and process video frames.
        *   Employs a pretrained YOLOv5 model (loaded via PyTorch Hub) to detect objects in each (sampled) frame.
        *   Applies custom-defined rules to the detection results to identify anomalies (e.g., count of persons exceeding a threshold).
        *   If an anomaly is detected, it saves the specific video frame (containing the anomaly) as a JPEG image to the designated output directory.
        *   Outputs a JSON string to its standard output, containing metadata about the detected anomaly (e.g., `alert_type`, `message`, `frame_storage_key`, `details`).
        *   Outputs any errors or verbose logging to its standard error stream.
    *   **Interaction:** Invoked by and communicates (via stdin/stdout/stderr pipes) with the Backend API. Reads video files from and writes frame images to the EC2 instance's local filesystem.

4.  **Database (PostgreSQL on AWS RDS):**
    *   **Role:** Provides persistent storage for anomaly alert metadata.
    *   **Functionality:** Stores structured information about each detected anomaly, including a timestamp, alert type, descriptive message, a key/path to the saved frame, and other relevant details (JSONB for flexibility).
    *   **Interaction:** Accessed by the Backend API for writing new alert records.

5.  **Deployment Environment (AWS EC2):**
    *   **Role:** Hosts the Backend API and the Python ML Script. The EC2 instance's local filesystem is used for temporary video storage and persistent (in this version) frame image storage.
    *   **Interaction:** The Node.js application and Python script run within this environment. Network configurations (Security Groups) allow traffic to the application and from the application to the RDS database.

### 3.3 Data Flow

The primary data flow for an anomaly detection event is as follows:

1.  **Video Upload:**
    *   The User selects a video file via the Frontend UI.
    *   The Frontend sends an HTTP POST request containing the video file (multipart/form-data) to the Backend `/api/upload` endpoint.
2.  **Backend Reception & ML Invocation:**
    *   The Express.js server (with `multer`) receives the video file and saves it temporarily on the EC2 instance's local filesystem (e.g., in `backend/uploads/`).
    *   The Backend API spawns the `detect.py` Python script, passing the path to the temporary video file and the path to the `backend/frames/` directory (for output images).
3.  **ML Processing:**
    *   `detect.py` loads the YOLOv5 model.
    *   It opens the video file using OpenCV and iterates through frames (potentially sampling them).
    *   For each relevant frame, YOLOv5 performs object detection.
    *   Custom anomaly rules are applied to the detection results (e.g., "if more than 'X' persons detected").
4.  **Anomaly Handling & Frame Saving:**
    *   If an anomaly is detected according to the rules:
        *   The current video frame is saved as a JPEG image (e.g., `anomaly_frame_<timestamp>.jpg`) into the `backend/frames/` directory on the EC2 instance.
        *   `detect.py` constructs a JSON object containing `alert_type`, `message` (describing the anomaly), `frame_storage_key` (the filename of the saved image), and any other `details` (like detection counts).
        *   This JSON object is printed to the Python script's standard output.
5.  **Result Persistence:**
    *   The Node.js Backend captures the standard output from `detect.py`.
    *   It parses the JSON string.
    *   The Backend constructs an SQL INSERT query with the parsed alert metadata.
    *   This query is executed against the `alerts` table in the AWS RDS PostgreSQL database, storing the alert record.
6.  **Cleanup & Response:**
    *   The Backend deletes the temporary uploaded video file from `backend/uploads/`.
    *   The Backend sends an HTTP response (e.g., 200 OK with a success message or 201 Created) back to the Frontend.
7.  **User Feedback:**
    *   The Frontend receives the response and updates the UI to inform the user of the outcome (e.g., "Upload successful, anomaly detected and logged," or "No anomalies detected," or an error message).

### 3.4 Key Design Principles

*   **Modularity:** Separation of concerns is maintained:
    *   Frontend for presentation.
    *   Backend for orchestration and business logic.
    *   Python script dedicated to ML processing.
    *   Database for persistent storage.
*   **Decoupling (Partial):**
    *   The ML processing is invoked as a separate process, allowing the Node.js backend to remain non-blocking for ML computations.
    *   The database interaction is encapsulated in a `db.js` module.
*   **Statelessness (Backend API):** The backend API itself aims to be stateless where possible, with state primarily managed in the database (alert data) or client-side (UI state). Session management is not part of the current core scope.
*   **Focus on Core Pipeline:** The architecture prioritizes a functional end-to-end flow for the primary use case.

## 4. Technology Stack

The system leverages a range of modern technologies chosen for their suitability to the task, developer productivity, and ecosystem support.

### 4.1 Frontend

*   **React (v18.x):** A popular JavaScript library for building user interfaces.
    *   *Why:* Component-based architecture, strong community, vast ecosystem, declarative programming model makes UI development manageable.
*   **TypeScript (v5.x):** A superset of JavaScript that adds static typing.
    *   *Why:* Enhances code quality, improves maintainability, provides better tooling (autocompletion, refactoring), and helps catch errors early during development, especially in larger projects.
*   **Material-UI (MUI) (v5.x):** A comprehensive suite of React UI components that implement Google's Material Design.
    *   *Why:* Provides pre-built, customizable, and accessible components, accelerating UI development and ensuring a consistent look and feel. Used for the minimal upload interface.
*   **Vite (v5.x):** A modern frontend build tool that provides an extremely fast development server and optimized builds.
    *   *Why:* Significantly improves the developer experience with near-instant Hot Module Replacement (HMR) and efficient production bundling.
*   **Axios (v1.x):** A promise-based HTTP client for the browser and Node.js.
    *   *Why:* Simplifies making HTTP requests from the frontend to the backend API, with features like request/response interception and data transformation.

### 4.2 Backend

*   **Node.js (v18.x / v20.x recommended):** A JavaScript runtime built on Chrome's V8 JavaScript engine.
    *   *Why:* Allows for full-stack JavaScript development, excellent for I/O-bound applications, large package ecosystem (npm), and asynchronous non-blocking nature suits API development.
*   **Express.js (v4.x):** A minimal and flexible Node.js web application framework.
    *   *Why:* Provides a robust set of features for building web and mobile applications (routing, middleware, request handling) without being overly opinionated.
*   **`pg` (node-postgres) (v8.x):** Non-blocking PostgreSQL client for Node.js.
    *   *Why:* The standard and well-maintained library for interacting with PostgreSQL databases from Node.js, offering connection pooling and support for various query types.
*   **`multer` (v1.x):** Node.js middleware for handling `multipart/form-data`, primarily used for file uploads.
    *   *Why:* Simplifies the process of receiving uploaded files in Express.js applications.
*   **`dotenv` (v16.x):** A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
    *   *Why:* Facilitates managing configuration settings (like database credentials, API keys) securely and separately for different environments (development, production).
*   **`cors` (v2.x):** Node.js CORS middleware.
    *   *Why:* Enables Cross-Origin Resource Sharing, necessary when the frontend and backend are served from different origins (ports or domains) during development or deployment.

### 4.3 Machine Learning

*   **Python (v3.9+ recommended):** The de facto language for machine learning and data science.
    *   *Why:* Extensive libraries, strong community support, and performance for numerical computation when combined with libraries like NumPy.
*   **PyTorch (v2.x):** An open-source machine learning framework.
    *   *Why:* Widely used for deep learning research and production. YOLOv5 models are readily available and easily loaded using PyTorch Hub. Offers flexibility and dynamic computation graphs.
*   **YOLOv5 (by Ultralytics):** A state-of-the-art, real-time object detection model.
    *   *Why:* Offers a good balance of speed and accuracy for object detection tasks. Pretrained models are easily accessible, aligning with the project's focus on integration rather than model training.
*   **OpenCV (opencv-python) (v4.x):** An open-source computer vision and machine learning software library.
    *   *Why:* Essential for video processing tasks like reading frames from a video file, image manipulation, and basic image processing operations required before or after ML model inference.

### 4.4 Database

*   **PostgreSQL (v14.x+ on RDS):** A powerful, open-source object-relational database system.
    *   *Why:* Known for its reliability, feature robustness (including strong support for JSON/JSONB data types), extensibility, and SQL compliance. JSONB is particularly useful for storing flexible `details` about alerts.
*   **AWS RDS (Relational Database Service):** A managed database service by Amazon Web Services.
    *   *Why:* Simplifies database setup, operation, and scaling. Handles routine tasks like patching, backups, and provides options for high availability and security. Using PostgreSQL on RDS combines the power of PostgreSQL with the convenience of a managed service.

### 4.5 Deployment & Operations

*   **AWS EC2 (Elastic Compute Cloud):** A web service that provides secure, resizable compute capacity in the cloud.
    *   *Why:* Offers flexible virtual server hosting for the backend application and Python ML script. Provides control over the operating system and server environment. Free Tier options available for development.
*   **PM2 (Process Manager 2):** A production process manager for Node.js applications with a built-in load balancer.
    *   *Why:* Keeps the Node.js backend application alive (restarts on crashes), enables clustering for better performance, simplifies log management, and helps manage application lifecycle in a production environment.
*   **Ubuntu Linux (on EC2):** A popular Linux distribution.
    *   *Why:* Widely used for servers, stable, strong community support, and well-documented, making it a common choice for EC2 instances.
*   **(Optional) Nginx:** A high-performance web server, reverse proxy, load balancer, and HTTP cache.
    *   *Why:* Can be used in front of the Node.js application to handle SSL termination, serve static content efficiently, provide caching, and improve security.

### 4.6 Development Tooling & Quality

*   **Git & GitHub:** Distributed version control system and a platform for hosting Git repositories.
    *   *Why:* Essential for source code management, collaboration, tracking changes, and maintaining project history.
*   **ESLint (v8.x/v9.x):** A pluggable and configurable linter tool for identifying and reporting on patterns in JavaScript and TypeScript.
    *   *Why:* Enforces code quality, maintains consistent coding style, and helps catch potential errors and bad practices early. Configurations like `eslint-config-standard` and specific TypeScript rules are used.
*   **Jest (v29.x):** A delightful JavaScript Testing Framework with a focus on simplicity.
    *   *Why:* Used for unit and integration testing of both frontend (React components with React Testing Library) and backend (Node.js modules and API endpoints with Supertest) code. Supports mocking, assertions, and code coverage reporting.
*   **Visual Studio Code (VS Code):** A popular source-code editor.
    *   *Why:* Excellent support for JavaScript/TypeScript, Python, debugging, Git integration, and a vast library of extensions that enhance developer productivity.

## 5. Project Structure

The project is organized into a monorepo-like structure with separate directories for the frontend and backend components, promoting modularity and independent development where possible.

```
anomaly-detection-system/
├── backend/                            # Node.js/Express.js backend application
│   ├── .env.example                    # Example environment variables file
│   ├── .eslintrc.json                  # ESLint configuration for the backend
│   ├── .gitignore                      # Specifies intentionally untracked files for backend
│   ├── db.js                           # PostgreSQL database connection and query module
│   ├── db_schema.sql                   # SQL script for creating the 'alerts' table
│   ├── frames/                         # Directory for storing saved anomaly frames (served statically)
│   │   └── .gitkeep                    # Keeps the directory in Git even if empty
│   ├── node_modules/                   # (Generated) Backend Node.js dependencies
│   ├── package-lock.json               # Records exact versions of backend dependencies
│   ├── package.json                    # Backend project metadata and dependencies
│   ├── python/                         # Python scripts for ML processing
│   │   ├── detect.py                   # Main Python script for YOLOv5 detection & anomaly rules
│   │   ├── requirements.txt            # Python dependencies for the ML script
│   │   └── venv/                       # (Generated) Python virtual environment (if created here)
│   ├── server.js                       # Main entry point for the Express.js backend server
│   ├── uploads/                        # Temporary storage for uploaded videos (before processing)
│   │   └── .gitkeep                    # Keeps the directory in Git even if empty
│   └── test_pipeline_detailed.sh       # Shell script for testing the backend processing pipeline
│
├── frontend/                           # React/TypeScript frontend application
│   ├── .env.example                    # Example environment variables file for frontend
│   ├── .eslintrc.cjs                   # ESLint configuration for the frontend
│   ├── .gitignore                      # Specifies intentionally untracked files for frontend
│   ├── index.html                      # Main HTML entry point for the Vite app
│   ├── node_modules/                   # (Generated) Frontend Node.js dependencies
│   ├── package-lock.json               # Records exact versions of frontend dependencies
│   ├── package.json                    # Frontend project metadata and dependencies
│   ├── public/                         # Static assets for the frontend
│   │   └── vite.svg
│   ├── src/                            # Frontend source code
│   │   ├── App.css                     # Main application styles
│   │   ├── App.tsx                     # Root React component
│   │   ├── components/                 # Reusable React components
│   │   │   └── UploadSection.tsx       # Component for video upload
│   │   ├── main.tsx                    # Entry point for the React application
│   │   ├── theme.ts                    # MUI theme configuration
│   │   └── vite-env.d.ts               # TypeScript definitions for Vite environment variables
│   ├── tsconfig.json                   # TypeScript compiler configuration for frontend
│   ├── tsconfig.node.json              # TypeScript configuration for Node.js specific files (e.g. Vite config)
│   └── vite.config.ts                  # Vite build tool configuration
│
├── .gitignore                          # Global gitignore for the entire project
└── README.md                           # This comprehensive documentation file
```

**Key Directory and File Explanations:**

*   **`backend/`**: Contains all server-side code.
    *   **`db.js`**: Manages the PostgreSQL connection pool and provides a unified query function. Essential for decoupling database logic.
    *   **`db_schema.sql`**: Defines the structure of the `alerts` table. This script needs to be run once on the RDS database to set up the necessary table.
    *   **`frames/`**: On the EC2 server, this directory will store the JPEG images of video frames where anomalies were detected. Express.js is configured to serve files from this directory.
    *   **`python/detect.py`**: The core ML script. It's invoked by `server.js` to process videos.
    *   **`python/requirements.txt`**: Lists Python packages (PyTorch, OpenCV, etc.) required by `detect.py`.
    *   **`server.js`**: The heart of the backend. It sets up the Express server, defines API routes (like `/api/upload`, `/api/health`), handles file uploads with `multer`, spawns the Python script, and interacts with `db.js` to store alerts.
    *   **`uploads/`**: A temporary holding area for video files uploaded by users before they are processed by the Python script. Files here are deleted after processing.
    *   **`.env.example`**: Template for backend environment variables (database credentials, port, etc.). A `.env` file must be created from this.
*   **`frontend/`**: Contains all client-side code for the React application.
    *   **`src/App.tsx`**: The main application component that orchestrates the UI.
    *   **`src/components/UploadSection.tsx`**: The React component responsible for the video upload interface.
    *   **`src/main.tsx`**: The entry point where the React application is bootstrapped and rendered into the `index.html`.
    *   **`vite.config.ts`**: Configuration for the Vite build tool, defining how the frontend is developed and built.
    *   **`.env.example`**: Template for frontend environment variables (e.g., `VITE_API_BASE_URL`).
*   **`README.md`**: This file, providing detailed documentation.

## 6. Detailed Setup and Installation

This section provides comprehensive, step-by-step instructions to set up the development environment, configure AWS services, and run the application.

### 6.1 Prerequisites

Ensure the following software and accounts are available on your development machine and, where applicable, for deployment:

*   **Node.js and npm:**
    *   Node.js version 18.x or 20.x is recommended. You can download it from [nodejs.org](https://nodejs.org/).
    *   npm (Node Package Manager) is included with Node.js.
*   **Python:**
    *   Python version 3.9 or newer. You can download it from [python.org](https://python.org/).
    *   `pip` (Python package installer) is usually included with Python.
    *   `venv` module (for creating virtual environments) is also typically included.
*   **Git:**
    *   A version control system. Download from [git-scm.com](https://git-scm.com/).
*   **AWS Account:**
    *   An active Amazon Web Services account. If you don't have one, you can create one at [aws.amazon.com](https://aws.amazon.com/). A Free Tier eligible account is sufficient for this project.
*   **AWS CLI (Command Line Interface):**
    *   Optional for some manual AWS console steps, but highly recommended for programmatic access and easier management. Installation instructions: [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
*   **Text Editor/IDE:**
    *   A code editor like Visual Studio Code (recommended), Sublime Text, Atom, etc.
*   **PostgreSQL Client (Optional but Recommended):**
    *   A tool like `psql` (command-line client for PostgreSQL, often installed with PostgreSQL itself) or a GUI tool like pgAdmin or DBeaver for interacting with the RDS database, running `db_schema.sql`, and verifying data.

### 6.2 AWS Account and CLI Configuration

1.  **Sign up/Log in to AWS:** Ensure you have access to your AWS Management Console.
2.  **Configure AWS CLI (if using):**
    *   Open your terminal/command prompt.
    *   Run `aws configure`.
    *   You will be prompted for:
        *   `AWS Access Key ID`: Your IAM user's access key.
        *   `AWS Secret Access Key`: Your IAM user's secret key.
        *   `Default region name`: e.g., `us-east-1`, `eu-west-2`. Choose a region where you want to deploy resources.
        *   `Default output format`: e.g., `json`.
    *   **Security Best Practice:** It's recommended to create an IAM user with specific permissions rather than using root account credentials. For initial setup, permissions to create EC2 instances and RDS databases are needed.

### 6.3 Repository Cloning

1.  Open your terminal or command prompt.
2.  Navigate to the directory where you want to clone the project.
3.  Clone the repository using Git:
    ```bash
    git clone <repository_url>
    cd anomaly-detection-system
    ```
    (Replace `<repository_url>` with the actual URL of the Git repository.)

### 6.4 AWS RDS PostgreSQL Database Setup

This project uses AWS RDS for hosting the PostgreSQL database.

#### 6.4.1 Creating the RDS Instance

1.  **Navigate to RDS Console:**
    *   Log in to the AWS Management Console.
    *   Search for "RDS" and go to the RDS dashboard.
2.  **Create Database:**
    *   Click on "Create database".
    *   **Choose a database creation method:** Select "Standard Create".
    *   **Engine options:**
        *   **Engine type:** Select "PostgreSQL".
        *   **Version:** Choose a recent version, e.g., PostgreSQL 14.x or 15.x (ensure compatibility with the `pg` Node.js client if unsure, but recent versions are generally fine).
    *   **Templates:** Select "Free tier". This will pre-configure settings suitable for the free usage tier, helping avoid charges.
        *   *Note:* If "Free tier" is not available or you require specific settings, you'll need to adjust configurations manually and be mindful of costs.
    *   **Settings:**
        *   **DB instance identifier:** Choose a unique name for your database instance (e.g., `anomaly-db-instance`).
        *   **Master username:** Set a username for the database admin (e.g., `postgres_admin`). *Do not use `postgres` as it might have special privileges or restrictions.*
        *   **Master password:** Set a strong password and confirm it. **Store this password securely.**
    *   **DB instance class:** If using "Free tier", this will likely be pre-selected (e.g., `db.t3.micro` or `db.t2.micro`).
    *   **Storage:** Configure storage settings. Free tier usually offers a certain amount of General Purpose SSD (gp2 or gp3) storage. Default settings are often fine to start.
    *   **Connectivity:**
        *   **Virtual Private Cloud (VPC):** Select your default VPC or a specific one if you have a custom setup.
        *   **DB subnet group:** Usually, the default is fine.
        *   **Public access:** Select "**Yes**". This is crucial for allowing your EC2 instance (and potentially your local machine for development/setup) to connect to the RDS instance.
            *   *Security Note:* For production, it's more secure to set this to "No" and configure VPC peering or other private connectivity methods. For this project's scope and ease of setup for evaluation, "Yes" is acceptable if security groups are configured tightly.
        *   **VPC security group (firewall):**
            *   Choose "Create new" if you don't have an existing one. Name it descriptively (e.g., `rds-postgresql-sg`). This security group will control inbound traffic to the RDS instance. We will configure its rules in the next step.
            *   Or, select an existing security group if you have one prepared.
        *   **Database port:** Default for PostgreSQL is `5432`.
    *   **Database authentication:** "Password authentication" is sufficient.
    *   **Additional configuration (Expand this section):**
        *   **Initial database name:** Enter a name for your first database (e.g., `anomaly_system_db`). If you omit this, you might need to create it manually later.
        *   Review other settings like backup, monitoring, and maintenance. Free tier defaults are usually minimal.
3.  **Create Database:** Click "Create database". Provisioning can take several minutes (10-20 mins).

#### 6.4.2 Configuring Security Groups for RDS

Once the RDS instance is "Available":

1.  **Find RDS Instance Endpoint and Port:**
    *   In the RDS console, click on your newly created database instance.
    *   Note the **Endpoint** (e.g., `anomaly-db-instance.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com`) and **Port** (e.g., `5432`). These will be needed for the backend `.env` file.
2.  **Configure RDS Security Group Inbound Rules:**
    *   Navigate to the "Connectivity & security" tab of your RDS instance.
    *   Click on the active VPC security group link under "Security".
    *   Select the security group (e.g., `rds-postgresql-sg`).
    *   Go to the "Inbound rules" tab and click "Edit inbound rules".
    *   **Rule 1: Allow access from your EC2 instance's Security Group (for deployed app):**
        *   Click "Add rule".
        *   **Type:** Select "PostgreSQL" (it will pre-fill TCP and port 5432).
        *   **Source:** Select "Custom" and start typing the ID of the Security Group your EC2 instance will use (e.g., `sg-xxxxxxxxxxxxxxxxx`). This ensures only your EC2 instance can reach the database.
        *   **Description (Optional):** e.g., "Allow PostgreSQL from EC2 instance".
    *   **Rule 2: Allow access from your local IP (for development and schema setup):**
        *   Click "Add rule".
        *   **Type:** Select "PostgreSQL".
        *   **Source:** Select "My IP". AWS will auto-fill your current public IP address.
            *   *Note:* If your IP address is dynamic, you may need to update this rule periodically, or use a broader range (less secure).
        *   **Description (Optional):** e.g., "Allow PostgreSQL from local dev IP".
    *   Click "Save rules".

#### 6.4.3 Database Schema Initialization

The `backend/db_schema.sql` file contains the SQL `CREATE TABLE` statement for the `alerts` table. You need to run this against your newly created RDS database.

1.  **Connect to the RDS Database:**
    You can use `psql` (command-line) or a GUI tool like pgAdmin/DBeaver.

    *   **Using `psql`:**
        ```bash
        psql --host=<RDS_ENDPOINT> --port=<PORT> --username=<MASTER_USERNAME> --dbname=<INITIAL_DATABASE_NAME>
        ```
        Replace placeholders with your RDS instance details. You'll be prompted for the master password.

        Example:
        ```bash
        psql --host=anomaly-db-instance.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com --port=5432 --username=postgres_admin --dbname=anomaly_system_db
        ```

    *   **Using a GUI Tool (e.g., pgAdmin):**
        *   Add a new server connection.
        *   Host: `<RDS_ENDPOINT>`
        *   Port: `<PORT>`
        *   Maintenance Database: `<INITIAL_DATABASE_NAME>` (e.g., `anomaly_system_db`)
        *   Username: `<MASTER_USERNAME>`
        *   Password: Your master password.
        *   **SSL Mode:** You might need to set SSL mode to `require` or `prefer`. Sometimes `allow` works. If `disable` is chosen and RDS enforces SSL, connection will fail. Test `require` first. Download the AWS RDS CA certificate if needed by your client for full SSL verification (see RDS documentation for "Connecting to a DB instance running the PostgreSQL database engine").

2.  **Execute `db_schema.sql`:**
    *   **`psql`:** Once connected, you can use the `\i` command:
        ```sql
        \i /path/to/your/project/anomaly-detection-system/backend/db_schema.sql
        ```
        (Adjust the path accordingly).
    *   **GUI Tool:** Open an SQL query window, paste the content of `backend/db_schema.sql` into it, and execute the query.

    The `db_schema.sql` content:
    ```sql
    CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        alert_type VARCHAR(255) NOT NULL,
        message TEXT,
        frame_storage_key VARCHAR(1024),
        details JSONB
    );

    -- Optional: Add an index for faster querying by timestamp or alert_type
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts (alert_type);
    ```

3.  **Verify Table Creation:**
    *   **`psql`:**
        ```sql
        \dt
        ```
        You should see the `alerts` table listed.
        ```sql
        \d alerts
        ```
        To see the table structure.
    *   **GUI Tool:** Refresh the table list in your database schema.

### 6.5 Backend Setup

Navigate to the `backend` directory of the project:
```bash
cd backend
```

#### 6.5.1 Node.js and npm

Ensure Node.js (v18+) and npm are installed as per prerequisites.

#### 6.5.2 Environment Configuration (`.env` file)

1.  Create a `.env` file in the `backend/` directory by copying `backend/.env.example`:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `backend/.env` file with your specific configurations:
    ```dotenv
    # Server Configuration
    PORT=3001 # Port the backend server will listen on

    # Database Configuration (AWS RDS PostgreSQL)
    DB_HOST=your_rds_instance_endpoint.xxxxxxxx.region.rds.amazonaws.com # e.g., anomaly-db-instance.cxxxxxxxx.us-east-1.rds.amazonaws.com
    DB_PORT=5432
    DB_USER=your_rds_master_username # e.g., postgres_admin
    DB_PASSWORD=your_rds_master_password
    DB_NAME=your_initial_database_name # e.g., anomaly_system_db
    DB_SSL_REJECT_UNAUTHORIZED=false # Set to 'true' for production with proper CA cert, 'false' for simpler dev setup with AWS default SSL
                                      # If 'true' and pg can't verify CA, connection fails. 'false' allows self-signed or default AWS RDS SSL.

    # Python Script Configuration
    PYTHON_EXECUTABLE_PATH=python # Or absolute path to python in venv e.g., /path/to/project/backend/python/venv/bin/python
    PYTHON_SCRIPT_PATH=./python/detect.py # Relative to backend directory or absolute path
    FRAMES_OUTPUT_DIR=./frames # Relative to backend directory or absolute path
    UPLOADS_DIR=./uploads # Relative to backend directory or absolute path

    # YOLOv5 Model Configuration (passed to Python script if needed, or managed within Python)
    # YOLOV5_MODEL_NAME=yolov5s # Example, if passed as env var to Python

    # Logging (optional, for more verbose logging if implemented in Node)
    # LOG_LEVEL=debug
    ```
    **Explanation of `.env` variables:**
    *   `PORT`: Port for the Node.js backend server.
    *   `DB_HOST`: The endpoint URL of your AWS RDS PostgreSQL instance.
    *   `DB_PORT`: Port for the RDS instance (usually `5432`).
    *   `DB_USER`: The master username you configured for RDS.
    *   `DB_PASSWORD`: The master password for your RDS user.
    *   `DB_NAME`: The initial database name you created in RDS.
    *   `DB_SSL_REJECT_UNAUTHORIZED`:
        *   For **initial development** and simplicity with default AWS RDS SSL certificates, `false` is often easier as it bypasses strict CA verification by the `pg` client. AWS RDS still encrypts connections.
        *   For **production**, set this to `true` and ensure your Node.js environment can validate the AWS RDS CA certificate (may involve providing the CA bundle to `pg`). This offers stronger SSL security.
    *   `PYTHON_EXECUTABLE_PATH`: Path to the Python interpreter. `python` or `python3` usually works if it's in your system PATH. For virtual environments, it's best to use the path to the Python executable within the venv (e.g., `backend/python/venv/bin/python` on Linux/macOS).
    *   `PYTHON_SCRIPT_PATH`: Path to the `detect.py` script. Relative paths are from the `backend` directory.
    *   `FRAMES_OUTPUT_DIR`: Directory where the Python script will save detected anomaly frames.
    *   `UPLOADS_DIR`: Directory where `multer` will temporarily store uploaded videos.

#### 6.5.3 Python Virtual Environment and Dependencies

It's highly recommended to use a Python virtual environment for the ML script to manage its dependencies separately.

1.  Navigate to the `backend/python/` directory:
    ```bash
    cd python  # If you were in backend/, otherwise adjust path
    ```
    If you're in the project root: `cd backend/python`
2.  Create a virtual environment (e.g., named `venv`):
    ```bash
    python -m venv venv
    # Or on some systems: python3 -m venv venv
    ```
3.  Activate the virtual environment:
    *   On Linux/macOS:
        ```bash
        source venv/bin/activate
        ```
    *   On Windows (Git Bash or similar):
        ```bash
        source venv/Scripts/activate
        ```
    *   On Windows (Command Prompt):
        ```bash
        .\venv\Scripts\activate
        ```
    Your command prompt should now be prefixed with `(venv)`.
4.  Install Python dependencies from `requirements.txt`:
    ```bash
    pip install -r requirements.txt
    ```
    The `requirements.txt` should contain:
    ```
    torch
    torchvision
    torchaudio
    opencv-python
    numpy
    # Potentially specific versions like:
    # torch==2.0.1
    # torchvision==0.15.2
    # opencv-python==4.8.0.74
    ```
    *Note: Installing PyTorch can take some time as it's a large library.*
5.  **Important for `.env`:** After setting up the virtual environment, update `PYTHON_EXECUTABLE_PATH` in `backend/.env` if you want to ensure the backend specifically uses this venv's Python:
    *   Linux/macOS: `PYTHON_EXECUTABLE_PATH=./python/venv/bin/python` (if `.env` is in `backend/`)
    *   Windows: `PYTHON_EXECUTABLE_PATH=python\\venv\\Scripts\\python.exe` (adjust path separator)
    Alternatively, ensure the Python script (`detect.py`) starts with a shebang pointing to the venv's Python or that the server environment (when deployed) has the correct Python activated system-wide for the user running Node.js.
6.  Deactivate the virtual environment when you're done (you'll reactivate it when working on Python code):
    ```bash
    deactivate
    ```
    The Node.js backend will still invoke the correct Python if `PYTHON_EXECUTABLE_PATH` in `.env` points into the venv.

#### 6.5.4 Installing Backend Dependencies and Running

1.  Navigate back to the `backend/` directory (if you were in `backend/python/`):
    ```bash
    cd .. # If in backend/python/
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  Run ESLint to check code quality (optional, but good practice):
    ```bash
    npm run lint
    ```
    Fix any reported issues.
4.  Start the backend server for development (uses `nodemon` for auto-restarting on changes):
    ```bash
    npm run dev
    ```
    Or, for a standard start (e.g., in production scripts later):
    ```bash
    npm start
    ```
    You should see output indicating the server is running, e.g.:
    ```
    [nodemon] starting `node server.js`
    Backend server listening on port 3001
    Attempting to connect to database...
    Successfully connected to PostgreSQL database: anomaly_system_db
    ```
    If there are database connection errors, double-check your `.env` settings and RDS security group rules.

### 6.6 Frontend Setup (Minimal UI)

Navigate to the `frontend` directory of the project:
```bash
cd ../frontend # if in backend/
# or from project root:
# cd frontend
```

#### 6.6.1 Environment Configuration (`.env` file)

1.  Create a `.env` file in the `frontend/` directory by copying `frontend/.env.example`:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `frontend/.env` file:
    ```dotenv
    # API base URL for the backend
    VITE_API_BASE_URL=http://localhost:3001/api
    ```
    *   `VITE_API_BASE_URL`: The URL where the frontend will send API requests.
        *   For local development, this should point to your local backend server (e.g., `http://localhost:3001/api`).
        *   When deploying, this will need to be updated to the public URL/IP of your deployed EC2 backend.
    *   Vite requires environment variables exposed to the client-side code to be prefixed with `VITE_`.

#### 6.6.2 Installing Frontend Dependencies and Running

1.  Install Node.js dependencies:
    ```bash
    npm install
    ```
2.  Run ESLint to check code quality (optional):
    ```bash
    npm run lint
    ```
    Fix any reported issues.
3.  Start the frontend development server (uses Vite):
    ```bash
    npm run dev
    ```
    Vite will compile the application and start a development server, typically on `http://localhost:5173` (the port might vary if 5173 is taken). The terminal output will show the URL.

### 6.7 Initial Database Connection Troubleshooting Insights

Common issues preventing Node.js backend from connecting to AWS RDS PostgreSQL:

*   **Incorrect `.env` Credentials:** Double-check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `backend/.env`. Typos are common.
*   **RDS Security Group Inbound Rules:**
    *   The security group associated with your RDS instance *must* have an inbound rule allowing PostgreSQL traffic (TCP port 5432) from the source IP/Security Group of your Node.js application (your local IP for dev, EC2 instance's private IP or security group when deployed).
    *   If RDS instance's "Public access" is "No", your Node.js application must be within the same VPC and have appropriate routing and security group rules, or use VPC peering/PrivateLink. (For this project, "Public access: Yes" with tight SG rules is simpler for initial setup).
*   **RDS Instance Not "Available":** Wait for the RDS instance status to be "Available" in the AWS console.
*   **SSL Configuration (`DB_SSL_REJECT_UNAUTHORIZED`):**
    *   As mentioned, RDS PostgreSQL instances use SSL by default. The `pg` Node.js client will attempt an SSL connection.
    *   If `DB_SSL_REJECT_UNAUTHORIZED=true` (strictest, best for prod), `pg` will try to verify the server's certificate against known CAs. If it can't verify (e.g., missing AWS RDS CA bundle in the Node.js environment's trust store), the connection fails.
    *   Setting `DB_SSL_REJECT_UNAUTHORIZED=false` tells `pg` to accept the server's certificate even if it cannot be verified against its CA list. This is generally acceptable for development when connecting to a trusted RDS endpoint. Connection is still SSL encrypted.
    *   Some client tools or drivers might require explicitly setting SSL mode to `require`. The `pg` library usually handles this well if SSL options are passed correctly in `db.js`.
    ```javascript
    // backend/db.js snippet example with SSL config
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        ? { rejectUnauthorized: true, /* ca: fs.readFileSync('/path/to/aws-rds-ca.pem').toString(), */ }
        : { rejectUnauthorized: false }, // Simpler for dev, still uses SSL if server offers
    });
    ```
*   **Network ACLs (NACLs):** While Security Groups are stateful, NACLs are stateless. Ensure your VPC's NACLs associated with the RDS subnet allow both inbound traffic on port 5432 and outbound traffic on ephemeral ports (1024-65535) for the return connection. Default NACLs usually allow all traffic, but custom ones might block.
*   **Local Firewall:** Ensure your local machine's firewall (if any) isn't blocking outbound connections on port 5432.

## 7. Running the Application Locally

After completing the setup steps, you can run the application locally for development and testing.

### 7.1 Starting the Backend Server

1.  Open a terminal window.
2.  Navigate to the `backend/` directory:
    ```bash
    cd /path/to/project/anomaly-detection-system/backend
    ```
3.  Ensure your Python virtual environment (if you chose to specify its Python executable in `.env`) contains the necessary dependencies (`pip install -r python/requirements.txt` from within the activated venv or globally if not using venv and relying on system Python).
4.  Start the backend development server:
    ```bash
    npm run dev
    ```
    The server should start, connect to the database, and listen on the port specified in `backend/.env` (default: `3001`).

### 7.2 Starting the Frontend Development Server

1.  Open a *new* terminal window (keep the backend server running).
2.  Navigate to the `frontend/` directory:
    ```bash
    cd /path/to/project/anomaly-detection-system/frontend
    ```
3.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    Vite will compile the app and make it available, typically at `http://localhost:5173`. The terminal will display the exact URL.

### 7.3 Accessing the Application

1.  Open a web browser (Chrome, Firefox, Edge recommended).
2.  Navigate to the frontend URL (e.g., `http://localhost:5173`).
3.  You should see the minimal UI for video upload. You can now test the end-to-end pipeline locally.

## 8. Testing and Verification

Thorough testing is crucial. This project relies on manual end-to-end testing for the core pipeline and a utility script for specific backend verification.

### 8.1 Manual End-to-End Testing Procedure

This procedure verifies the core functionality: video upload, anomaly detection, frame saving, and database logging.

1.  **Prerequisites:**
    *   Backend server is running locally (or on EC2).
    *   Frontend development server is running locally (or frontend is built and served if testing deployed version).
    *   AWS RDS PostgreSQL database is accessible and the `alerts` table exists.
    *   Have a sample video file ready (e.g., a short MP4 clip). Ideally, have one video that *should* trigger the anomaly (e.g., multiple people if that's the rule) and one that *should not*.
2.  **Steps:**
    *   **Access the Frontend:** Open the application in your web browser (e.g., `http://localhost:5173`).
    *   **Select Video File:**
        *   Click the "Choose File" (or similar) button in the `UploadSection` component.
        *   Select your sample video file.
    *   **Upload Video:**
        *   Click the "Upload Video" button.
    *   **Monitor Frontend:**
        *   Observe status messages displayed on the frontend. It should indicate "Uploading...", then "Processing...", and finally a success or error message.
        *   Check the browser's developer console (Network tab and Console tab) for any HTTP errors or client-side JavaScript errors.
    *   **Monitor Backend Logs:**
        *   Observe the terminal where your backend server (`npm run dev`) is running.
        *   Look for log messages indicating:
            *   File received.
            *   Python script invocation.
            *   `stdout` (JSON output) and `stderr` (logs/errors) from the Python script.
            *   Database insertion attempt and success/failure.
            *   Temporary file deletion.
    *   **Check `backend/frames/` Directory (if anomaly detected):**
        *   If the Python script detected an anomaly and saved a frame, navigate to the `backend/frames/` directory on your local machine (or EC2 instance if deployed).
        *   Verify that a new JPEG image file has been created. The filename should match the `frame_storage_key` logged by the backend and stored in the database.
        *   Open the image to confirm it's the correct frame from the video where the anomaly occurred.
    *   **Check Database:**
        *   Connect to your AWS RDS PostgreSQL database using `psql` or a GUI tool.
        *   Query the `alerts` table:
            ```sql
            SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 5;
            ```
        *   If an anomaly was detected and processed successfully by the backend, a new row should exist in the `alerts` table.
        *   Verify the `timestamp`, `alert_type`, `message`, `frame_storage_key`, and `details` (JSONB content) fields are populated correctly and match the detected anomaly. The `frame_storage_key` should correspond to the filename in the `frames/` directory.
    *   **Check `backend/uploads/` Directory:**
        *   Verify that the temporary uploaded video file has been deleted from the `backend/uploads/` directory after processing.
3.  **Repeat Testing:**
    *   Test with a video that *should not* trigger an anomaly. Verify no frame is saved and no alert is logged in the database. The frontend should report accordingly.
    *   Test with various video formats (if `detect.py` supports them) or edge cases (very short video, very large video if constraints exist).

### 8.2 Automated Pipeline Test Script (`test_pipeline_detailed.sh`)

The `backend/test_pipeline_detailed.sh` script is a utility to perform a more direct test of the backend's video processing pipeline, bypassing the frontend UI.

1.  **Purpose:**
    *   To simulate a file upload directly to the backend `/api/upload` endpoint using `curl`.
    *   To verify that the backend correctly invokes the Python script and processes its output.
    *   To check if an alert record is created in the database for a known-to-be-anomalous video.
2.  **Prerequisites:**
    *   The backend server must be running.
    *   `curl` and `jq` (command-line JSON processor) must be installed on the machine running the script.
    *   A sample video file (e.g., `sample_video.mp4`) must exist in the `backend/` directory (or modify the script to point to its location). This video should ideally be one that is known to trigger the anomaly detection logic in `detect.py`.
    *   The `DB_` environment variables for database connection must be accessible to `psql` if the script includes database verification steps.
3.  **How to Run:**
    *   Open a terminal in the `backend/` directory.
    *   Make the script executable: `chmod +x test_pipeline_detailed.sh`
    *   Run the script: `./test_pipeline_detailed.sh`
4.  **Expected Behavior and Output:**
    *   The script will use `curl` to send a POST request with the sample video to `http://localhost:3001/api/upload`.
    *   It will print the HTTP response from the server.
    *   It might include `jq` commands to parse the JSON response if applicable.
    *   If the script includes database checks, it might use `psql` to query the `alerts` table and verify that a new record corresponding to the test video has been created.
    *   The script should clearly indicate whether the test passed or failed based on the server's response and any subsequent checks.
    *   Check `backend/frames/` and the database manually as well to confirm the script's assertions.
5.  **Customization:**
    *   You may need to modify the script:
        *   To point to the correct sample video file.
        *   To adjust `curl` parameters if your API endpoint changes.
        *   To enhance database verification steps (e.g., checking specific fields of the newly created alert).

    *Example snippet from a conceptual `test_pipeline_detailed.sh`*:
    ```bash
    #!/bin/bash
    # Basic pipeline test script

    VIDEO_FILE="sample_video_with_anomaly.mp4" # Ensure this file exists and causes an anomaly
    UPLOAD_URL="http://localhost:3001/api/upload"
    FRAMES_DIR="./frames"
    EXPECTED_ALERT_TYPE="Multiple_Persons_Detected" # Example

    echo "Testing anomaly detection pipeline..."
    # Create a dummy sample video if it doesn't exist (for placeholder)
    # touch $VIDEO_FILE

    # Get initial count of alerts and frames
    INITIAL_ALERT_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM alerts;" | xargs)
    # ... (similar for frames if needed)

    echo "Uploading $VIDEO_FILE to $UPLOAD_URL..."
    RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -F "video=@$VIDEO_FILE" $UPLOAD_URL)

    if [ "$RESPONSE_CODE" -eq 200 ] || [ "$RESPONSE_CODE" -eq 201 ]; then
        echo "Upload successful with HTTP status: $RESPONSE_CODE"

        # Verify alert in DB
        # This is a simplified check; more robust check would look for specific alert
        sleep 5 # Give time for processing
        FINAL_ALERT_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM alerts;" | xargs)

        if [ "$FINAL_ALERT_COUNT" -gt "$INITIAL_ALERT_COUNT" ]; then
            echo "SUCCESS: New alert created in database."
            # Further check: LATEST_ALERT_TYPE=$(psql ... "SELECT alert_type FROM alerts ORDER BY timestamp DESC LIMIT 1;")
            # if [ "$LATEST_ALERT_TYPE" == "$EXPECTED_ALERT_TYPE" ]; then echo "Alert type matches."; else echo "Alert type mismatch"; fi
        else
            echo "FAILURE: No new alert created in database."
            exit 1
        fi
        # Add check for frame file existence in FRAMES_DIR
    else
        echo "FAILURE: Upload failed with HTTP status: $RESPONSE_CODE"
        exit 1
    fi
    ```
    *(This is a conceptual script. The actual one should be adapted with correct DB credentials or assume they are in the environment for psql).*

### 8.3 Comprehensive Verification Checklist

An evaluator or tester can use this checklist to verify the core functionality of the implemented pipeline:

| #   | Feature / Functionality                      | Verification Steps                                                                                                                                                              | Expected Outcome                                                                                                     | Status (Pass/Fail) | Notes |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| **1** | **Backend Server Startup**                 | Run `npm run dev` in `backend/`.                                                                                                                                              | Server starts without errors, logs "listening on port..." and "Successfully connected to PostgreSQL database...".    |                    |       |
| **2** | **Frontend Server Startup**                | Run `npm run dev` in `frontend/`.                                                                                                                                             | Vite server starts, provides a local URL (e.g., `http://localhost:5173`). Application loads in browser.             |                    |       |
| **3** | **Video Upload UI**                        | Access frontend URL. Can you see the file input and upload button?                                                                                                              | UI elements are visible and interactive.                                                                             |                    |       |
| **4** | **Video Selection**                        | Click "Choose File", select a valid video file.                                                                                                                                 | File name appears, or some indication of selection.                                                                  |                    |       |
| **5** | **Successful Video Upload (No Anomaly)**   | Upload a video *not* expected to trigger an anomaly.                                                                                                                            | Frontend: "Processing complete. No anomalies detected" (or similar). Backend logs: Python script runs, no JSON output or "no anomaly" message. DB: No new alert. `frames/`: No new frame. `uploads/`: Temp file deleted. |                    |       |
| **6** | **Successful Video Upload (With Anomaly)** | Upload a video *expected* to trigger an anomaly.                                                                                                                                | Frontend: "Anomaly detected and logged!" (or similar). Backend logs: Python script output JSON with alert data. DB: New alert record created with correct `alert_type`, `message`, `frame_storage_key`, `details`. `frames/`: New frame image saved. `uploads/`: Temp file deleted. |                    |       |
| **7** | **Frame Image Verification**               | For an anomalous upload, open the saved frame image from `backend/frames/`.                                                                                                     | Image is the correct frame from the video where the anomaly occurred. Image is viewable.                           |                    |       |
| **8** | **Alert Data Verification (Database)**     | For an anomalous upload, query the `alerts` table in RDS. Check all fields (timestamp, alert\_type, message, frame\_storage\_key, details).                                  | Data is accurate, consistent, and reflects the detected anomaly. `frame_storage_key` matches saved frame filename. |                    |       |
| **9** | **`/api/health` Endpoint**                 | Access `http://<backend_host>:<backend_port>/api/health` in a browser or via `curl`.                                                                                         | Returns `{"status": "healthy", "database": "connected"}` (or similar successful health check response).            |                    |       |
| **10**| **Error Handling (e.g., Invalid File)**    | Attempt to upload an unsupported file type or a very large file (if size limits are implicitly present).                                                                        | Graceful error message on frontend. Backend logs appropriate error. System does not crash.                        |                    |       |
| **11**| **ESLint Checks (Backend)**                | Run `npm run lint` in `backend/`.                                                                                                                                              | Passes all ESLint checks without errors.                                                                             |                    |       |
| **12**| **ESLint Checks (Frontend)**               | Run `npm run lint` in `frontend/`.                                                                                                                                              | Passes all ESLint checks without errors.                                                                             |                    |       |
| **13**| **`test_pipeline_detailed.sh`** (if used)  | Run the test script as per its instructions.                                                                                                                                    | Script reports success, indicating backend pipeline processed the test video and logged an alert.                    |                    |       |

## 9. Deployment to AWS EC2

This section details deploying the backend application (Node.js server and Python ML script) to an AWS EC2 instance.

### 9.1 EC2 Instance Launch and Configuration

1.  **Navigate to EC2 Console:**
    *   Log in to the AWS Management Console.
    *   Search for "EC2" and go to the EC2 dashboard.
2.  **Launch Instance:**
    *   Click "Launch instances".
    *   **Name and tags:** Give your instance a name (e.g., `anomaly-detection-server`).
    *   **Application and OS Images (Amazon Machine Image - AMI):**
        *   Select an AMI. "Ubuntu Server" (e.g., 22.04 LTS or 20.04 LTS) is recommended. Choose an `x86_64` or `arm64` architecture depending on your preference (ensure software compatibility if choosing ARM). Free Tier eligible AMIs are marked.
    *   **Instance type:**
        *   Select a Free Tier eligible instance type (e.g., `t2.micro` or `t3.micro` if `t2.micro` is not available in your region for new accounts).
        *   *Note:* For running YOLOv5, `t2.micro` / `t3.micro` might be slow due to limited CPU/RAM. Processing times for videos will be longer. For better performance, a more powerful instance (e.g., `t3.medium` or a CPU-optimized instance) would be needed, but this would incur costs.
    *   **Key pair (login):**
        *   Create a new key pair or choose an existing one. If creating new:
            *   Provide a key pair name (e.g., `my-ec2-key`).
            *   Choose key pair type (RSA) and format (.pem for OpenSSH).
            *   Click "Create key pair". The `.pem` file will download. **Store this file securely; it's essential for SSH access.**
    *   **Network settings:**
        *   Click "Edit".
        *   **VPC:** Select your desired VPC (usually default).
        *   **Subnet:** Choose a subnet (no preference for a single instance usually).
        *   **Auto-assign public IP:** Set to "Enable". This gives the EC2 instance a public IP address to access it from the internet.
        *   **Firewall (security groups):**
            *   "Create security group" or "Select existing security group".
            *   Name it descriptively (e.g., `anomaly-server-sg`).
            *   **Inbound security groups rules:**
                *   **Rule 1 (SSH):**
                    *   Type: `SSH`
                    *   Protocol: `TCP`
                    *   Port range: `22`
                    *   Source type: `My IP` (for secure access only from your IP) or `Anywhere IPv4` (0.0.0.0/0 - less secure, use with caution). For evaluation, providing reviewers with a temporary `Anywhere` rule might be necessary if their IPs are unknown, or updating it to their IPs.
                *   **Rule 2 (HTTP for Backend):**
                    *   Type: `Custom TCP`
                    *   Protocol: `TCP`
                    *   Port range: `3001` (or whatever port your backend Node.js server will listen on, as defined in `backend/.env`).
                    *   Source type: `Anywhere IPv4` (0.0.0.0/0) so the frontend can access it. If using Nginx on port 80, then add a rule for port 80 instead or additionally.
                *   **(Optional) Rule 3 (HTTPS):** If you plan to set up HTTPS with Nginx, add a rule for port `443`.
            *   *Important Note:* The EC2 instance's security group (`anomaly-server-sg`) must be allowed to access the RDS instance on port 5432. This was configured in the RDS security group's inbound rules (Section 6.4.2), where you added `anomaly-server-sg` as a source.
    *   **Configure storage:**
        *   Free Tier eligible instances usually come with up to 30 GB of EBS General Purpose SSD (gp2/gp3) storage. The default (e.g., 8GB or 10GB) might be sufficient, but consider increasing it if you expect to store many frames or have large Python dependencies. 20-30GB is safer.
    *   **Advanced details:** Default settings are usually fine.
3.  **Launch instance:** Click "Launch instance". It will take a few minutes to initialize.

### 9.2 Connecting to the EC2 Instance

1.  **Get Public IP Address:**
    *   In the EC2 console, select your instance.
    *   Note the "Public IPv4 address".
2.  **SSH into the Instance:**
    *   Open your terminal or an SSH client.
    *   Ensure your `.pem` key file has the correct permissions:
        ```bash
        chmod 400 /path/to/your/my-ec2-key.pem
        ```
    *   Connect using SSH:
        ```bash
        ssh -i /path/to/your/my-ec2-key.pem ubuntu@<EC2_PUBLIC_IP_ADDRESS>
        ```
        (Replace `ubuntu` with `ec2-user` if you chose an Amazon Linux AMI. For Ubuntu AMIs, the user is `ubuntu`).
        Confirm the connection when prompted.

### 9.3 Server Environment Setup

Once connected to your EC2 instance via SSH, install necessary software:

1.  **Update Package Lists:**
    ```bash
    sudo apt update
    sudo apt upgrade -y
    ```
2.  **Install Git:**
    ```bash
    sudo apt install git -y
    ```
3.  **Install Node.js and npm:**
    *   It's recommended to install a specific Node.js version (e.g., 18.x or 20.x) using NodeSource or NVM (Node Version Manager).
    *   **Using NodeSource (example for Node.js 20.x):**
        ```bash
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        ```
        Verify installation: `node -v` and `npm -v`.
4.  **Install Python, pip, and venv:**
    *   Ubuntu Server AMIs usually come with Python 3. Verify: `python3 --version`.
    *   Install pip and venv if not present:
        ```bash
        sudo apt install python3-pip python3-venv -y
        ```
5.  **Install PM2 (Process Manager for Node.js):**
    ```bash
    sudo npm install pm2 -g
    ```
6.  **(Optional) Install Nginx (if using as a reverse proxy):**
    ```bash
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx # Start Nginx on boot
    ```
    Verify Nginx by navigating to your EC2's public IP in a browser; you should see the Nginx welcome page.

### 9.4 Application Deployment

1.  **Clone Your Project Repository:**
    On the EC2 instance, navigate to a suitable directory (e.g., `/home/ubuntu/` or `/var/www/`) and clone your project:
    ```bash
    cd /home/ubuntu/ # Or your preferred location
    git clone <your_repository_url>
    cd anomaly-detection-system/
    ```
2.  **Set up Backend:**
    *   Navigate to the `backend/` directory: `cd backend/`
    *   **Create `.env` file:**
        ```bash
        cp .env.example .env
        ```
        Edit `backend/.env` using a terminal editor like `nano` or `vim`:
        ```bash
        nano .env
        ```
        **Crucially update:**
        *   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` to your RDS details.
        *   `PYTHON_EXECUTABLE_PATH` may need to be `python3` or the full path to python3 within a venv you set up on EC2.
        *   Other paths if your deployment structure differs from local.
    *   **Set up Python Virtual Environment and Dependencies (inside `backend/python/`):**
        ```bash
        cd python/
        python3 -m venv venv
        source venv/bin/activate
        pip3 install -r requirements.txt
        deactivate # Optional, PM2 can be configured to use the venv
        cd .. # Back to backend/
        ```
        Ensure `backend/.env`'s `PYTHON_EXECUTABLE_PATH` points to `/home/ubuntu/anomaly-detection-system/backend/python/venv/bin/python3` or similar.
    *   **Install Node.js Dependencies:**
        ```bash
        npm install
        ```
3.  **Set up Frontend (Build static files):**
    The frontend is a React SPA. For deployment, you need to build the static files.
    *   Navigate to the `frontend/` directory: `cd ../frontend/` (if in `backend/`)
    *   **Create `.env` file (if needed for build time, or configure Nginx to serve with correct API URL):**
        The `VITE_API_BASE_URL` in `frontend/.env` should be set to your EC2 public IP or domain name and backend port, e.g., `VITE_API_BASE_URL=http://<EC2_PUBLIC_IP>:3001/api`.
        ```bash
        cp .env.example .env
        nano .env # Update VITE_API_BASE_URL
        ```
    *   **Install Node.js Dependencies:**
        ```bash
        npm install
        ```
    *   **Build the Frontend:**
        ```bash
        npm run build
        ```
        This will create a `dist/` directory in `frontend/` containing the static HTML, CSS, and JavaScript files. These files can be served by Nginx or another web server. For simplicity in this project, direct access to the Node.js backend is assumed unless Nginx is explicitly configured. The minimal frontend can run locally, pointed at the deployed EC2 backend. If you want to serve the frontend from EC2, you'd typically use Nginx.

### 9.5 Running the Application with PM2

PM2 will manage your Node.js backend process.

1.  **Navigate to the `backend/` directory:**
    ```bash
    cd /home/ubuntu/anomaly-detection-system/backend/
    ```
2.  **Create a PM2 Ecosystem File (Optional but Recommended):**
    Create a file named `ecosystem.config.js` in the `backend/` directory:
    ```bash
    nano ecosystem.config.js
    ```
    Add the following configuration:
    ```javascript
    module.exports = {
      apps: [{
        name: 'anomaly-backend', // Application name
        script: 'server.js',    // Script to be run
        cwd: __dirname,         // Set current working directory to script's directory
        watch: false,           // Disable watch mode for production (or configure carefully)
        env: {                  // Environment variables (can also be sourced from .env by Node.js app)
          NODE_ENV: 'production',
          // You can define other env vars here, but .env file is often preferred
        },
        // If using Python venv and .env does not specify absolute path:
        // interpreter_args: "--experimental-modules", // If using ES modules in server.js
        // You might need to ensure the Python script is executable and has the correct shebang
        // or PM2 uses a shell that has the venv activated.
        // Easiest is setting PYTHON_EXECUTABLE_PATH in .env to the venv's python.
      }]
    };
    ```
3.  **Start the Application with PM2:**
    *   If using `ecosystem.config.js`:
        ```bash
        pm2 start ecosystem.config.js
        ```
    *   Alternatively, to start `server.js` directly:
        ```bash
        pm2 start server.js --name anomaly-backend
        ```
4.  **Check Application Status:**
    ```bash
    pm2 list
    pm2 logs anomaly-backend # Or logs for all: pm2 logs
    ```
    Look for any errors.
5.  **Save PM2 Process List (to restart on server reboot):**
    ```bash
    pm2 save
    pm2 startup # This will output a command to run to enable startup script
    # Execute the command output by `pm2 startup` (e.g., sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu)
    ```

### 9.6 (Optional) Nginx as a Reverse Proxy

If you want to use Nginx (e.g., to serve on port 80, handle SSL, serve static frontend files):

1.  **Configure Nginx:**
    Create a new Nginx server block configuration:
    ```bash
    sudo nano /etc/nginx/sites-available/anomaly-app
    ```
    Add a configuration like this (adjust as needed):
    ```nginx
    server {
        listen 80;
        server_name <EC2_PUBLIC_IP_OR_DOMAIN>; # Your EC2's public IP or domain

        location /api/ { # Proxy backend API requests
            proxy_pass http://localhost:3001/; # Assuming Node.js runs on port 3001
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # To serve static frames directly via Nginx (more efficient)
        location /frames/ {
            alias /home/ubuntu/anomaly-detection-system/backend/frames/;
            expires 7d; # Optional: set cache expiration for frame images
            autoindex off;
        }

        # To serve the built frontend static files
        location / {
            root /home/ubuntu/anomaly-detection-system/frontend/dist;
            try_files $uri $uri/ /index.html;
        }

        # Access and error logs (optional but good for debugging)
        access_log /var/log/nginx/anomaly-app.access.log;
        error_log /var/log/nginx/anomaly-app.error.log;
    }
    ```
2.  **Enable the Site and Test Nginx Configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/anomaly-app /etc/nginx/sites-enabled/
    sudo nginx -t # Test configuration
    ```
    If `nginx -t` reports success:
    ```bash
    sudo systemctl reload nginx
    ```
3.  **Update Frontend `.env`:** If using Nginx on port 80, the `VITE_API_BASE_URL` in `frontend/.env` (before building or if served via dev server pointed at prod) should be `http://<EC2_PUBLIC_IP_OR_DOMAIN>/api`.
4.  **Security Group:** Ensure your EC2 security group allows inbound traffic on port 80 (and 443 if using HTTPS).

### 9.7 Serving Anomaly Frames

*   **Current Method (Express Static Serve):**
    The Node.js backend (`server.js`) is configured to serve static files from the `backend/frames/` directory:
    ```javascript
    // In server.js
    app.use('/frames', express.static(path.join(__dirname, 'frames')));
    ```
    This means if a frame is saved as `anomaly_123.jpg`, it can be accessed via `http://<EC2_IP>:3001/frames/anomaly_123.jpg`.
*   **Via Nginx (if configured, see above):** Nginx is more efficient for serving static files. If Nginx is set up as in 9.6, frames would be accessible via `http://<EC2_IP_OR_DOMAIN>/frames/anomaly_123.jpg`.

### 9.8 Final Checks and Health Verification

1.  **Access Application:**
    *   If not using Nginx: Open `http://<EC2_PUBLIC_IP>:3001/api/health` in your browser. You should see the health check response.
    *   If using Nginx: Open `http://<EC2_PUBLIC_IP>/api/health`.
2.  **Test End-to-End:**
    *   Run your local frontend (`npm run dev` in `frontend/`) but ensure its `frontend/.env`'s `VITE_API_BASE_URL` points to your EC2's public IP and the correct backend port/Nginx path (e.g., `http://<EC2_PUBLIC_IP>:3001/api` or `http://<EC2_PUBLIC_IP>/api`).
    *   Perform an end-to-end test by uploading a video known to cause anomalies.
    *   Verify:
        *   Alert creation in the RDS database.
        *   Frame saved in `/home/ubuntu/anomaly-detection-system/backend/frames/` on EC2.
        *   Frame accessible via its URL.
        *   PM2 logs for any errors: `pm2 logs anomaly-backend`.

## 10. Addressing Original Project Requirements: Status & Theoretical Implementations

*(This section content is retained from your provided detailed input, as it was already comprehensive. It meticulously reviews each original project requirement, its current status, and provides detailed theoretical implementations for unfulfilled aspects.)*

### 10.1 Frontend Framework (Req 1.1)

*   **Requirement:** Use Angular or React to implement the GUI. If React is chosen, TypeScript (.ts / .tsx) must be used.
*   **Current Status: Fully Implemented.**
    *   The project uses **React** for the frontend GUI.
    *   **TypeScript** (.tsx for components, .ts for other logic/types) is utilized throughout the frontend codebase, ensuring type safety and improved maintainability.
    *   Key libraries like Vite for build tooling, Material-UI for components, and Axios for HTTP requests are integrated within this React/TypeScript ecosystem.

### 10.2 Frontend GUI (Req 1.2)

*   **Requirement:**
    *   Implement: A search page with search criteria filters and results table. A modal dialog for displaying detailed anomaly alerts (see GUI.png for reference).
    *   Use Material-UI (MUI).
    *   Provided UI HTML files may be used as a base.
    *   UI sophistication is not required — focus on core logic.
*   **10.2.1 Current Status (Minimal UI)**
    *   **Implemented:** Material-UI (MUI) is used for the existing minimal frontend components (`UploadSection.tsx`, `theme.ts`). The current UI primarily facilitates video upload and displays basic status messages.
    *   **Pivoted/Not Implemented:** The full search page, search criteria filters, results table, and the detailed anomaly alert modal dialog were deprioritized to enable focused development on the core end-to-end ML processing pipeline and backend deployment for this assessment phase.
    *   The guideline "UI sophistication is not required — focus on core logic" was adhered to by building a functional, albeit minimal, interface for the core task of video upload.

*   **10.2.2 Theoretical Implementation: Full Frontend GUI**
    Should the project proceed to implement the full frontend GUI as originally envisioned, the following detailed strategy would be adopted:

    *   **Conceptual Overview:** The full GUI would provide users with a comprehensive interface to not only upload videos but also to search, view, and analyze detected anomalies. The "search page" would be the primary dashboard for interacting with historical alert data, and the "modal dialog" would offer a focused view of individual alert specifics.

    *   **Components Involved (React, TypeScript, MUI):**
        *   **`AlertsDashboardPage.tsx`:** A new top-level page component that would orchestrate the search functionality and display of results.
        *   **`SearchBar.tsx`:** A component containing various filter inputs (e.g., date range pickers, dropdown for alert types, text input for message keywords). State for these filters would be managed in `AlertsDashboardPage.tsx` or a shared context/state management solution.
        *   **`AlertsResultsTable.tsx`:** An MUI `Table` component to display a paginated list of alerts. Columns would include ID, Timestamp, Alert Type, Brief Message, and an "View Details" action button.
        *   **`AlertDetailModal.tsx`:** An MUI `Dialog` component triggered by the "View Details" button. It would display all information for a selected alert, including the `alert_type`, full `message`, `timestamp`, `details` (parsed JSONB), and critically, the associated `frame_storage_key` rendered as an image.
        *   **State Management:** For managing search criteria, results, pagination state, and modal visibility, React Context API with `useReducer` or a lightweight state management library like Zustand or Jotai would be considered to avoid prop drilling and keep `AlertsDashboardPage.tsx` manageable.
        *   **API Service Module (`alertService.ts`):** An Axios-based service to handle API calls to new backend endpoints for fetching alerts (e.g., `GET /api/alerts` with query parameters for filtering and pagination).

    *   **Step-by-Step Process Flow (Theoretical):**
        1.  **Page Load:** User navigates to the alerts dashboard. `AlertsDashboardPage.tsx` makes an initial API call to `alertService.ts` to fetch the first page of alerts (possibly with default filters).
        2.  **Filtering:** User interacts with `SearchBar.tsx` inputs. On filter change or "Apply" button click, `AlertsDashboardPage.tsx` updates its state and triggers a new API call with the updated filter parameters.
        3.  **Display Results:** `AlertsResultsTable.tsx` re-renders with the new data received from the API. MUI's `TablePagination` component would handle page changes, triggering further API calls.
        4.  **View Details:** User clicks "View Details" on a row in `AlertsResultsTable.tsx`. This action sets the selected alert's data in the parent state and toggles the visibility of `AlertDetailModal.tsx`.
        5.  **Modal Display:** `AlertDetailModal.tsx` renders the detailed information. If `frame_storage_key` points to a local server path (e.g., `/frames/image.jpg`) or an S3 pre-signed URL, an `<img>` tag displays the anomaly frame.
        6.  **Video Upload Interaction:** The existing `UploadSection.tsx` could be integrated into this dashboard or remain a separate section. After a successful upload and detection, the alerts table might auto-refresh or a notification could prompt the user to refresh.

    *   **Key Technologies/Libraries:** React, TypeScript, Material-UI ( leveraging `Table`, `TablePagination`, `TextField`, `Select`, `DatePicker` from MUI X if needed, `Dialog`, `Card`, `Typography`, `Button`, `Grid`, `CircularProgress` for loading states), Axios, and a state management solution as mentioned.

    *   **API Endpoints Required (Backend):**
        *   `GET /api/alerts`: Supports query parameters for:
            *   `page`: For pagination.
            *   `limit`: Records per page.
            *   `sortBy`, `sortOrder`: For sorting.
            *   `alertType`, `startDate`, `endDate`, `searchKeyword`: For filtering.
            The backend would construct dynamic SQL queries to fetch data from the RDS `alerts` table based on these parameters.
        *   `GET /api/alerts/:id`: To fetch a single alert by ID (if modal needs to refresh data independently).

    *   **Frame Image Display:**
        *   If using current local EC2 storage: The `frame_storage_key` would be a filename (e.g., `anomaly_frame_123.jpg`). The frontend would construct the URL `http://<EC2_IP_OR_DOMAIN>/frames/anomaly_frame_123.jpg` (or `http://<EC2_IP>:3001/frames/...` if accessing Node.js directly) to display it.
        *   If using S3 (preferred future): The backend API for fetching alert details would generate an S3 pre-signed URL for the `frame_storage_key` and include it in the response. The frontend would then use this temporary, secure URL directly in the `<img>` tag.

    *   **Potential Challenges & Considerations:**
        *   **Performance:** Efficient database querying on the backend for complex filters and large datasets. Proper indexing on the `alerts` table would be crucial.
        *   **State Management Complexity:** Managing filters, pagination, loading states, and modal data can become complex. A well-thought-out state management strategy is vital.
        *   **User Experience:** Providing clear loading indicators, responsive design, and intuitive filter controls. Handling API errors gracefully and displaying user-friendly messages.

    *   **Benefits of Implementation:** Provides essential functionality for users to review and analyze detected anomalies, making the system significantly more useful beyond a simple upload-and-detect demonstration.

### 10.3 Backend Framework (Req 1.3)

*   **Requirement:** Use Node.js for backend services. Deploy backend on AWS EC2.
*   **Current Status: Fully Implemented.**
    *   The backend is built using **Node.js** and the **Express.js** framework.
    *   The backend has been successfully **deployed and tested on an AWS EC2 instance** (Ubuntu, t2.micro/t3.micro, using PM2 for process management), as detailed in Section 9 of this README.

### 10.4 Backend Storage (Req 1.4)

*   **Requirement:** Use AWS RDS to store anomaly alert data. Implement decoupled CRUD operations. Provide a reasonable solution for storing frame data.
*   **10.4.1 AWS RDS & Frame Data Solution (Implemented)**
    *   **AWS RDS:** **Fully Implemented.** The system uses an AWS RDS PostgreSQL instance to store anomaly alert data in the `alerts` table. Connection and data insertion are functional.
    *   **Frame Data Storage Solution:** **Implemented (Basic Solution).** Anomaly frames are stored as JPEG files in the `backend/frames/` directory on the local filesystem of the EC2 instance. These are served statically by Express (or Nginx if configured). This is a "reasonable solution" for the pivoted scope demonstrating the core pipeline.
        *   *Future Enhancement Consideration (S3):* As detailed elsewhere (e.g., Section 14, theoretical implementation of full UI), AWS S3 is the industry-standard, more scalable, durable, and cost-effective solution for storing binary data like video frames. This would involve modifying the Python script to upload frames to S3 using `boto3`, storing the S3 object key in `frame_storage_key`, and having the backend generate pre-signed URLs for secure frontend access.
    *   **Decoupled CRUD Operations:** **Partially Implemented.**
        *   **Create:** The `POST /api/upload` endpoint effectively implements the "Create" operation for alerts by inserting records into the `alerts` table after ML processing. This creation is tightly coupled with the ML pipeline result.
        *   **Read, Update, Delete:** Full, generic API endpoints and corresponding logic for reading multiple alerts (with filtering/pagination), reading a single alert by ID, updating alerts, or deleting alerts are not implemented in the current pivoted version.

*   **10.4.2 Theoretical Implementation: Full Decoupled CRUD Operations for Alerts**
    To fully implement decoupled CRUD operations for alerts, allowing management of alert data independently of the detection pipeline (e.g., for administrative purposes or by other services), the following approach would be taken:

    *   **Conceptual Overview:** Provide a complete set of RESTful API endpoints for managing alert records in the database. The term "decoupled" implies that these operations would be handled by dedicated controller logic and database interaction services/modules, separate from the video processing pipeline itself (though the "Create" operation as part of the ML pipeline remains a valid way alerts are generated).

    *   **Components Involved (Backend - Node.js/Express):**
        *   **`routes/alertRoutes.js` (New or Expanded):** This file would define routes for all CRUD operations:
            *   `POST /api/alerts` (Distinct from `/api/upload`. Used for manual/programmatic alert creation if needed. Request body would contain all alert fields.)
            *   `GET /api/alerts` (To list alerts, with pagination and filtering capabilities via query parameters like `?page=1&limit=10&alertType=HighRisk&startDate=...&endDate=...&sortBy=timestamp&sortOrder=DESC`)
            *   `GET /api/alerts/:id` (To get a single alert by its unique ID)
            *   `PUT /api/alerts/:id` (To update an existing alert, e.g., to change its status, add notes, or correct information. Request body would contain fields to update.)
            *   `DELETE /api/alerts/:id` (To delete an alert record)
        *   **`controllers/alertController.js` (New or Expanded):** This would contain handler functions for each route:
            *   `createAlert(req, res)`: Validates input from `req.body` and inserts a new alert into the database.
            *   `listAlerts(req, res)`: Parses query parameters for filtering, sorting, and pagination. Constructs and executes SQL SELECT queries (including a COUNT query for total records for pagination). Returns a list of alerts and pagination metadata.
            *   `getAlertById(req, res)`: Fetches a single alert by `req.params.id`. Handles "not found" scenarios.
            *   `updateAlert(req, res)`: Validates input from `req.body` and `req.params.id`. Constructs and executes an SQL UPDATE query.
            *   `deleteAlert(req, res)`: Constructs and executes an SQL DELETE query based on `req.params.id`.
        *   **`services/alertService.js` (Optional Abstraction Layer):** For more complex business logic associated with alerts (e.g., sending notifications on update, complex validation rules), a service layer could be introduced between controllers and `db.js`. For basic CRUD, controllers might interact with `db.js` directly.
        *   **`db.js`:** The existing database module (`db.query`) would be used for all SQL query executions, ensuring proper connection management.

    *   **Step-by-Step Process Flow (Theoretical - Example for `GET /api/alerts` with filtering):**
        1.  Frontend (or API client) sends `GET /api/alerts?limit=10&page=1&alertType=Multiple_Persons_Detected&sortBy=timestamp&sortOrder=desc`.
        2.  Express router in `server.js` (or a dedicated `alertRoutes.js` mounted in `server.js`) maps this request to `alertController.listAlerts`.
        3.  `alertController.listAlerts` extracts query parameters: `limit=10`, `page=1`, `alertType='Multiple_Persons_Detected'`, `sortBy='timestamp'`, `sortOrder='desc'`. It would validate these parameters.
        4.  The controller (or `alertService`) dynamically constructs SQL queries. This often involves building a WHERE clause based on provided filters and an ORDER BY clause.
            *   Primary query:
                ```sql
                SELECT id, timestamp, alert_type, message, frame_storage_key, details
                FROM alerts
                WHERE alert_type = $1 -- Or build dynamically if multiple filters
                ORDER BY timestamp DESC -- Or build dynamically based on sortBy/sortOrder
                LIMIT $2 OFFSET $3;
                ```
                Parameters: `['Multiple_Persons_Detected', 10, 0]` (offset = (page-1)*limit).
            *   Count query for pagination:
                ```sql
                SELECT COUNT(*) FROM alerts WHERE alert_type = $1;
                ```
                Parameters: `['Multiple_Persons_Detected']`.
        5.  Queries are executed using `db.query(sql, params)`.
        6.  The controller formats the results (the list of alerts and total count) into a JSON response, perhaps including pagination metadata like `currentPage`, `totalPages`, `totalItems`.

    *   **Database Schema Considerations:**
        *   The existing `alerts` table schema is largely suitable.
        *   **Indexing is critical for performance:** Ensure indexes exist on columns frequently used in WHERE clauses (e.g., `alert_type`, `timestamp`) and for sorting (`timestamp`). The current schema includes these.
        *   Consider if fields like `status` (e.g., 'new', 'acknowledged', 'resolved') or `severity` should be added to the `alerts` table if full lifecycle management is desired.

    *   **Potential Challenges & Considerations:**
        *   **Authorization:** Who can perform these CRUD operations? Implement authentication and authorization (e.g., RBAC) to protect these endpoints, especially PUT and DELETE.
        *   **Input Validation:** Rigorous validation (e.g., using a library like `express-validator` or `joi`) for all request bodies and query parameters is essential for security and data integrity.
        *   **Error Handling:** Comprehensive error handling for database errors, "not found" scenarios, validation errors, etc.
        *   **Frame Data Management:** If an alert is deleted, what happens to its associated frame in `backend/frames/` (or S3)? A cleanup mechanism (e.g., deleting the frame file) should be implemented. Similarly, for updates, frame linkage might need consideration.

    *   **Benefits of Implementation:**
        *   Enables full management of alert data through an API.
        *   Powers a rich frontend experience for viewing, searching, and managing alerts.
        *   Provides a more complete and professional backend system.
        *   Further decouples alert data management from the raw detection process.

### 10.5 Machine Learning Integration (Req 1.5)

*   **Requirement:**
    *   Integrate pretrained YOLO (object detection) and optionally LSTM (behavior analysis).
    *   Use samples from the Stanford Drone Dataset.
    *   Deploy models in-browser using WebAssembly (WASM) or WebGPU.
    *   Focus is not on model accuracy — use off-the-shelf pretrained models.
*   **10.5.1 YOLO Integration (Implemented)**
    *   **Implemented:** Pretrained YOLOv5 (an off-the-shelf model from Ultralytics, specifically `yolov5s`) is integrated into the backend Python script (`detect.py`) for object detection. This aligns with "Focus is not on model accuracy".
    *   The system uses `torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)` to load the model, which is then processed on the backend EC2 instance using PyTorch and OpenCV. This approach leverages readily available, high-quality pretrained models.

*   **10.5.2 Theoretical Implementation: LSTM for Behavior Analysis**
    *   **Current Status: Not Implemented.** LSTM integration for behavior analysis was an optional requirement and was not implemented to prioritize the successful delivery of the core object detection pipeline.
    *   **Detailed Theoretical Implementation Strategy:**
        1.  **Conceptual Overview:** LSTMs excel at analyzing temporal sequences. For behavior analysis, an LSTM could process sequences of object states (derived from YOLO detections tracked over multiple frames) to identify complex, time-dependent anomalous behaviors like loitering, unusual movement patterns, sudden changes in group dynamics, or entry into restricted zones over a period. This adds a layer of temporal understanding on top of static, frame-by-frame object detection.
        2.  **Prerequisites for LSTM Input:**
            *   **Object Tracking:** Essential. YOLO detects objects per frame; a tracker (e.g., DeepSORT, SORT, ByteTrack, or even simpler ones like centroid tracking with Kalman filters for basic scenarios) would be needed to assign unique IDs to objects and follow them across frames. The output would be `(frame_id, object_id, bbox, class_id, confidence)`.
            *   **Feature Extraction:** From tracked objects, sequences of relevant features need tobe extracted. Examples:
                *   Normalized bounding box coordinates `(x, y, w, h)`.
                *   Centroid coordinates `(cx, cy)`.
                *   Velocity components `(vx, vy)`.
                *   Change in bounding box size.
                *   Time spent in pre-defined regions of interest (ROIs).
                *   Object's class trajectory (e.g., a 'person' remains a 'person').
            A sequence for one object might look like: `[(cx_t1, cy_t1), (cx_t2, cy_t2), ..., (cx_tN, cy_tN)]` over `N` frames.
        3.  **LSTM Model Architecture & Training:**
            *   **Input to LSTM:** A fixed-length sequence of feature vectors (e.g., last 20 frames of centroid positions for an object).
            *   **Output of LSTM:** Could be:
                *   **Classification:** Directly classify a sequence as "normal" or a specific type of "anomaly" (e.g., "loitering", "suspicious_speed"). Requires labeled training data with sequences tagged with these behaviors.
                *   **Prediction/Reconstruction (for unsupervised anomaly detection):** Train an LSTM autoencoder to reconstruct input sequences or predict the next step in a sequence. Sequences that are poorly reconstructed or predicted (high error) are flagged as anomalous. This is useful when labeled anomaly data is scarce.
            *   **Training:**
                *   **Supervised:** Requires a dataset where video sequences are labeled with specific behaviors (e.g., segments of SDD labeled for "loitering").
                *   **Unsupervised/Self-supervised:** Train on a large corpus of "normal" behavior. Anomalies are deviations from learned normality.
            *   **Model:** A typical LSTM model might consist of one or more LSTM layers followed by Dense layers for classification or reconstruction.
        4.  **Integration into Pipeline (Python Script):**
            a. `detect.py` (or a new `behavior_analysis.py`) would receive video.
            b. **Frame Loop:** Process frames with YOLO.
            c. **Tracking:** Pass YOLO detections to the object tracker.
            d. **Feature Sequence Buffer:** For each tracked object, maintain a sliding window (buffer) of its features over the last N frames.
            e. **LSTM Inference:** When an object's feature sequence buffer is sufficiently populated, feed it to the pre-trained/configured LSTM model.
            f. **Anomaly Decision:** Based on LSTM output (class probability or reconstruction error), decide if the behavior is anomalous.
            g. **Alert Generation:** If anomalous, generate an alert with behavior-specific details.
        5.  **Challenges & Considerations:**
            *   **Complexity:** Object tracking itself is non-trivial and adds significant complexity. LSTMs add another layer.
            *   **Computational Cost:** Tracking + LSTM inference significantly increases processing time per frame/video.
            *   **Data for Training:** Acquiring and labeling data for specific behaviors is labor-intensive for supervised LSTMs.
            *   **Hyperparameter Tuning:** LSTMs have many hyperparameters that need careful tuning.
            *   **Real-time Feasibility:** Achieving real-time performance would require optimized models, efficient trackers, and potentially more powerful hardware than a `t2.micro`.
        6.  **Benefits:** Enables detection of sophisticated, context-aware anomalies that are impossible to identify with single-frame analysis alone, providing much richer security insights.

*   **10.5.3 Theoretical Consideration: Stanford Drone Dataset (SDD)**
    *   **Current Status: Not Implemented.** The current system uses generic sample videos for testing the pipeline. The Stanford Drone Dataset was not integrated due to the pivot to a core pipeline.
    *   **Detailed Theoretical Utilization Strategy:**
        1.  **Purpose of SDD:** SDD is a valuable public dataset offering numerous drone-captured video sequences of various agents (pedestrians, bikers, cars, etc.) in diverse outdoor scenes, complete with annotations for object classes, bounding boxes, and unique track IDs. This makes it ideal for developing and evaluating object detection, tracking, and behavior analysis algorithms.
        2.  **How it Would Be Used:**
            *   **Testing & Validation of YOLO:** Feed SDD video clips (or extracted frames) to the existing YOLOv5 pipeline to assess its detection performance on a standardized, challenging dataset relevant to surveillance.
            *   **Tracker Development & Evaluation:** If an object tracker were implemented (as per 10.5.2), the SDD's ground truth track annotations would be invaluable for:
                *   Training data (if tracker is learning-based).
                *   Quantitative evaluation using standard tracking metrics (e.g., MOTA, MOTP, IDF1).
            *   **LSTM Behavior Model Training & Evaluation:**
                *   Sequences from SDD could be manually labeled for specific behaviors (e.g., "group forming", "abnormal speed", "jaywalking") to create a training/testing set for a supervised LSTM behavior model.
                *   Even for unsupervised LSTMs, SDD provides a rich source of "normal" trajectories from which an LSTM could learn patterns.
            *   **Overall System Benchmarking:** Use SDD to define specific anomaly scenarios and measure the system's precision, recall, and F1-score in detecting them.
            *   **Scenario-Specific Rule Refinement:** Analyze false positives/negatives on SDD data to refine the custom anomaly rules in `detect.py`.
        3.  **Integration Steps (Theoretical):**
            a. **Download and Preprocess SDD:** Download relevant video files and annotation files (`.txt` format typically).
            b. **Parser Development:** Write Python utility scripts to parse SDD's annotation format to extract frame-level bounding boxes, class labels, and track IDs.
            c. **Data Ingestion:** Modify the Python pipeline (or create test scripts) to process SDD videos.
            d. **Evaluation Scripts:** If evaluating trackers or behavior models, develop scripts to compare model outputs against SDD ground truth annotations and calculate relevant metrics.
        4.  **Benefits:**
            *   Provides robust, real-world data for system validation.
            *   Enables quantitative benchmarking against established datasets, lending credibility.
            *   Facilitates development and fine-tuning of more advanced ML components like trackers and behavior models.

*   **10.5.4 Theoretical Implementation: In-Browser ML (WASM/WebGPU) for Model Deployment**
    *   **Current Status: Not Implemented.** All ML processing (YOLOv5) currently occurs on the backend EC2 instance. In-browser ML was not part of the pivoted implementation.
    *   **Detailed Theoretical Implementation Strategy:**
        1.  **Conceptual Overview:** Shifting ML inference to the client's browser offers benefits like reduced server load, lower latency for real-time applications (e.g., live webcam processing), enhanced user privacy (data doesn't leave the client), and potential for offline functionality. This is achieved using JavaScript ML libraries with WebAssembly (WASM) or WebGPU backends for efficient model execution.
        2.  **Core Components and Workflow:**
            *   **Model Conversion:** The primary challenge. A backend model (e.g., YOLOv5 in PyTorch's `.pt` format) needs to be converted into a format compatible with browser runtimes. Common targets:
                *   **ONNX (Open Neural Network Exchange):** PyTorch models can be exported to ONNX.
                *   **TensorFlow.js Graph Model or Layers Model:** TensorFlow.js has converters for various formats, including ONNX.
                *   Some tools might directly convert PyTorch to a WASM-runnable format or a format for a specific WebNN API.
            *   **JavaScript ML Runtime/Library:**
                *   **TensorFlow.js (`tfjs`):** A mature library with support for CPU (WASM), WebGL, and experimental WebGPU backends. It can load converted models and perform inference.
                *   **ONNX Runtime Web:** Specifically designed to run ONNX models in the browser using WASM or WebGL/WebGPU. Often highly optimized.
                *   Emerging libraries/APIs for Web Neural Network (WebNN) API which aims to provide direct access to hardware acceleration.
            *   **Frontend Integration (React/TypeScript):**
                a. **Model Loading:** Fetch the converted model file (e.g., `.onnx`, `.json` for tfjs) from a static asset path or a CDN and load it using the chosen JS ML library. This usually happens once when the component mounts.
                b. **Input Acquisition:**
                    *   For uploaded videos: Use the `<video>` element to play the video, capture frames to a `<canvas>`, and then get image data.
                    *   For live camera: Use `navigator.mediaDevices.getUserMedia()` to stream webcam video to a `<video>` element, then capture frames.
                c. **Preprocessing in JavaScript:** Convert the captured frame (e.g., ImageData from canvas) into a tensor suitable for the model (resizing, normalization, channel ordering - BGR to RGB if needed, etc.). This must precisely match the preprocessing used during the model's original training.
                d. **Inference:** Pass the preprocessed tensor to the loaded model's `predict()` or `run()` method.
                e. **Postprocessing in JavaScript:** Interpret the model's output tensor(s). For YOLO, this involves decoding bounding boxes, class probabilities, and applying Non-Max Suppression (NMS).
                f. **Rendering Results:** Draw bounding boxes and labels on the `<canvas>` overlaid on the video.
                g. **Anomaly Logic (Client-Side):** Implement the custom anomaly detection rules (e.g., object count threshold) in JavaScript, operating on the postprocessed detection results.
                h. **Alerting (Optional):** If an anomaly is detected client-side:
                    *   Provide immediate visual feedback to the user.
                    *   Optionally, send alert metadata (and perhaps a snapshot frame) to the backend API for logging/persistence, if centralized reporting is still desired.
        3.  **Key Technologies & Considerations:**
            *   **WebAssembly (WASM):** Allows running C/C++/Rust code (often used in ML library backends) in the browser at near-native speeds. Critical for CPU-bound tasks in ML inference.
            *   **WebGPU:** A modern API for GPU acceleration in the browser, successor to WebGL. Offers better performance and more control for compute tasks, including ML. Support is growing.
            *   **Model Optimization:** Models need to be as small and efficient as possible for browser use. Techniques like quantization (e.g., float32 to int8), pruning, and architectural choices (e.g., YOLOv5-Nano) are important.
        4.  **Challenges:**
            *   **Model Size & Load Times:** Large ML models can be slow to download and initialize.
            *   **Performance Variability:** Inference speed depends heavily on the client's device (CPU, GPU, browser).
            *   **Preprocessing/Postprocessing Complexity:** Replicating these steps accurately in JavaScript can be error-prone.
            *   **Browser Compatibility:** While WASM is widespread, WebGPU is newer. Fallbacks might be necessary.
            *   **Security of Anomaly Rules:** If rules are proprietary, client-side execution exposes them.
        5.  **Benefits:** Highly interactive experiences, reduced server costs, enhanced privacy for sensitive video data. Ideal for applications where immediate local feedback is paramount.

### 10.6 Anomaly Detection System Core (Req 1.6)

*   **Requirement:**
    *   Users must be able to upload video clips via the web app.
    *   Implement anomaly detection with custom rules.
    *   Upon detection, create an alert with: timestamp, alert\_type, message, frame, details.
*   **Current Status: Fully Implemented (for the core pipeline).**
    *   **Video Upload:** Users can upload `.mp4` (and other OpenCV/FFmpeg compatible) video files via the minimal React frontend. `multer` on the backend handles the reception.
    *   **Custom Rules:** The `backend/python/detect.py` script implements a specific custom anomaly rule: if the count of detected "person" objects in a frame exceeds a predefined threshold (e.g., `> 1`), it's flagged as an anomaly. This rule is applied to the filtered YOLOv5 detections. The threshold and target class are currently hardcoded in the Python script for simplicity but could be made configurable.
    *   **Alert Creation:** Upon detection of an anomaly satisfying the rule, an alert record is created and successfully stored in the AWS RDS PostgreSQL `alerts` table with all required fields:
        *   `timestamp`: Auto-generated by PostgreSQL (`DEFAULT CURRENT_TIMESTAMP`).
        *   `alert_type`: A string indicating the nature of the anomaly (e.g., "Multiple_Persons_Detected"), determined by the Python script.
        *   `message`: A human-readable description of the alert (e.g., "More than 1 person detected in the frame."), generated by the Python script.
        *   `frame_storage_key`: The filename of the saved JPEG frame (e.g., `anomaly_frame_20231027_123045_persons_3.jpg`), stored in the `backend/frames/` directory on the EC2 instance. This key allows retrieval of the visual evidence.
        *   `details`: A JSONB field containing structured supplementary information, such as `{ "person_count": 3 }`, generated by the Python script.
    The implementation comprehensively fulfills the core requirements for this critical section of the system.

### 10.7 Non-Functional Requirements

#### 10.7.1 Unit Testing (Req 2.1)

*   **Requirement:** Use Jest. Target 80%+ code coverage.
*   **Current Status: Partially Addressed / Pivoted.**
    *   **Jest:** Jest is integrated as a development dependency in both `backend/package.json` (with Supertest for API endpoint testing) and `frontend/package.json` (with React Testing Library for component testing). The project structure and configurations are in place to support Jest testing.
    *   **80%+ Code Coverage:** **Not Achieved.** Due to the strategic pivot towards rapidly developing and demonstrating a functional end-to-end core ML pipeline within the assessment timeline, the creation of an extensive suite of unit and integration tests with high code coverage was deprioritized. Current validation relies more heavily on:
        *   Manual end-to-end testing (as detailed in Section 8.1).
        *   The `test_pipeline_detailed.sh` script for basic backend pipeline integrity checks.
        *   Static code analysis via ESLint.
*   **Detailed Theoretical Implementation Strategy for Achieving 80%+ Coverage:**
    Achieving high test coverage requires a systematic approach to testing various parts of the application:

    1.  **Conceptual Overview:** Write unit tests to verify individual functions and modules in isolation, and integration tests to verify interactions between components or modules (e.g., API endpoint interactions with service layers and database mocks). Coverage tools will guide efforts to ensure most code paths are executed during tests.

    2.  **Backend Unit Testing (Node.js - Jest & Supertest):**
        *   **Target Modules & Strategies:**
            *   **`db.js` (Database Module):**
                *   *Unit Tests:* Mock the `pg.Pool` or `pg.Client` to test the `query` function's logic without actual DB connection. Verify correct argument passing, client acquisition/release, and error handling.
                *   Example: `jest.mock('pg', () => { ... });`
            *   **`server.js` (API Endpoints & Core Logic):**
                *   *Integration Tests (with Supertest):* Test API endpoints (`/api/upload`, `/api/health`).
                    *   For `/api/upload`:
                        *   Mock `child_process.spawn` to simulate Python script execution (success with valid JSON output, success with no anomaly, failure with error output).
                        *   Mock `fs` operations (e.g., `fs.unlinkSync`) to verify temporary file cleanup.
                        *   Mock `db.js` (or its `query` function) to verify correct database insertion calls when anomalies are reported.
                        *   Test with valid video uploads and various simulated Python script responses.
                        *   Test edge cases: no file uploaded, incorrect file field name.
                    *   For `/api/health`: Verify correct status code and response body.
                *   *Unit Tests:* If `server.js` has complex helper functions, test them in isolation.
            *   **Controllers (e.g., `alertController.js` for theoretical CRUD):**
                *   *Unit Tests:* Test each controller function (`listAlerts`, `getAlertById`, etc.).
                *   Mock `req` (request object with params, query, body), `res` (response object with `status`, `json`, `send` spies), and `next` (error handling middleware spy).
                *   Mock calls to any service layer or `db.js`.
                *   Verify correct status codes, response payloads, and error propagation.
            *   **Services (e.g., `alertService.js` for theoretical CRUD):**
                *   *Unit Tests:* Test business logic within services. Mock calls to `db.js`.
        *   **Coverage Goal:** `npm test -- --coverage` (in `backend/`) will generate a coverage report. Analyze this report to identify untested code branches, statements, and functions. Write more tests to cover these areas.

    3.  **Frontend Unit Testing (React/TypeScript - Jest & React Testing Library - RTL):**
        *   **Target Components & Strategies:**
            *   **`UploadSection.tsx`:**
                *   *Unit Tests (RTL):*
                    *   Test component rendering: ensure file input, button, and status message area are present.
                    *   Simulate user interactions: file selection (`fireEvent.change`), button click (`fireEvent.click`).
                    *   Mock `axios.post` (or the service function that uses it) to simulate API responses:
                        *   Successful upload, anomaly detected.
                        *   Successful upload, no anomaly.
                        *   API error (e.g., 500 server error, 400 bad request).
                    *   Verify UI updates based on these simulated API responses (e.g., status messages change correctly, loading indicators appear/disappear).
            *   **Future Full UI Components (`AlertsResultsTable.tsx`, `SearchBar.tsx`, `AlertDetailModal.tsx` for theoretical UI):**
                *   Test rendering with various props (mock data for alerts).
                *   Simulate user interactions (typing in search fields, selecting filters, clicking pagination buttons, opening/closing modal).
                *   Verify correct data display and UI changes.
                *   Mock API calls made by these components.
            *   **API Service Modules (e.g., `alertService.ts`):**
                *   *Unit Tests:* Mock `axios` (e.g., `axios.get`, `axios.post`) to test that service functions correctly construct API request URLs, parameters, and handle responses/errors.
        *   **Coverage Goal:** `npm test -- --coverage` (in `frontend/`) will generate reports.

    4.  **Python ML Script Unit Testing (`python/detect.py` - Python's `unittest` or `pytest`):**
        *   **Target Functions & Strategies:**
            *   **Core Detection Logic:**
                *   Mock `torch.hub.load` to prevent actual model loading from the internet during tests. Provide a mock model object that returns predefined detection outputs for given input frames.
                *   Mock `cv2.VideoCapture` to feed test frames (e.g., NumPy arrays loaded from image files) instead of processing actual video files.
                *   Test the anomaly rule application logic with various mock detection outputs (e.g., zero persons, one person, multiple persons).
                *   Verify that `print()` is called with the correct JSON string when an anomaly is detected.
                *   Verify frame saving logic by mocking `cv2.imwrite` and checking if it's called with correct parameters.
            *   **Argument Parsing:** Test `argparse` setup (if used explicitly) or how command-line arguments are handled.
            *   **Error Handling:** Test how the script behaves with invalid video paths or corrupted video files (mock OpenCV functions to raise exceptions).
        *   **Coverage Goal:** Use `pytest-cov` or `coverage.py` with `unittest`. Analyze reports.

    5.  **Achieving 80%+ Coverage - General Strategy:**
        *   **Test-Driven Development (TDD) or Write Tests Alongside Code:** Ideal for new features.
        *   **Focus on Logic:** Prioritize testing complex business logic, conditional statements, and error handling paths. Simple getter/setter type functions might be lower priority if time is constrained.
        *   **Mock External Dependencies:** Extensively use mocking (Jest mocks, Python's `unittest.mock`) to isolate the unit under test from external systems (database, file system, network calls, other modules).
        *   **Incremental Testing:** Don't aim for 80% in one go. Add tests iteratively, module by module.
        *   **Review Coverage Reports:** Regularly check HTML coverage reports to see which lines/branches are not covered and write tests specifically for them.
        *   **Refactor for Testability:** If code is hard to test, it might be a sign it needs refactoring (e.g., extracting pure functions, reducing side effects).

    6.  **Benefits:** Increased code reliability and confidence in changes, easier debugging and refactoring, documentation of code behavior through tests, and fulfilling a key non-functional requirement.

#### 10.7.2 Code Quality (Req 2.2)

*   **Requirement:** Pass all ESLint checks.
*   **Current Status: Fully Implemented.**
    *   ESLint is configured for both the `backend` (JavaScript, with `eslint-config-standard` base) and `frontend` (TypeScript, with rules suitable for React, e.g., `eslint-plugin-react`, `@typescript-eslint/eslint-plugin`).
    *   The `npm run lint` script is available in both `backend/package.json` and `frontend/package.json` to execute ESLint.
    *   The codebase has been developed to adhere to these linting rules, ensuring consistent coding style, identification of potential bugs, and enforcement of best practices. All checks pass.

#### 10.7.3 AWS Implementation (Req 2.3)

*   **Requirement:** Use a free AWS trial account. Provide access credentials to reviewers for verification.
*   **Current Status: Fully Implemented.**
    *   The project utilizes AWS services (EC2 for compute, RDS for database) with configurations that are **Free Tier eligible**. Setup instructions (Sections 6.4, 9.1) specifically guide towards selecting Free Tier options where available (e.g., `t2.micro`/`t3.micro` EC2 instances, RDS Free Tier template).
    *   As detailed in Section [12](#12-verification-for-evaluators-aws-credentials), temporary, **read-only AWS IAM user credentials will be securely provided** to reviewers. This allows them to verify the deployed AWS infrastructure (EC2 instance running state, RDS database configuration, Security Group settings) without granting modification privileges, adhering to security best practices.

## 11. Vibe Coding and AI-Assisted Development (Req 3.0)

*(This section content is retained from your provided detailed input, as it was already comprehensive. It details the AI-assisted development workflow.)*

*   **Requirement:**
    *   Candidates to go with a vibe coding workflow using AI tools instead of writing all code manually.
    *   Suggested tools: Roo-code, Any LLM-powered IDE (e.g., VS Code with Copilot-like extensions).
    *   May use public/free LLM APIs like NVIDIA Build: LLaMA 3.3 Nemotron Super 49B.
    *   Evaluation focus: Effective interaction with LLMs, logical prompt engineering, adherence to design patterns, diagnostic/debugging skills with AI-generated code.
*   **Current Status: Fully Implemented & Documented.**
    *   This project was developed with a "vibe coding" workflow, extensively utilizing AI-assisted development tools conceptually aligned with services like GitHub Copilot and direct interactions with advanced Large Language Models (LLMs). While specific tools like "Roo-code" or "NVIDIA Build: LLaMA 3.3 Nemotron Super 49B" were not explicitly integrated by name, the development process mirrored the philosophy of leveraging state-of-the-art AI for code generation, refinement, debugging, and architectural brainstorming.
    *   The types of prompts used and the iterative nature of AI interaction involved:
        *   **Boilerplate Generation:** For `package.json`, ESLint/Vite/TS configs, basic Express server structure, React component shells. This saved significant time on repetitive setup tasks.
        *   **Core Logic Drafting:** For database connection modules (`db.js`), initial versions of `server.js` upload/orchestration logic (including child process spawning and stream handling), Python `detect.py` structure (OpenCV video loop, YOLOv5 model loading, basic anomaly rule), and frontend component logic (`UploadSection.tsx` form handling and API calls). This provided a strong foundation to build upon.
        *   **Configuration Assistance:** For AWS setup steps (RDS creation, EC2 instance types, Security Group rule syntax), PM2 commands and `ecosystem.config.js` structure.
        *   **Debugging and Error Resolution:** Using LLMs to interpret cryptic error messages (e.g., Node.js `pg` client SSL connection issues with RDS, ESLint version conflicts, Python dependency issues), suggest potential causes, and propose fixes. This significantly sped up troubleshooting.
        *   **Code Refinement & Best Practices:** Asking for improvements to error handling (e.g., `try-catch` blocks, promise rejections), ways to make code more modular (e.g., extracting functions), secure (e.g., parameterized queries, temporary file handling), or to align with specific design patterns.
    *   **Prompt Engineering:** A key aspect was iterative prompt engineering. Initial broad prompts yielded starting points. These were then refined with more specific constraints (e.g., "using Express.js middleware", "ensure the Python script outputs JSON to stdout"), error contexts from actual execution, or requests for alternative approaches ("what's another way to handle asynchronous operations here?"). This demonstrates logical prompt engineering and an understanding of how to guide AI to produce desired, high-quality outputs relevant to the project's technical stack and requirements.
    *   **Diagnostics & Refinement:** AI-generated code was **never blindly accepted**. It was always critically reviewed for correctness, efficiency, and security. The generated code was then tested thoroughly, debugged (often with further AI assistance to understand issues in AI's own suggestions), and refactored to ensure it met project requirements, adhered to design principles (like decoupling, evident in the `db.js` module or the separation of Python processing), and was free of logical flaws or unintended side effects. This diagnostic skill and iterative refinement loop are crucial when working effectively with AI-generated code.
    *   A more detailed log of specific prompts and their evolution would ideally be kept in a `prompts.md` file as part of a formal submission process (as per a potential requirement 4 for prompt logging, though not explicitly asked to produce here). The entire development process, particularly in setting up complex integrations like AWS RDS, the backend-Python bridge, Nginx configuration, and troubleshooting initial connectivity and dependency issues, heavily relied on and showcases effective interaction and debugging within an AI-assisted ("vibe coding") workflow.

Below are illustrative examples of prompt categories and types of assistance sought during development, demonstrating the nature of the AI interaction:

*   **Initial Setup and Boilerplate Generation:**
    *   *Query Example:* "Draft a `package.json` for a Node.js Express backend targeting Node.js v18. Include dependencies: `express`, `pg` for PostgreSQL, `dotenv`, `cors`, `multer`. Dev dependencies: `nodemon`, `eslint`, `eslint-config-standard`, `jest`, `supertest`. Add a `start` script for `node server.js` and a `dev` script for `nodemon server.js`."
    *   *Query Example:* "Generate a foundational `.eslintrc.json` for a Node.js project using CommonJS modules, targeting ES2021, extending `eslint-config-standard`. Configure it to also work with Jest tests." (Follow-up Example: "ESLint reports 'X is not defined' for Jest globals like `describe` and `test`. How do I configure ESLint to recognize Jest globals?")
    *   *Query Example:* "Provide a comprehensive `.gitignore` template for a full-stack Node.js/React project, including common OS files, IDE directories, `node_modules`, `.env` files, build outputs like `dist/`, and log files."
    *   *Query Example:* "Outline a React functional component `UploadSection.tsx` using TypeScript and Material-UI. It should include an MUI `Button` for file selection (triggering a hidden file input), another `Button` for upload, and a `Typography` or `Alert` component to display status messages (uploading, success, error)."
*   **Core Logic and Algorithm Stubbing/Drafting:**
    *   *Query Example:* "Create a Node.js module `db.js` using the `pg` library. It should initialize a connection pool using environment variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`. Include a `query(text, params)` function that acquires a client from the pool, executes the query, and releases the client in a `finally` block. Also, add an async function to test the database connection on startup and log success or failure." (Follow-up Example: "How should I handle SSL configuration for connecting to AWS RDS PostgreSQL, specifically the `rejectUnauthorized` option, using environment variables?")
    *   *Query Example:* "Develop an Express.js route handler for `POST /api/upload`. Use `multer` for single video file upload (field name 'video'). After receiving the file, save it temporarily. Then, spawn a Python script `python/detect.py`, passing the video file path and a `frames_output_dir` path as arguments. Capture `stdout` (expected to be JSON) and `stderr` from the Python script. If `stdout` contains valid JSON, parse it and use values like `alert_type`, `message`, `frame_storage_key`, `details` to insert a record into a 'alerts' table using a `db.query` function. Log script errors from `stderr`. Ensure the temporary video file is deleted after processing, regardless of success or failure."
    *   *Query Example:* "Write a Python script `detect.py` that takes two command-line arguments: `input_video_path` and `output_frames_dir`. The script should:
        1.  Load a pretrained 'yolov5s' model using `torch.hub.load`.
        2.  Open the input video using `cv2.VideoCapture`.
        3.  Iterate through video frames (process every 10th frame to speed up).
        4.  For each processed frame, perform object detection. Filter detections for 'person' class with confidence > 0.5.
        5.  If the number of detected persons is greater than 1, consider it an anomaly.
        6.  If an anomaly is detected:
            a.  Construct a unique filename for the frame image (e.g., including timestamp and person count).
            b.  Save the current frame to `output_frames_dir` using `cv2.imwrite`.
            c.  Create a JSON object: `{'alert_type': 'Multiple_Persons_Detected', 'message': f'{count} persons detected.', 'frame_storage_key': 'saved_frame_filename.jpg', 'details': {'person_count': count}}`.
            d.  Print this JSON object to standard output.
        7.  Print any processing logs or errors to standard error."
*   **Configuration and AWS Interaction:**
    *   *Query Example:* "List the detailed steps to create an AWS RDS PostgreSQL instance through the AWS Management Console, specifically using the 'Free Tier' template. Highlight settings for 'Public access', VPC Security Group (initial creation), and 'Initial database name'."
    *   *Query Example:* "Provide an example of an AWS EC2 Security Group inbound rule configuration (Terraform or console steps) to allow PostgreSQL traffic (port 5432) only from another specific Security Group ID (e.g., the EC2 instance's SG)."
    *   *Query Example:* "Generate the shell commands to install Node.js v20.x using NodeSource, Python 3.10, pip, venv, PM2 globally via npm, and Nginx on an Ubuntu 22.04 EC2 instance."
*   **Debugging Assistance and Error Explanation:**
    *   *Error Message Context:* "My Node.js application on EC2 cannot connect to AWS RDS. The error is `timeout expired`. I've set RDS public access to 'Yes', and the RDS security group allows inbound on 5432 from 0.0.0.0/0. The EC2 instance's outbound security group rules allow all traffic. What else could be wrong?" (This could lead to discussing NACLs, correct endpoint usage, or `DB_SSL_REJECT_UNAUTHORIZED` issues if error message was more SSL specific).
    *   *Code Snippet & Error Query Example:* "This Python code for YOLOv5 inference (`[snippet]`) throws `RuntimeError: CUDA out of memory`. I'm running it on a t2.micro. How can I reduce memory usage or what are my options?"
*   **Refinement and Best Practices:**
    *   *Code Review Query Example:* "Review this Express.js route handler for file uploads (`[code snippet]`). How can I improve its error handling, particularly for asynchronous operations involving file system access and child process communication? Also, suggest a more robust way to ensure temporary files are always cleaned up."
    *   *Architectural Query Example:* "For a system that processes uploaded videos and generates alerts, what are the pros and cons of invoking a Python ML script as a child process from Node.js versus using a message queue and dedicated worker services for the ML part? Consider scalability and fault tolerance."

## 12. Verification for Evaluators (AWS Credentials)

To facilitate the verification of the deployed AWS infrastructure components (EC2 instance and RDS database), temporary, **read-only** AWS IAM user credentials will be provided securely and separately to the evaluators.

**What to Verify with Provided Credentials:**

Using these credentials with the AWS Management Console or AWS CLI, evaluators can inspect:

1.  **EC2 Instance (`anomaly-detection-server` or similar name):**
    *   **Instance State:** Verify it is "running".
    *   **Instance Type:** Confirm it matches the specified type (e.g., `t2.micro`, `t3.micro`).
    *   **Public IPv4 Address:** Note this address for accessing the deployed application.
    *   **Security Groups:** Inspect the inbound rules of the security group attached to the EC2 instance. Verify rules for SSH (port 22), HTTP (port 3001 for the backend, or 80 if Nginx is used), and any other necessary ports.
    *   **AMI:** Confirm the OS (e.g., Ubuntu).
2.  **RDS Database Instance (`anomaly-db-instance` or similar name):**
    *   **Status:** Verify it is "Available".
    *   **Engine:** Confirm it is PostgreSQL and the version.
    *   **Instance Class:** Confirm it matches the Free Tier selection (e.g., `db.t3.micro`).
    *   **Connectivity & Security Tab:**
        *   **Endpoint & Port:** Note these values.
        *   **Public Accessibility:** Confirm it is set to "Yes" (as per setup for this project's scope).
        *   **VPC Security Groups:** Inspect the inbound rules of the security group associated with the RDS instance. Verify it allows PostgreSQL traffic (port 5432) from the EC2 instance's security group ID and/or your current IP if you intend to connect directly for schema verification.
    *   **Configuration Tab:** Check the initial database name (e.g., `anomaly_system_db`).
3.  **(Optional) IAM User Permissions:** Evaluators can check the permissions associated with the provided IAM user to confirm they are indeed read-only and scoped appropriately.

**Security and Credential Handling:**

*   The provided IAM credentials will have a **custom policy attached granting only read-only access** to relevant services (EC2, RDS, potentially CloudWatch Logs for viewing application logs if set up).
*   These credentials are **temporary** and will be **disabled and deleted** after the evaluation period.
*   Evaluators are requested to handle these credentials securely and not share them.
*   **No sensitive data from the application (like passwords within `.env` files) will be exposed via these IAM credentials.** Application secrets are managed within the EC2 instance environment.

This approach allows for thorough verification of the cloud infrastructure deployment while maintaining security best practices.

## 13. Key Decisions, Trade-offs, and Project Evolution Summary

The development of this Anomaly Detection System involved several key decisions and trade-offs, primarily driven by the objective to deliver a functional core ML pipeline within the given constraints, while also demonstrating an understanding of a broader, more feature-rich system.

**Project Evolution - Pivot to Core ML Pipeline:**

*   **Initial Vision:** The project initially aimed for a comprehensive system including a full-featured frontend (search, filtering, detailed alert views), complete backend CRUD operations for alerts, advanced ML integrations like LSTMs and in-browser ML, and extensive unit testing coverage.
*   **Strategic Pivot:** Recognizing the timeline and complexity involved in realizing the full vision, a strategic decision was made to pivot and focus on delivering a robust, end-to-end **core ML pipeline**. This meant prioritizing:
    *   A functional video upload mechanism.
    *   Successful integration of the YOLOv5 model for object detection via a Python script.
    *   Backend orchestration of this pipeline in Node.js.
    *   Persistent storage of detected alerts in AWS RDS.
    *   Deployment of this core system on AWS EC2.
*   **Rationale for Pivot:** This approach ensured that a tangible, working system demonstrating the most critical ML integration aspects could be delivered and evaluated. It prioritized depth in the core flow over breadth of peripheral features that could be theoretically designed.

**Key Technical Decisions & Trade-offs:**

1.  **Backend ML Integration (Node.js invoking Python):**
    *   **Decision:** Use `child_process.spawn` in Node.js to run the Python ML script.
    *   **Trade-off:**
        *   **Pros:** Relatively straightforward to implement for this project scale, leverages Python's strong ML ecosystem directly, keeps Node.js event loop non-blocking for the ML compute.
        *   **Cons:** Less scalable and resilient than a microservices architecture with message queues (e.g., SQS/RabbitMQ and dedicated Python workers/Lambda). Error handling and data transfer via stdin/stdout can be more complex than dedicated API calls between services.
        *   **Consideration:** For a production system with higher load, a decoupled architecture with message queues would be preferred (see Section 14: Future Improvements).
2.  **Frame Storage (Local EC2 Filesystem):**
    *   **Decision:** Store anomaly frames as JPEGs in a directory (`backend/frames/`) on the EC2 instance's local filesystem and serve them statically via Express/Nginx.
    *   **Trade-off:**
        *   **Pros:** Simple to implement for the core pipeline demonstration.
        *   **Cons:** Not scalable (limited by EC2 instance storage), not durable (frames lost if instance is terminated without EBS persistence strategies or backups), and less efficient than a dedicated object storage service.
        *   **Consideration:** AWS S3 is the standard solution for this and is a clear next step for enhancement (detailed in theoretical implementations and future improvements).
3.  **Frontend UI (Minimal Upload Interface):**
    *   **Decision:** Implement a minimal React frontend focused solely on video upload and basic status feedback.
    *   **Trade-off:**
        *   **Pros:** Allowed focus on the backend and ML pipeline. Fulfilled the basic requirement of web-based video upload.
        *   **Cons:** Lacks the rich alert review and management features (search, filter, detailed view) envisioned in the original scope.
        *   **Consideration:** The theoretical design for the full UI (Section 10.2.2) demonstrates the understanding of how to build this out.
4.  **Unit Testing Coverage (Pivoted):**
    *   **Decision:** Prioritize manual E2E testing and basic script-based verification over achieving high unit test coverage (80%+ with Jest).
    *   **Trade-off:**
        *   **Pros:** Freed up development time to focus on building the core functional pipeline.
        *   **Cons:** Reduced automated safety net for catching regressions, making refactoring riskier. Lower adherence to a specific non-functional requirement.
        *   **Consideration:** The theoretical strategy for achieving high coverage (Section 10.7.1) outlines the path to address this. Jest setup is in place.
5.  **YOLOv5 Model Choice:**
    *   **Decision:** Use a pretrained `yolov5s` model.
    *   **Trade-off:**
        *   **Pros:** Readily available, good balance of speed/accuracy for general object detection, easy to integrate with PyTorch Hub. Aligns with "focus is not on model accuracy" requirement.
        *   **Cons:** `yolov5s` (small version) might not be as accurate as larger YOLOv5 variants or other SOTA models for specific challenging scenarios. Not fine-tuned for any particular dataset/environment for this project.
6.  **Anomaly Rule Simplicity:**
    *   **Decision:** Implement a simple rule (e.g., person count > 1).
    *   **Trade-off:**
        *   **Pros:** Easy to implement and demonstrate the concept of rule-based anomaly detection post-ML inference.
        *   **Cons:** Real-world anomalies are often far more complex.
        *   **Consideration:** Future improvements point towards a more sophisticated rule engine.

**Evolution Summary:**

The project successfully evolved from an ambitious, broad specification to a focused, demonstrable core system. While certain features were deferred, the current implementation provides a solid foundation. The detailed theoretical discussions for unimplemented features in Section 10 are intended to showcase the design thinking and capabilities that extend beyond the practical scope of this iteration, addressing the original project objectives comprehensively. The AI-assisted development ("vibe coding") approach was instrumental in rapidly prototyping, iterating, and troubleshooting throughout this evolution.

## 14. Future Improvements & Potential Extensions (Beyond Original Scope)

Beyond fulfilling the original project requirements (theoretical implementations for which are detailed in Section 10), the system offers numerous avenues for future enhancements and extensions to create a more robust, scalable, feature-rich, and production-ready application:

*   **Advanced User Authentication and Role-Based Access Control (RBAC):**
    *   **Description:** Implement a secure authentication system (e.g., OAuth 2.0 with an identity provider like Auth0/Okta, or JWT-based local authentication) and fine-grained RBAC.
    *   **Value:** Enhances security by ensuring only authorized users can access the system and its various functionalities (e.g., separate roles for uploading videos, viewing alerts, managing system configuration). Allows for audit trails and personalized experiences.
*   **Real-time Video Stream Processing:**
    *   **Description:** Extend the system to ingest and process real-time video streams from sources like IP cameras (via RTSP/WebRTC) or live drone feeds.
    *   **Value:** Enables continuous monitoring and immediate anomaly alerts, shifting from batch processing of uploaded clips to proactive, live surveillance. This would require significant architectural changes, possibly involving stream processing frameworks like GStreamer or dedicated video processing workers.
*   **Sophisticated and Configurable Rule Engine:**
    *   **Description:** Replace the hardcoded anomaly rule in Python with a dynamic and configurable rule engine. This could involve a UI for users to define rules based on object types, counts, locations (ROIs), object interactions, or temporal sequences. Rules could be stored in the database or a dedicated configuration service.
    *   **Value:** Provides greater flexibility and adaptability to different monitoring scenarios and evolving definitions of anomalies without requiring code changes.
*   **AWS S3 Integration for Video and Frame Storage:**
    *   **Description:** Migrate video uploads and anomaly frame storage from the EC2 local filesystem to AWS S3. Videos would be uploaded to an "uploads" S3 bucket, and frames to a "frames" S3 bucket.
    *   **Value:** Offers virtually unlimited scalability, higher durability (11 nines), better cost-efficiency for storage, and decouples storage from the EC2 instance lifecycle. Allows for easier integration with other AWS services (e.g., AWS Lambda for S3 event-triggered processing, S3 lifecycle policies for archiving). The backend would generate S3 pre-signed URLs for secure frame access.
*   **Decoupled ML Processing with Message Queues and Workers:**
    *   **Description:** Re-architect the ML processing pipeline. Instead of Node.js directly spawning Python, the backend API would publish a message (containing video location, e.g., S3 path, and processing parameters) to a message queue (e.g., AWS SQS, RabbitMQ, Kafka). Dedicated worker services (Python-based, running on EC2 with Auto Scaling, AWS Fargate, or as AWS Lambda functions for suitable tasks) would consume messages, process videos, and report results (e.g., back to another queue, directly to the database, or via an internal API).
    *   **Value:** Greatly enhances scalability (workers can be scaled independently based on queue length), improves fault tolerance (failed processing can be retried via dead-letter queues), and makes the system more resilient and responsive by preventing long-running tasks from blocking the main API.
*   **Integration with External Alerting Systems:**
    *   **Description:** Integrate with notification services to push alerts to relevant personnel or systems. Examples: email notifications (AWS SES), SMS (AWS SNS), Slack webhooks, PagerDuty, Microsoft Teams, or custom webhook integrations.
    *   **Value:** Ensures timely awareness and response to critical detected anomalies beyond just storing them in a database. Allows alerts to fit into existing operational workflows.
*   **Comprehensive CI/CD Pipeline Automation:**
    *   **Description:** Establish a full CI/CD pipeline using tools like GitHub Actions, AWS CodePipeline, Jenkins, or GitLab CI. This pipeline would automate:
        *   Linting and static analysis.
        *   Unit, integration, and (potentially) end-to-end tests.
        *   Building frontend static assets.
        *   Building Docker containers (if containerized).
        *   Deployment to various environments (development, staging, production) with strategies like blue/green or canary deployments.
        *   Automated database schema migrations.
    *   **Value:** Streamlines the development lifecycle, improves code quality through automated checks, reduces manual deployment errors, and enables faster, more reliable releases.
*   **Containerization (Docker) and Orchestration (ECS/EKS):**
    *   **Description:** Package the backend (Node.js & Python environment) and frontend applications into Docker containers. Deploy and manage these containers using an orchestration platform like AWS ECS (Elastic Container Service) or EKS (Elastic Kubernetes Service).
    *   **Value:** Provides consistency across environments ("works on my machine" problem solved), simplifies dependency management, improves scalability (easily scale container instances up or down), enhances resource utilization, and facilitates easier deployments and rollbacks.
*   **Advanced Monitoring, Logging, and System Health Alerting:**
    *   **Description:** Implement comprehensive system monitoring using tools like AWS CloudWatch (custom metrics, dashboards for API latency, error rates, ML processing times, queue lengths, RDS performance), Prometheus & Grafana, or Datadog. Centralize structured application logs (e.g., ELK stack - Elasticsearch, Logstash, Kibana; or CloudWatch Logs Insights for querying) for easier debugging and analysis. Set up automated alerting based on metrics and log patterns for critical system issues (high error rates, resource exhaustion, pipeline failures, long processing times).
    *   **Value:** Provides deep visibility into system performance and health, enabling proactive issue detection, faster troubleshooting, informed capacity planning, and a better understanding of system behavior under load.
*   **Enhanced Security Measures:**
    *   **Description:** Implement a Web Application Firewall (WAF) (e.g., AWS WAF) to protect against common web exploits like XSS and SQL injection. Conduct regular security audits and penetration testing. Ensure all sensitive data in transit (HTTPS everywhere) and at rest (EBS encryption, RDS encryption, S3 encryption) is encrypted using industry best practices. Use IAM roles with least privilege for all AWS service interactions from EC2 instances (instead of hardcoded credentials in `.env` on server for S3/RDS access). Implement robust input validation on all API endpoints. Secure management of secrets (e.g., using AWS Secrets Manager or HashiCorp Vault).
    *   **Value:** Strengthens the security posture of the application against a wide range of threats and vulnerabilities, protecting user data and system integrity.
*   **Performance Optimization and Load Testing:**
    *   **Description:** Systematically identify and address performance bottlenecks in the application and ML pipeline. This includes:
        *   Optimizing database queries (e.g., analyzing query plans, ensuring proper indexing, rewriting slow queries).
        *   Optimizing Node.js backend code (e.g., efficient asynchronous operations, reducing CPU-bound tasks on the main thread).
        *   Optimizing Python ML script (e.g., more efficient frame sampling, batch processing where applicable, model quantization, exploring faster runtimes like ONNX Runtime with TensorRT).
        *   Conducting load testing (e.g., using tools like k6, JMeter, Locust) to simulate concurrent users and high traffic volumes, identifying performance limits and ensuring the system meets desired throughput and latency targets.
    *   **Value:** Ensures the system can handle expected (and unexpected) loads, provides a smooth user experience, and minimizes operational costs by optimizing resource usage.
*   **Advanced Anomaly Feedback Loop & Model Retraining:**
    *   **Description:** Implement a mechanism for users (e.g., security analysts) to review detected anomalies and provide feedback (e.g., "true positive," "false positive," or correct the anomaly type). This feedback could be collected and used to:
        *   Periodically retrain or fine-tune the ML models to improve accuracy and reduce false alarms.
        *   Refine anomaly detection rules.
    *   **Value:** Creates an adaptive system that learns and improves over time, leading to more accurate and relevant anomaly detection.
*   **Data Archival and Retention Policies:**
    *   **Description:** Implement policies for archiving or deleting old alert data and video frames from RDS and S3 (or local storage) to manage storage costs and comply with data retention regulations. This could involve S3 lifecycle policies to move older data to cheaper storage tiers (e.g., S3 Glacier).
    *   **Value:** Optimizes storage costs and ensures compliance with data governance requirements.
*   **Federated Learning Capabilities:**
    *   **Description:** For scenarios where video data cannot leave edge locations or multiple organizations want to collaborate on model training without sharing raw data, explore federated learning approaches. Models would be trained locally at the edge, and only model updates/gradients would be shared centrally to create a global model.
    *   **Value:** Enhances privacy and enables model training on distributed datasets that cannot be centralized.
*   **User and System Auditing:**
    *   **Description:** Implement detailed auditing for user actions (e.g., video uploads, alert acknowledgments) and significant system events (e.g., model updates, configuration changes). Store these audit logs securely.
    *   **Value:** Provides traceability, accountability, and helps in security investigations or compliance reporting.
*   **Multi-Tenancy Support:**
    *   **Description:** If the system is intended to be used by multiple distinct organizations or user groups, re-architect the backend and database to support multi-tenancy securely, ensuring data isolation between tenants.
    *   **Value:** Allows a single deployment to serve multiple clients, reducing operational overhead and cost per tenant.
*   **Accessibility (a11y) Compliance for Frontend:**
    *   **Description:** Ensure the full frontend UI (when developed) adheres to web accessibility standards (e.g., WCAG 2.1 AA). This involves using semantic HTML, proper ARIA attributes, keyboard navigability, and sufficient color contrast.
    *   **Value:** Makes the application usable by people with a wide range of disabilities, expanding the potential user base and often being a legal or contractual requirement.
*   **Internationalization (i18n) and Localization (L10n):**
    *   **Description:** If the system needs to support multiple languages and regions, implement i18n/L10n in the frontend (and potentially backend messages). This involves externalizing strings and adapting UI/data formats.
    *   **Value:** Makes the application accessible and user-friendly for a global audience.

These potential improvements cover a wide spectrum, from core architectural changes to feature enhancements and operational refinements, all aimed at evolving the system into a more powerful, reliable, and enterprise-grade solution. The choice of which improvements to pursue would depend on specific business requirements, user needs, and available resources.