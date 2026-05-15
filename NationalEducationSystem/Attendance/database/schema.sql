-- Kenya School Attendance Database Schema
-- PostgreSQL Database: kenya_attendance

-- Users table for authentication and authorization
CREATE TABLE "Users" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Ministry Officer', 'County Director', 'School Admin', 'Teacher')),
    "schoolId" UUID,
    county VARCHAR(100),
    phone VARCHAR(20),
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP,
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE "Schools" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Primary', 'Secondary', 'Mixed')),
    county VARCHAR(100) NOT NULL,
    "subCounty" VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    "principalName" VARCHAR(255),
    "totalStudents" INTEGER DEFAULT 0,
    "capitationRate" DECIMAL(10,2) NOT NULL,
    "lastCapitationPayment" DATE,
    "totalCapitationReceived" DECIMAL(15,2) DEFAULT 0,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE "Students" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "admissionNumber" VARCHAR(50) UNIQUE NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    grade VARCHAR(50) NOT NULL,
    stream VARCHAR(50),
    "parentPhone" VARCHAR(20),
    "parentEmail" VARCHAR(255),
    address TEXT,
    "enrollmentDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    "schoolId" UUID NOT NULL REFERENCES "Schools"(id) ON DELETE CASCADE,
    "isActive" BOOLEAN DEFAULT true,
    "fingerprintData" TEXT,
    "photoUrl" VARCHAR(500),
    "lastAttendanceDate" DATE,
    "attendanceStreak" INTEGER DEFAULT 0,
    "riskScore" DECIMAL(3,2) DEFAULT 0.00 CHECK ("riskScore" >= 0 AND "riskScore" <= 1),
    "flaggedReason" TEXT,
    "isFlagged" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE "Attendance" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES "Students"(id) ON DELETE CASCADE,
    "schoolId" UUID NOT NULL REFERENCES "Schools"(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    "checkInTime" TIME,
    "checkOutTime" TIME,
    method VARCHAR(20) DEFAULT 'Manual' CHECK (method IN ('Manual', 'Biometric', 'RFID', 'QR_Code')),
    "recordedBy" UUID NOT NULL REFERENCES "Users"(id),
    notes TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", date)
);

-- Capitation table for government funding
CREATE TABLE "Capitation" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL REFERENCES "Schools"(id) ON DELETE CASCADE,
    "academicYear" VARCHAR(20) NOT NULL,
    term VARCHAR(20) NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3')),
    "enrolledStudents" INTEGER NOT NULL,
    "ratePerStudent" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "disbursedAmount" DECIMAL(15,2) DEFAULT 0,
    "disbursementDate" DATE,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Disbursed', 'Held', 'Flagged')),
    "verifiedBy" UUID REFERENCES "Users"(id),
    "verificationDate" DATE,
    notes TEXT,
    "flaggedStudents" INTEGER DEFAULT 0,
    "adjustedAmount" DECIMAL(15,2),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("schoolId", "academicYear", term)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON "Users"(email);
CREATE INDEX idx_users_role ON "Users"(role);
CREATE INDEX idx_users_school_id ON "Users"("schoolId");
CREATE INDEX idx_users_county ON "Users"(county);

CREATE INDEX idx_schools_code ON "Schools"(code);
CREATE INDEX idx_schools_county ON "Schools"(county);
CREATE INDEX idx_schools_type ON "Schools"(type);

CREATE INDEX idx_students_admission_number ON "Students"("admissionNumber");
CREATE INDEX idx_students_school_id ON "Students"("schoolId");
CREATE INDEX idx_students_is_flagged ON "Students"("isFlagged");
CREATE INDEX idx_students_risk_score ON "Students"("riskScore");

CREATE INDEX idx_attendance_student_date ON "Attendance"("studentId", date);
CREATE INDEX idx_attendance_school_date ON "Attendance"("schoolId", date);
CREATE INDEX idx_attendance_status ON "Attendance"(status);
CREATE INDEX idx_attendance_date ON "Attendance"(date);

CREATE INDEX idx_capitation_school_year_term ON "Capitation"("schoolId", "academicYear", term);
CREATE INDEX idx_capitation_status ON "Capitation"(status);

-- Sample data insertion (optional)
-- This would be handled by the seed script in production

-- Insert default super admin
INSERT INTO "Users" (email, password, "firstName", "lastName", role, "isActive")
VALUES (
    'admin@education.go.ke',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8ZJcKvqMyW', -- 'Admin123!'
    'Super',
    'Admin',
    'Super Admin',
    true
);

-- Insert sample school
INSERT INTO "Schools" (name, code, type, county, "subCounty", address, "capitationRate")
VALUES (
    'Nairobi Primary School',
    'NPS001',
    'Primary',
    'Nairobi',
    'Westlands',
    '123 Education Street, Nairobi',
    15000.00
);