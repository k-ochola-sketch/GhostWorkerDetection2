const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Students',
      key: 'id',
    },
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Schools',
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Late', 'Excused'),
    allowNull: false,
  },
  checkInTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  checkOutTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  method: {
    type: DataTypes.ENUM('Manual', 'Biometric', 'RFID', 'QR_Code'),
    defaultValue: 'Manual',
  },
  recordedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Location data for verification
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['studentId', 'date'], unique: true },
    { fields: ['schoolId', 'date'] },
    { fields: ['status'] },
    { fields: ['date'] },
  ],
});

module.exports = Attendance;