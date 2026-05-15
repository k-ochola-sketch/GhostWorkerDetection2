const express = require('express');
const { Capitation, School, Student } = require('../models');
const { authenticateToken, authorizeRoles, authorizeSchoolAccess } = require('../middleware/auth');

const router = express.Router();

// Get capitation records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      schoolId,
      academicYear,
      term,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    // Role-based filtering
    if (req.user.role === 'School Admin') {
      where.schoolId = req.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (academicYear) where.academicYear = academicYear;
    if (term) where.term = term;
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows: capitations } = await Capitation.findAndCountAll({
      where,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county']
        },
        {
          model: require('../models').User,
          as: 'verifiedByUser',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['academicYear', 'DESC'], ['term', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      capitations,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get capitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get capitation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const capitation = await Capitation.findByPk(req.params.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county', 'totalStudents']
        },
        {
          model: require('../models').User,
          as: 'verifiedByUser',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ],
    });

    if (!capitation) {
      return res.status(404).json({ error: 'Capitation record not found' });
    }

    // Check access permissions
    if (req.user.role === 'School Admin' && capitation.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(capitation);
  } catch (error) {
    console.error('Get capitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create capitation record
router.post('/', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const {
      schoolId,
      academicYear,
      term,
      enrolledStudents,
      ratePerStudent,
      totalAmount
    } = req.body;

    if (!schoolId || !academicYear || !term || !enrolledStudents || !ratePerStudent) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Verify school exists
    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Calculate total amount if not provided
    const calculatedTotal = totalAmount || (enrolledStudents * ratePerStudent);

    const capitation = await Capitation.create({
      schoolId,
      academicYear,
      term,
      enrolledStudents,
      ratePerStudent,
      totalAmount: calculatedTotal,
    });

    await capitation.reload({
      include: [{ model: School, as: 'school' }]
    });

    res.status(201).json(capitation);
  } catch (error) {
    console.error('Create capitation error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Capitation record already exists for this school, year, and term' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update capitation record
router.put('/:id', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const capitation = await Capitation.findByPk(req.params.id);

    if (!capitation) {
      return res.status(404).json({ error: 'Capitation record not found' });
    }

    const updateData = { ...req.body };

    // Recalculate total if enrolled students or rate changed
    if (updateData.enrolledStudents || updateData.ratePerStudent) {
      const enrolled = updateData.enrolledStudents || capitation.enrolledStudents;
      const rate = updateData.ratePerStudent || capitation.ratePerStudent;
      updateData.totalAmount = enrolled * rate;
    }

    await capitation.update(updateData);
    await capitation.reload({
      include: [
        { model: School, as: 'school' },
        { model: require('../models').User, as: 'verifiedByUser' }
      ]
    });

    res.json(capitation);
  } catch (error) {
    console.error('Update capitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disburse capitation funds
router.put('/:id/disburse', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const { disbursedAmount, notes } = req.body;

    const capitation = await Capitation.findByPk(req.params.id, {
      include: [{ model: School, as: 'school' }]
    });

    if (!capitation) {
      return res.status(404).json({ error: 'Capitation record not found' });
    }

    if (capitation.status === 'Disbursed') {
      return res.status(400).json({ error: 'Funds already disbursed' });
    }

    const amount = disbursedAmount || capitation.totalAmount;

    if (amount > capitation.totalAmount) {
      return res.status(400).json({ error: 'Disbursed amount cannot exceed total amount' });
    }

    await capitation.update({
      disbursedAmount: amount,
      status: 'Disbursed',
      disbursementDate: new Date(),
      verifiedBy: req.user.id,
      notes,
    });

    // Update school's total capitation received
    await capitation.school.increment('totalCapitationReceived', { by: amount });

    res.json(capitation);
  } catch (error) {
    console.error('Disburse capitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Flag capitation for review (due to ghost students)
router.put('/:id/flag', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer', 'County Director'), async (req, res) => {
  try {
    const { flaggedStudents, adjustedAmount, notes } = req.body;

    const capitation = await Capitation.findByPk(req.params.id);

    if (!capitation) {
      return res.status(404).json({ error: 'Capitation record not found' });
    }

    await capitation.update({
      status: 'Flagged',
      flaggedStudents: flaggedStudents || 0,
      adjustedAmount,
      notes,
      verifiedBy: req.user.id,
      verificationDate: new Date(),
    });

    res.json(capitation);
  } catch (error) {
    console.error('Flag capitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get capitation summary by school
router.get('/summary/school/:schoolId', authenticateToken, authorizeSchoolAccess, async (req, res) => {
  try {
    const { academicYear } = req.query;

    const where = { schoolId: req.params.schoolId };
    if (academicYear) where.academicYear = academicYear;

    const capitations = await Capitation.findAll({
      where,
      order: [['academicYear', 'DESC'], ['term', 'DESC']],
    });

    const summary = {
      totalAllocated: capitations.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0),
      totalDisbursed: capitations.reduce((sum, c) => sum + parseFloat(c.disbursedAmount), 0),
      totalFlagged: capitations.filter(c => c.status === 'Flagged').length,
      records: capitations,
    };

    res.json(summary);
  } catch (error) {
    console.error('Get capitation summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get capitation statistics for dashboard
router.get('/stats/dashboard', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const { academicYear } = req.query;

    const where = {};
    if (academicYear) where.academicYear = academicYear;

    const [totalStats] = await Capitation.findAll({
      where,
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('totalAmount')), 'totalAllocated'],
        [require('sequelize').fn('SUM', require('sequelize').col('disbursedAmount')), 'totalDisbursed'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalRecords'],
      ],
    });

    const statusBreakdown = await Capitation.findAll({
      where,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('totalAmount')), 'totalAmount'],
      ],
      group: ['status'],
    });

    res.json({
      totalAllocated: parseFloat(totalStats.dataValues.totalAllocated || 0),
      totalDisbursed: parseFloat(totalStats.dataValues.totalDisbursed || 0),
      totalRecords: parseInt(totalStats.dataValues.totalRecords || 0),
      statusBreakdown,
    });
  } catch (error) {
    console.error('Get capitation stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;