# Kenya School Attendance & Ghost Student Detection System

A comprehensive system for managing school attendance and detecting ghost students in Kenya's education system, specifically designed to prevent fraudulent capitation grant claims.

## Features

### Core Functionality
- **Student Management**: Enroll, update, and track student information
- **Attendance Tracking**: Record daily attendance with biometric integration
- **Ghost Student Detection**: AI-powered algorithms to identify suspicious enrollment patterns
- **Capitation Grant Management**: Track government funding allocation and disbursement
- **Multi-level Access Control**: Role-based permissions for different user types

### User Roles
- **Super Admin**: Full system access
- **Ministry Officer**: National-level oversight and reporting
- **County Director**: County-level management and verification
- **School Admin**: School-level administration
- **Teacher**: Daily attendance recording

### Key Features
- Real-time attendance monitoring
- Automated risk scoring for ghost student detection
- Capitation grant tracking and disbursement
- Comprehensive reporting and analytics
- Mobile-responsive web interface
- RESTful API for integrations

## Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Sequelize** ORM
- **JWT** authentication
- **Winston** logging

### Frontend
- **React** with TypeScript
- **Material-UI** component library
- **React Query** for state management
- **Recharts** for data visualization

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

4. Set up the database:
```bash
npm run migrate
```

5. (Optional) Seed with sample data:
```bash
npm run seed
```

6. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/change-password` - Change password

### Student Management
- `GET /api/students` - List students (with filters)
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `GET /api/students/flagged/ghost-students` - Get flagged students

### Attendance Tracking
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Record attendance
- `POST /api/attendance/bulk` - Bulk attendance recording

### Capitation Management
- `GET /api/capitation` - Get capitation records
- `POST /api/capitation` - Create capitation record
- `PUT /api/capitation/:id/disburse` - Disburse funds
- `PUT /api/capitation/:id/flag` - Flag for review

### Reporting
- `GET /api/reports/attendance` - Attendance reports
- `GET /api/reports/ghost-students` - Ghost student reports
- `GET /api/reports/capitation` - Capitation reports

## Ghost Student Detection Algorithm

The system uses several indicators to identify potential ghost students:

1. **Low Attendance Rate**: Students with attendance below 30% over 90 days
2. **Enrollment without Attendance**: Students enrolled but never marked present
3. **Inconsistent Patterns**: Sudden drops in attendance after enrollment
4. **Risk Scoring**: Composite score based on multiple factors

### Risk Score Calculation
- Base score starts at 0.0
- +0.3 for attendance rate < 20%
- +0.2 for no attendance in 30+ days
- +0.1 for enrollment > 6 months with < 50% attendance
- Students with score > 0.7 are automatically flagged

## Deployment

### Production Environment Setup

1. Set `NODE_ENV=production` in environment variables
2. Use a production-grade PostgreSQL instance
3. Set up SSL/TLS certificates
4. Configure proper logging and monitoring
5. Set up automated backups

### Docker Deployment (Optional)

```dockerfile
# Build the backend
FROM node:16-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 3001
CMD ["npm", "start"]

# Build the frontend
FROM node:16-alpine as build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@education.go.ke
- Documentation: [Link to full documentation]

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Role-based access control implemented
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- CORS configured for security

## Future Enhancements

- Mobile app for attendance recording
- SMS notifications for parents
- Integration with national education database
- Advanced analytics and machine learning
- Biometric fingerprint integration
- GPS tracking for attendance verification