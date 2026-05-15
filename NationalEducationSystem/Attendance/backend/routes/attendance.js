const express = require('express');
const { Attendance, Student, School } = require('../models');
const { authenticateToken, authorizeRoles, authorizeSchoolAccess } = require('../middleware/auth');

const router = express.Router();

// Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      schoolId,
      studentId,
      date,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    // Role-based filtering
    if (req.user.role === 'School Admin' || req.user.role === 'Teacher') {
      where.schoolId = req.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    // Date filtering
    if (date) {
      where.date = date;
    } else if (startDate && endDate) {
      where.date = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: attendances } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'admissionNumber', 'grade']
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['date', 'DESC'], ['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      attendances,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record attendance
router.post('/', authenticateToken, authorizeRoles('School Admin', 'Teacher'), async (req, res) => {
  try {
    const { studentId, date, status, checkInTime, checkOutTime, notes, latitude, longitude } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Student ID, date, and status are required' });
    }

    // Verify student belongs to user's school
    const student = await Student.findByPk(studentId);
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied or student not found' });
    }

    // Check if attendance already exists for this student on this date
    const existingAttendance = await Attendance.findOne({
      where: { studentId, date }
    });

    if (existingAttendance) {
      return res.status(400).json({ error: 'Attendance already recorded for this student on this date' });
    }

    const attendance = await Attendance.create({
      studentId,
      schoolId: req.user.schoolId,
      date,
      status,
      checkInTime,
      checkOutTime,
      recordedBy: req.user.id,
      notes,
      latitude,
      longitude,
    });

    // Update student's last attendance date and streak
    await updateStudentAttendanceStats(studentId);

    await attendance.reload({
      include: [
        { model: Student, as: 'student' },
        { model: School, as: 'school' }
      ]
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk record attendance
router.post('/bulk', authenticateToken, authorizeRoles('School Admin', 'Teacher'), async (req, res) => {
  try {
    const { date, attendanceRecords } = req.body;

    if (!date || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({ error: 'Date and attendance records array are required' });
    }

    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      try {
        const { studentId, status, checkInTime, checkOutTime, notes } = record;

        // Verify student belongs to user's school
        const student = await Student.findByPk(studentId);
        if (!student || student.schoolId !== req.user.schoolId) {
          errors.push({ studentId, error: 'Student not found or access denied' });
          continue;
        }

        // Check if attendance already exists
        const existing = await Attendance.findOne({
          where: { studentId, date }
        });

        if (existing) {
          errors.push({ studentId, error: 'Attendance already recorded' });
          continue;
        }

        const attendance = await Attendance.create({
          studentId,
          schoolId: req.user.schoolId,
          date,
          status,
          checkInTime,
          checkOutTime,
          recordedBy: req.user.id,
          notes,
        });

        // Update student stats
        await updateStudentAttendanceStats(studentId);

        results.push(attendance);
      } catch (error) {
        errors.push({ studentId: record.studentId, error: error.message });
      }
    }

    res.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update attendance
router.put('/:id', authenticateToken, authorizeRoles('School Admin', 'Teacher'), async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id, {
      include: [{ model: Student, as: 'student' }]
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Check school access
    if (attendance.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await attendance.update(req.body);
    await attendance.reload({
      include: [
        { model: Student, as: 'student' },
        { model: School, as: 'school' }
      ]
    });

    // Update student stats
    await updateStudentAttendanceStats(attendance.studentId);

    res.json(attendance);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance statistics
router.get('/stats/school/:schoolId', authenticateToken, authorizeSchoolAccess, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { schoolId: req.params.schoolId };
    if (startDate && endDate) {
      where.date = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }

    const stats = await Attendance.findAll({
      where,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'count']
      ],
      group: ['status'],
    });

    const totalDays = await Attendance.count({
      where: { schoolId: req.params.schoolId, ...where },
      distinct: true,
      col: 'date'
    });

    res.json({
      totalDays,
      breakdown: stats,
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to update student attendance statistics
async function updateStudentAttendanceStats(studentId) {
  try {
    const student = await Student.findByPk(studentId);
    if (!student) return;

    // Get recent attendance records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = await Attendance.findAll({
      where: {
        studentId,
        date: { [require('sequelize').Op.gte]: thirtyDaysAgo }
      },
      order: [['date', 'DESC']],
    });

    if (recentAttendance.length > 0) {
      const lastAttendance = recentAttendance[0];
      await student.update({
        lastAttendanceDate: lastAttendance.date,
        attendanceStreak: calculateStreak(recentAttendance),
      });

      // Calculate risk score for ghost student detection
      const riskScore = calculateRiskScore(recentAttendance);
      await student.update({
        riskScore,
        isFlagged: riskScore > 0.7,
        flaggedReason: riskScore > 0.7 ? 'Low attendance pattern detected' : null,
      });
    }
  } catch (error) {
    console.error('Update student stats error:', error);
  }
}

function calculateStreak(attendances) {
  let streak = 0;
  const sorted = attendances.sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const attendance of sorted) {
    if (attendance.status === 'Present') {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function calculateRiskScore(attendances) {
  if (attendances.length === 0) return 1.0;

  const presentCount = attendances.filter(a => a.status === 'Present').length;
  const attendanceRate = presentCount / attendances.length;

  // Risk increases with lower attendance rate
  // Additional factors could include patterns, consistency, etc.
  let riskScore = 1.0 - attendanceRate;

  // Boost risk for very low attendance (< 20%)
  if (attendanceRate < 0.2) riskScore += 0.3;

  return Math.min(riskScore, 1.0);
}

module.exports = router;