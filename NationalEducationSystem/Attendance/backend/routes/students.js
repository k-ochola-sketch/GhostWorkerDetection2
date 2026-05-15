const express = require('express');
const { Student, Attendance, School } = require('../models');
const { authenticateToken, authorizeRoles, authorizeSchoolAccess } = require('../middleware/auth');

const router = express.Router();

// Get all students (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      schoolId,
      grade,
      isFlagged,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const where = {};

    // Role-based filtering
    if (req.user.role === 'School Admin' || req.user.role === 'Teacher') {
      where.schoolId = req.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (grade) where.grade = grade;
    if (isFlagged !== undefined) where.isFlagged = isFlagged === 'true';

    if (search) {
      where[require('sequelize').Op.or] = [
        { firstName: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { lastName: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { admissionNumber: { [require('sequelize').Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: students } = await Student.findAndCountAll({
      where,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      students,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student by ID
router.get('/:id', authenticateToken, authorizeSchoolAccess, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county']
        },
        {
          model: Attendance,
          as: 'attendances',
          limit: 30,
          order: [['date', 'DESC']],
        }
      ],
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new student
router.post('/', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer', 'School Admin'), async (req, res) => {
  try {
    const studentData = { ...req.body };

    // Set school ID based on user role
    if (req.user.role === 'School Admin') {
      studentData.schoolId = req.user.schoolId;
    }

    const student = await Student.create(studentData);
    await student.reload({
      include: [{ model: School, as: 'school' }]
    });

    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Admission number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer', 'School Admin'), async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check school access for School Admin
    if (req.user.role === 'School Admin' && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await student.update(req.body);
    await student.reload({
      include: [{ model: School, as: 'school' }]
    });

    res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student (soft delete by setting isActive to false)
router.delete('/:id', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer', 'School Admin'), async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check school access for School Admin
    if (req.user.role === 'School Admin' && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await student.update({ isActive: false });
    res.json({ message: 'Student deactivated successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get flagged students (ghost student candidates)
router.get('/flagged/ghost-students', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer', 'County Director'), async (req, res) => {
  try {
    const { schoolId, riskThreshold = 0.7 } = req.query;

    const where = {
      isFlagged: true,
      riskScore: { [require('sequelize').Op.gte]: riskThreshold }
    };

    if (schoolId) where.schoolId = schoolId;

    const flaggedStudents = await Student.findAll({
      where,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county']
        }
      ],
      order: [['riskScore', 'DESC']],
    });

    res.json(flaggedStudents);
  } catch (error) {
    console.error('Get flagged students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;