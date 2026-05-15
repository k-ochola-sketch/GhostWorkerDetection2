const express = require('express');
const { Student, Attendance, School, Capitation } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get attendance report
router.get('/attendance', authenticateToken, async (req, res) => {
  try {
    const {
      schoolId,
      startDate,
      endDate,
      grade,
      format = 'json'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const where = {
      date: {
        [require('sequelize').Op.between]: [startDate, endDate]
      }
    };

    // Role-based filtering
    if (req.user.role === 'School Admin' || req.user.role === 'Teacher') {
      where.schoolId = req.user.schoolId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    const attendances = await Attendance.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          where: grade ? { grade } : {},
          attributes: ['id', 'firstName', 'lastName', 'admissionNumber', 'grade', 'isFlagged']
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county']
        }
      ],
      order: [
        ['schoolId', 'ASC'],
        ['date', 'ASC'],
        [{ model: Student, as: 'student' }, 'lastName', 'ASC']
      ],
    });

    // Group by school and calculate statistics
    const reportData = {};
    attendances.forEach(attendance => {
      const schoolId = attendance.schoolId;
      if (!reportData[schoolId]) {
        reportData[schoolId] = {
          school: attendance.school,
          students: {},
          summary: {
            totalDays: new Set(),
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          }
        };
      }

      const studentId = attendance.student.id;
      if (!reportData[schoolId].students[studentId]) {
        reportData[schoolId].students[studentId] = {
          student: attendance.student,
          records: [],
          summary: { present: 0, absent: 0, late: 0, excused: 0 }
        };
      }

      reportData[schoolId].students[studentId].records.push(attendance);
      reportData[schoolId].students[studentId].summary[attendance.status.toLowerCase()]++;
      reportData[schoolId].summary[attendance.status.toLowerCase()]++;
      reportData[schoolId].summary.totalDays.add(attendance.date);
    });

    // Calculate percentages and finalize summary
    Object.values(reportData).forEach(schoolData => {
      schoolData.summary.totalDays = schoolData.summary.totalDays.size;
      schoolData.summary.attendanceRate = schoolData.summary.totalDays > 0
        ? ((schoolData.summary.present + schoolData.summary.late) / (schoolData.summary.totalDays * Object.keys(schoolData.students).length)) * 100
        : 0;

      Object.values(schoolData.students).forEach(studentData => {
        const total = studentData.summary.present + studentData.summary.absent + studentData.summary.late + studentData.summary.excused;
        studentData.summary.attendanceRate = total > 0 ? (studentData.summary.present / total) * 100 : 0;
      });
    });

    if (format === 'csv') {
      return generateAttendanceCSV(reportData, res);
    }

    res.json({
      period: { startDate, endDate },
      schools: Object.values(reportData),
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ghost students report
router.get('/ghost-students', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer', 'County Director'), async (req, res) => {
  try {
    const { schoolId, riskThreshold = 0.7, format = 'json' } = req.query;

    const where = {
      isFlagged: true,
      riskScore: { [require('sequelize').Op.gte]: riskThreshold }
    };

    if (schoolId) where.schoolId = schoolId;

    const ghostStudents = await Student.findAll({
      where,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county']
        },
        {
          model: Attendance,
          as: 'attendances',
          where: {
            date: {
              [require('sequelize').Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
            }
          },
          required: false,
        }
      ],
      order: [['riskScore', 'DESC'], ['schoolId', 'ASC']],
    });

    // Calculate detailed statistics for each ghost student
    const reportData = ghostStudents.map(student => {
      const attendances = student.attendances || [];
      const totalDays = attendances.length;
      const presentDays = attendances.filter(a => a.status === 'Present').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          grade: student.grade,
          enrollmentDate: student.enrollmentDate,
        },
        school: student.school,
        riskMetrics: {
          riskScore: parseFloat(student.riskScore),
          attendanceRate: attendanceRate.toFixed(2),
          totalDaysTracked: totalDays,
          presentDays,
          lastAttendanceDate: student.lastAttendanceDate,
          attendanceStreak: student.attendanceStreak,
        },
        flaggedReason: student.flaggedReason,
        potentialSavings: calculatePotentialSavings(student),
      };
    });

    if (format === 'csv') {
      return generateGhostStudentsCSV(reportData, res);
    }

    res.json({
      totalGhostStudents: reportData.length,
      riskThreshold,
      ghostStudents: reportData,
      summary: {
        highRisk: reportData.filter(s => s.riskMetrics.riskScore >= 0.9).length,
        mediumRisk: reportData.filter(s => s.riskMetrics.riskScore >= 0.7 && s.riskMetrics.riskScore < 0.9).length,
        totalPotentialSavings: reportData.reduce((sum, s) => sum + s.potentialSavings, 0),
      }
    });
  } catch (error) {
    console.error('Ghost students report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get capitation report
router.get('/capitation', authenticateToken, authorizeRoles('Super Admin', 'Ministry Officer'), async (req, res) => {
  try {
    const { academicYear, status, format = 'json' } = req.query;

    const where = {};
    if (academicYear) where.academicYear = academicYear;
    if (status) where.status = status;

    const capitations = await Capitation.findAll({
      where,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'code', 'county', 'type']
        }
      ],
      order: [['schoolId', 'ASC'], ['academicYear', 'DESC'], ['term', 'DESC']],
    });

    const reportData = capitations.map(capitation => ({
      school: capitation.school,
      capitation: {
        academicYear: capitation.academicYear,
        term: capitation.term,
        enrolledStudents: capitation.enrolledStudents,
        ratePerStudent: parseFloat(capitation.ratePerStudent),
        totalAmount: parseFloat(capitation.totalAmount),
        disbursedAmount: parseFloat(capitation.disbursedAmount),
        status: capitation.status,
        flaggedStudents: capitation.flaggedStudents,
        adjustedAmount: capitation.adjustedAmount ? parseFloat(capitation.adjustedAmount) : null,
      }
    }));

    if (format === 'csv') {
      return generateCapitationCSV(reportData, res);
    }

    const summary = {
      totalSchools: new Set(capitations.map(c => c.schoolId)).size,
      totalAllocated: capitations.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0),
      totalDisbursed: capitations.reduce((sum, c) => sum + parseFloat(c.disbursedAmount), 0),
      flaggedRecords: capitations.filter(c => c.status === 'Flagged').length,
      pendingRecords: capitations.filter(c => c.status === 'Pending').length,
    };

    res.json({
      summary,
      capitations: reportData,
    });
  } catch (error) {
    console.error('Capitation report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for CSV generation
function generateAttendanceCSV(reportData, res) {
  const csvData = [];

  // CSV headers
  csvData.push(['School', 'Student Name', 'Admission Number', 'Grade', 'Date', 'Status', 'Check-in Time', 'Check-out Time']);

  Object.values(reportData).forEach(schoolData => {
    Object.values(schoolData.students).forEach(studentData => {
      studentData.records.forEach(record => {
        csvData.push([
          schoolData.school.name,
          `${studentData.student.firstName} ${studentData.student.lastName}`,
          studentData.student.admissionNumber,
          studentData.student.grade,
          record.date,
          record.status,
          record.checkInTime || '',
          record.checkOutTime || ''
        ]);
      });
    });
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
  res.send(csvData.map(row => row.join(',')).join('\n'));
}

function generateGhostStudentsCSV(reportData, res) {
  const csvData = [];

  csvData.push(['School', 'Student Name', 'Admission Number', 'Grade', 'Risk Score', 'Attendance Rate', 'Last Attendance', 'Potential Savings']);

  reportData.forEach(data => {
    csvData.push([
      data.school.name,
      data.student.name,
      data.student.admissionNumber,
      data.student.grade,
      data.riskMetrics.riskScore,
      `${data.riskMetrics.attendanceRate}%`,
      data.riskMetrics.lastAttendanceDate || 'Never',
      data.potentialSavings
    ]);
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ghost_students_report.csv"');
  res.send(csvData.map(row => row.join(',')).join('\n'));
}

function generateCapitationCSV(reportData, res) {
  const csvData = [];

  csvData.push(['School', 'County', 'Academic Year', 'Term', 'Enrolled Students', 'Rate per Student', 'Total Amount', 'Disbursed Amount', 'Status']);

  reportData.forEach(data => {
    csvData.push([
      data.school.name,
      data.school.county,
      data.capitation.academicYear,
      data.capitation.term,
      data.capitation.enrolledStudents,
      data.capitation.ratePerStudent,
      data.capitation.totalAmount,
      data.capitation.disbursedAmount,
      data.capitation.status
    ]);
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="capitation_report.csv"');
  res.send(csvData.map(row => row.join(',')).join('\n'));
}

function calculatePotentialSavings(student) {
  // Estimate annual capitation per student (this should be configurable)
  const annualCapitationPerStudent = 15000; // KES
  const monthsEnrolled = Math.max(1, Math.ceil((Date.now() - new Date(student.enrollmentDate)) / (30 * 24 * 60 * 60 * 1000)));

  // Higher risk score means higher potential savings
  const savingsMultiplier = student.riskScore;

  return Math.round((annualCapitationPerStudent / 12) * monthsEnrolled * savingsMultiplier);
}

module.exports = router;