import {
  TeachingDiaryPdfBuilder,
  sanitizeDocumentText,
} from './teachingDocumentPdfEngine.js';

/**
 * Generates an official, publication-quality A4 PDF teaching report or inspection dossier
 * Follows 17-section official curriculum order with full Kannada Unicode support.
 * @param {Object} reportData - Aggregated teacher, diaryEntries, photos, and meta data
 * @returns {Promise<Buffer>}
 */
export const generatePdfReport = async (reportData = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        teacher = {},
        meta = {},
        diaryEntries = [],
        photos = [],
      } = reportData;

      const schoolName = (teacher.schoolName || 'Government Model Secondary School').toUpperCase();
      const teacherName = teacher.fullName || teacher.name || 'Subject Teacher';
      const designation = teacher.designation || 'Senior Subject Teacher';
      const academicYear = meta.academicYear || '2026-2027';

      const documentTitle =
        meta.reportType === 'daily'
          ? 'DAILY CLASSROOM TEACHING DIARY'
          : meta.reportType === 'weekly'
          ? 'WEEKLY ACADEMIC TEACHING & PROGRESS REPORT'
          : meta.reportType === 'monthly'
          ? 'MONTHLY TEACHING DOCUMENTATION & SYLLABUS AUDIT'
          : `OFFICIAL TEACHING DOSSIER - ${(meta.reportType || 'RECORD').toUpperCase()}`;

      const builder = new TeachingDiaryPdfBuilder({
        schoolName,
        teacherName,
        documentTitle,
        academicYear,
      });

      const doc = builder.getDoc();
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 1. SECTION 1: TOP OFFICIAL SCHOOL HEADER (Page 1)
      builder.renderOfficialSchoolHeader({
        date: meta.startDate || new Date(),
        recordNumber: meta.reportType === 'daily' ? 'DAILY-01' : `${(meta.reportType || 'REC').toUpperCase()}-DOSSIER`,
        status: 'Officially Verified',
      });

      // If no entries found, render clean notice
      if (!diaryEntries || diaryEntries.length === 0) {
        builder.renderTeacherAndLessonMatrix({
          teacherName,
          teacherDesignation: designation,
          className: meta.className || 'All Classes',
          subject: meta.subject || 'All Subjects',
          date: meta.startDate || new Date(),
          topic: 'No classroom teaching entries logged for the selected period.',
        });

        builder.renderContentBlock(
          'RECORD STATUS',
          'No teaching entries were recorded for the specified date filter and parameters.'
        );
      } else {
        // Iterate through diary entries
        diaryEntries.forEach((entry, idx) => {
          if (idx > 0) {
            doc.addPage();
            builder.renderRunningHeader();
          }

          const rawTopic = entry.topic || entry.title || 'Instructional Teaching Session';
          const cleanTopic = sanitizeDocumentText(rawTopic);
          const cleanUnit = sanitizeDocumentText(entry.unit || entry.chapter || 'Unit 1 - Core Syllabus');

          // 2 & 3. TEACHER & LESSON INFORMATION MATRIX
          builder.renderTeacherAndLessonMatrix({
            teacherName,
            teacherDesignation: designation,
            className: entry.className || meta.className || 'Class 9',
            section: entry.section || 'A',
            subject: entry.subject || meta.subject || 'Artificial Intelligence',
            date: entry.date || meta.startDate,
            dayOfWeek: entry.dayOfWeek || entry.day || 'Day',
            period: entry.periodNumber || entry.period || 1,
            startTime: entry.startTime || '09:30',
            endTime: entry.endTime || '10:15',
            durationMinutes: entry.durationMinutes || 45,
            unit: cleanUnit,
            topic: cleanTopic,
          });

          // 4. PREVIOUS KNOWLEDGE
          if (entry.previousKnowledge) {
            builder.renderContentBlock(
              '4. PREVIOUS KNOWLEDGE (ಪ್ರವೇಶ ಮಟ್ಟದ ಜ್ಞಾನ)',
              entry.previousKnowledge
            );
          }

          // 5. LEARNING OBJECTIVES
          if (entry.learningObjectives) {
            builder.renderContentBlock(
              '5. LEARNING OBJECTIVES (ಕಲಿಕಾ ಉದ್ದೇಶಗಳು)',
              entry.learningObjectives
            );
          }

          // 6. TEACHING-LEARNING MATERIALS
          const materials = [
            entry.teachingMaterialsUsed,
            entry.teachingAids,
            entry.teachingResources?.textbooks ? `Textbooks: ${entry.teachingResources.textbooks}` : null,
            entry.teachingResources?.digitalResources ? `Digital Aids: ${entry.teachingResources.digitalResources}` : null,
          ]
            .filter(Boolean)
            .join(' | ');

          if (materials) {
            builder.renderContentBlock(
              '6. TEACHING-LEARNING MATERIALS & AIDS (ಬೋಧನಾ ಉಪಕರಣಗಳು)',
              materials
            );
          }

          // 7. TEACHING METHODOLOGY
          if (entry.teachingMethodology) {
            builder.renderContentBlock(
              '7. TEACHING METHODOLOGY (ಬೋಧನಾ ವಿಧಾನ)',
              entry.teachingMethodology
            );
          }

          // 8. DETAILED TEACHING CONTENT
          const detailedContent = entry.detailedContent || entry.detailedExplanation || entry.detailedTeachingExplanation;
          if (detailedContent) {
            builder.renderContentBlock(
              '8. DETAILED ACTUAL TEACHING CONTENT & CLASSROOM INSTRUCTION (ವಿವರವಾದ ಬೋಧನಾ ವಿಷಯ)',
              detailedContent
            );
          }

          // 9. TEACHING-LEARNING PROCESS TABLE
          const defaultProcessStages = [
            {
              stage: 'Introduction',
              teacherActivities:
                entry.introduction ||
                'Recalls previous knowledge, introduces key concepts, and defines clear lesson goals.',
              studentActivities:
                'Actively responds to questions, discusses prior knowledge, and records lesson focus.',
              time: '7 mins',
            },
            {
              stage: 'Explanation',
              teacherActivities:
                detailedContent ||
                'Presents core principles with structured whiteboard diagrams and real-world examples.',
              studentActivities:
                'Maintains notes in notebooks, asks clarifying questions, and identifies core definitions.',
              time: '15 mins',
            },
            {
              stage: 'Activity / Demo',
              teacherActivities:
                entry.practicalDemonstrations ||
                entry.activitiesConducted ||
                'Facilitates interactive paired activity or demonstration analyzing practical examples.',
              studentActivities:
                'Works in pairs, solves guided exercise problems, and verifies results.',
              time: '13 mins',
            },
            {
              stage: 'Review & Close',
              teacherActivities:
                'Conducts formative oral check, summarizes key learning indicators, and assigns homework.',
              studentActivities:
                'Answers formative questions, summarizes key points in diaries, and notes homework.',
              time: '10 mins',
            },
          ];

          const processStages =
            Array.isArray(entry.teachingLearningProcess) && entry.teachingLearningProcess.length > 0
              ? entry.teachingLearningProcess
              : defaultProcessStages;

          builder.renderTeachingLearningProcess(processStages);

          // 10. CLASSROOM ACTIVITIES
          const actsText = typeof entry.classroomActivities === 'string'
            ? entry.classroomActivities
            : (entry.activitiesConducted || entry.classroomActivities?.activitiesConducted || '');

          if (actsText) {
            builder.renderContentBlock(
              '10. CLASSROOM ACTIVITIES CONDUCTED (ತರಗತಿ ಚಟುವಟಿಕೆಗಳು)',
              actsText
            );
          }

          // 11. STUDENT PARTICIPATION
          const studentPartText =
            entry.studentParticipation || entry.classroomActivities?.studentParticipation || '';

          if (studentPartText) {
            builder.renderContentBlock(
              '11. STUDENT PARTICIPATION & ENGAGEMENT (ವಿದ್ಯಾರ್ಥಿಗಳ ಸಹಭಾಗಿತ್ವ)',
              studentPartText
            );
          }

          // 12. LEARNING OUTCOMES
          const outcomesText = typeof entry.learningOutcomes === 'string'
            ? entry.learningOutcomes
            : (entry.learningOutcomes?.whatStudentsUnderstood || entry.expectedLearningOutcomes || entry.skillsDeveloped || '');

          if (outcomesText) {
            builder.renderContentBlock(
              '12. LEARNING OUTCOMES & OBSERVATIONS (ಕಲಿಕಾ ಫಲಗಳು)',
              outcomesText
            );
          }

          // 13. ASSESSMENT & EVALUATION
          const assessmentText = entry.assessment || entry.assessmentQuestions || '';
          if (assessmentText) {
            builder.renderContentBlock(
              '13. ASSESSMENT & FORMATIVE EVALUATION (ಮೌಲ್ಯಮಾಪನ)',
              assessmentText
            );
          }

          // 14. HOMEWORK & FOLLOW-UP
          const hwText = entry.homeworkAssigned || entry.homework || entry.completion?.homeworkAssigned || '';
          if (hwText) {
            const hwDetails = [
              hwText,
              `Status: ${entry.status || 'Completed'}`,
            ].filter(Boolean).join(' | ');

            builder.renderContentBlock(
              '14. HOMEWORK & FOLLOW-UP ASSIGNMENT (ಮನೆಕೆಲಸ ಮತ್ತು ಹಿಂಬಾಲನೆ)',
              hwDetails
            );
          }

          // 15. TEACHER REFLECTION
          const reflectionText = entry.teacherRemarks || entry.teacherReflection || entry.learningDifficultiesObserved || '';
          if (reflectionText) {
            builder.renderContentBlock(
              '15. TEACHER REFLECTION & REMARKS (ಶಿಕ್ಷಕರ ಅವಲೋಕನ)',
              reflectionText
            );
          }
        });
      }

      // 16. PHOTOGRAPHIC EVIDENCE (Two-column grid)
      if (photos && photos.length > 0) {
        builder.renderPhotographicEvidence(photos);
      }

      // 17. OFFICIAL ATTESTATION & SIGNATURES
      builder.renderSignatures({
        teacherName,
        teacherDesignation: designation,
      });

      // Running footers and page numbers across all pages (with zero duplicate pages!)
      builder.finalizeFooters();
    } catch (error) {
      reject(error);
    }
  });
};
