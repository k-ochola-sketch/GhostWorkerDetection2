const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  admissionNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false,
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  stream: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  parentPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  parentEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enrollmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  fingerprintData: {
    type: DataTypes.TEXT,
    allowNull: true, // For biometric attendance
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Ghost student detection fields
  lastAttendanceDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  attendanceStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  riskScore: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00, // 0.00 to 1.00, higher = more suspicious
  },
  flaggedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isFlagged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['admissionNumber'] },
    { fields: ['schoolId'] },
    { fields: ['isFlagged'] },
    { fields: ['riskScore'] },
  ],
});

module.exports = Student;