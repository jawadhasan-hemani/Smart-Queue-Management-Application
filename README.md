# 🎓 QueueSmart - Smart Queue Management Application

![QueueSmart Banner](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue)

QueueSmart is a full-stack Smart Queue Management Application designed for organizations (student service centers, clinics, advising offices, help desks) that struggle with long queues and poor visibility into wait times. 

It provides real-time visibility for users, intelligent wait-time estimations, and powerful queue management tools for administrators.

---

## ✨ Features

### 👨‍🎓 For Students (Users)
* **Real-time Queue Status**: View active queues, the number of people waiting, and estimated wait times before joining.
* **Join Queues**: Hop into the queue for a specific service directly from the dashboard.
* **Live Position Tracking**: Watch your position update in real-time as administrators process the queue.
* **Smart Notifications**: Get toast alerts, sounds, and device vibrations when it's almost your turn or when your position improves (intelligently deduplicated).
* **AI Assistant**: A built-in intelligent chatbot to answer common questions and assist with navigating services.
* **History**: View a complete log of your past visits and advising sessions.

### 🛡️ For Administrators (Staff)
* **Admin Dashboard**: A high-level overview of total students waiting, open services, and high-priority queues.
* **Service Management**: Create, edit, and toggle services on/off. Configure default appointment durations and priority levels.
* **Advanced Queue Management**:
  * Serve the next student in line.
  * Reorder students (move them up or down) in real-time.
  * Remove students who left or no-showed.
* **History Logs**: Filter and view historical data of all processed and removed students.
* **Role-based Access**: Secure Firebase authentication restricted to authorized admin users.

---

## 🛠️ Tech Stack

**Frontend:**
* **React** (via Vite) - Fast, modern frontend framework.
* **Tailwind CSS** - Utility-first styling for a beautiful, responsive UI.
* **Lucide React** - Clean and consistent iconography.
* **React Router** - Client-side routing.

**Backend:**
* **Node.js & Express** - Scalable REST API architecture.
* **PostgreSQL** - Relational database for robust, ACID-compliant data storage (using `pg` driver).
* **Firebase Admin** - Secure authentication and token verification.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
* **Node.js** (v16 or higher)
* **PostgreSQL** (Running locally or hosted)
* **Firebase Project** (For authentication)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/Smart-Queue-Management-Application.git
cd Smart-Queue-Management-Application
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

**Environment Variables:**
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/queuesmart
```

**Firebase Service Account:**
Place your Firebase Admin SDK JSON key at `backend/config/serviceAccountKey.json`.

**Database Migration & Seeding:**
Run the following scripts to initialize your database schema and seed it with dummy data:
```bash
node scripts/migrate.js
node scripts/seed.js
```

**Start the Backend:**
```bash
npm start
```
*The API will run on http://localhost:5000*

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

**Environment Variables:**
Create a `.env` file in the `frontend/` directory with your Firebase client configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Start the Frontend:**
```bash
npm run dev
```
*The app will be available at http://localhost:3000*

---

## 💡 Usage Notes

* **Student View**: By default, visiting `http://localhost:3000/` will prompt a login. Regular user accounts will be directed to the Student Dashboard.
* **Admin View**: To access the admin panel, your Firebase user account must be granted the `admin` role in the database. Once configured, you can access `http://localhost:3000/admin`.
* **Notifications**: To test browser notifications and vibrations, ensure your browser has granted Notification permissions to `localhost`.

---

## 📄 License
This project is created for academic purposes (COSC 4353).