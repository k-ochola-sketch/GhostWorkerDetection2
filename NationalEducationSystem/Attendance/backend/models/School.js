const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const School = sequelize.define('School', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('Primary', 'Secondary', 'Mixed'),
    allowNull: false,
  },
  county: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subCounty: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  principalName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  totalStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Capitation grant tracking
  capitationRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false, // Amount per student per year
  },
  lastCapitationPayment: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  totalCapitationReceived: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  // Location for verification
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['county'] },
    { fields: ['type'] },
  ],
});

module.exports = School;