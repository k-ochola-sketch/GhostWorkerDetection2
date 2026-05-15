const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Super Admin', 'Ministry Officer', 'County Director', 'School Admin', 'Teacher'),
    allowNull: false,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Schools',
      key: 'id',
    },
  },
  county: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['schoolId'] },
    { fields: ['county'] },
  ],
});

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance method to check password
User.prototype.checkPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get full name
User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

module.exports = User;