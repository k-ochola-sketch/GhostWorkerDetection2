const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Capitation = sequelize.define('Capitation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Schools',
      key: 'id',
    },
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., "2024-2025"
  },
  term: {
    type: DataTypes.ENUM('Term 1', 'Term 2', 'Term 3'),
    allowNull: false,
  },
  enrolledStudents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ratePerStudent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  disbursedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  disbursementDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Disbursed', 'Held', 'Flagged'),
    defaultValue: 'Pending',
  },
  // Verification data
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  verificationDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Ghost student detection
  flaggedStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  adjustedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true, // Amount after ghost student adjustments
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['schoolId', 'academicYear', 'term'], unique: true },
    { fields: ['status'] },
    { fields: ['academicYear'] },
  ],
});

module.exports = Capitation;