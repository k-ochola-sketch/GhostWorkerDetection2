const { sequelize } = require('../config/database');

// Import models
const User = require('./User');
const School = require('./School');
const Student = require('./Student');
const Attendance = require('./Attendance');
const Capitation = require('./Capitation');

// Define associations
// User associations
User.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

// School associations
School.hasMany(User, { foreignKey: 'schoolId', as: 'users' });
School.hasMany(Student, { foreignKey: 'schoolId', as: 'students' });
School.hasMany(Attendance, { foreignKey: 'schoolId', as: 'attendances' });
School.hasMany(Capitation, { foreignKey: 'schoolId', as: 'capitations' });

// Student associations
Student.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
Student.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendances' });

// Attendance associations
Attendance.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Attendance.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
Attendance.belongsTo(User, { foreignKey: 'recordedBy', as: 'recordedByUser' });

// Capitation associations
Capitation.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
Capitation.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifiedByUser' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  School,
  Student,
  Attendance,
  Capitation,
};