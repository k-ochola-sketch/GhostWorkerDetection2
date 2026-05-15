const express = require('express');
const { School, Student, User } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all schools
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      county,
      type,
      isActive = true,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const where = { isActive };

    if (county) where.county = county;
    if (type) where.type = type;

    if (search) {
      where[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { code: { [require('sequelize').Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: schools } = await School.findAndCountAll({
      where,
      attributes: {
        exclude: ['latitude', 'longitude'] // Don't expose coordinates in list view
      },
      order: [['county', 'ASC'], ['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      schools,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get school by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'users',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'role', 'email']
        }
      ],
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get student count
    const studentCount = await Student.count({
      where: { schoolId: req.params.id, isActive: true }
    });

    const schoolData = school.toJSON();
    schoolData.studentCount = studentCount;

    res.json(schoolData);
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new school
router.post('/', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const schoolData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'code', 'type', 'county', 'subCounty', 'address'];
    const missingFields = requiredFields.filter(field => !schoolData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const school = await School.create(schoolData);
    res.status(201).json(school);
  } catch (error) {
    console.error('Create school error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'School code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update school
router.put('/:id', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    await school.update(req.body);
    res.json(school);
  } catch (error) {
    console.error('Update school error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'School code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate school
router.delete('/:id', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    await school.update({ isActive: false });
    res.json({ message: 'School deactivated successfully' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get school statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const schoolId = req.params.id;

    // Check access permissions
    if (req.user.role === 'School Admin' && req.user.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get student statistics
    const totalStudents = await Student.count({
      where: { schoolId, isActive: true }
    });

    const flaggedStudents = await Student.count({
      where: { schoolId, isActive: true, isFlagged: true }
    });

    // Get attendance statistics for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const attendanceStats = await require('../models').Attendance.findAll({
      where: {
        schoolId,
        date: { [require('sequelize').Op.gte]: startOfMonth }
      },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'count']
      ],
      group: ['status'],
    });

    // Get capitation summary
    const capitationSummary = await require('../models').Capitation.findAll({
      where: { schoolId },
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('totalAmount')), 'totalAllocated'],
        [require('sequelize').fn('SUM', require('sequelize').col('disbursedAmount')), 'totalDisbursed'],
      ],
    });

    const stats = {
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
      },
      students: {
        total: totalStudents,
        flagged: flaggedStudents,
        flaggedPercentage: totalStudents > 0 ? ((flaggedStudents / totalStudents) * 100).toFixed(2) : 0,
      },
      attendance: {
        currentMonth: attendanceStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = parseInt(stat.dataValues.count);
          return acc;
        }, {}),
      },
      capitation: {
        totalAllocated: parseFloat(capitationSummary[0]?.dataValues.totalAllocated || 0),
        totalDisbursed: parseFloat(capitationSummary[0]?.dataValues.totalDisbursed || 0),
        totalReceived: parseFloat(school.totalCapitationReceived),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Get school stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get schools by county
router.get('/county/:county', authenticateToken, async (req, res) => {
  try {
    const schools = await School.findAll({
      where: {
        county: req.params.county,
        isActive: true
      },
      attributes: ['id', 'name', 'code', 'type', 'totalStudents'],
      order: [['name', 'ASC']],
    });

    res.json(schools);
  } catch (error) {
    console.error('Get schools by county error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;