import {
  TeachingDiaryPdfBuilder,
  sanitizeDocumentText,
} from './teachingDocumentPdfEngine.js';

/**
 * Generates an official, print-ready A4 Portrait PDF Lesson Plan
 * Follows the 17-section standardized curriculum order with full Kannada Unicode support.
 * @param {Object} planData - Lesson plan fields and teacher metadata
 * @returns {Promise<Buffer>}
 */
export const generateLessonPlanPdf = async (planData = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const schoolName = (
        planData.schoolName ||
        planData.teacher?.schoolName ||
        'Government Model Secondary School'
      ).toUpperCase();

      const teacherName =
        planData.teacherName ||
        planData.teacher?.fullName ||
        planData.teacher?.name ||
        'Subject Teacher';

      const teacherDesignation =
        planData.teacherDesignation ||
        planData.teacher?.designation ||
        'Senior Subject Teacher / TGT';

      const academicYear = planData.academicYear || '2026-2027';

      const builder = new TeachingDiaryPdfBuilder({
        schoolName,
        teacherName,
        documentTitle: 'OFFICIAL CURRICULUM LESSON PLAN',
        academicYear,
      });

      const doc = builder.getDoc();
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 1. SECTION 1: TOP OFFICIAL SCHOOL HEADER (Page 1)
      builder.renderOfficialSchoolHeader({
        date: planData.date || new Date(),
        recordNumber: `LP-${(planData.className || 'C9').replace(/\s+/g, '')}-${(planData.section || 'A')}`,
        status: planData.status === 'Approved' ? 'Verified & Approved' : 'Submitted & Reviewed',
      });

      const cleanTopic = sanitizeDocumentText(planData.topic || planData.title || 'Curriculum Lesson Session');
      const cleanUnit = sanitizeDocumentText(planData.unit || planData.chapter || planData.unitOrChapter || 'Core Syllabus Unit');

      // 2 & 3. SECTION 2 & 3: TEACHER, CLASS, SUBJECT, UNIT & TOPIC MATRIX
      builder.renderTeacherAndLessonMatrix({
        teacherName,
        teacherDesignation,
        className: planData.className || 'Class 9',
        section: planData.section || 'A',
        subject: planData.subject || 'Artificial Intelligence',
        date: planData.date || new Date(),
        dayOfWeek: planData.dayOfWeek || 'Weekday',
        period: planData.period || 1,
        startTime: planData.startTime || '09:30',
        endTime: planData.endTime || '10:15',
        durationMinutes: planData.durationMinutes || planData.duration || 45,
        unit: cleanUnit,
        topic: cleanTopic,
      });

      // 4. PREVIOUS KNOWLEDGE
      if (planData.previousKnowledge) {
        builder.renderContentBlock(
          '4. PREVIOUS KNOWLEDGE (ಪ್ರವೇಶ ಮಟ್ಟದ ಜ್ಞಾನ)',
          planData.previousKnowledge
        );
      }

      // 5. LEARNING OBJECTIVES
      if (planData.learningObjectives) {
        builder.renderContentBlock(
          '5. LEARNING OBJECTIVES (ಕಲಿಕಾ ಉದ್ದೇಶಗಳು)',
          planData.learningObjectives
        );
      }

      // 6. TEACHING-LEARNING MATERIALS
      const resItems = [];
      if (planData.teachingResources) {
        const tr = planData.teachingResources;
        if (tr.textbooks) resItems.push(`Textbooks: ${tr.textbooks}`);
        if (tr.pptPresentations) resItems.push(`Presentations: ${tr.pptPresentations}`);
        if (tr.pdfMaterials) resItems.push(`Handouts / PDFs: ${tr.pdfMaterials}`);
        if (tr.teachingAids) resItems.push(`Aids: ${tr.teachingAids}`);
        if (tr.digitalResources) resItems.push(`Digital Media: ${tr.digitalResources}`);
      }
      if (planData.teachingAids && resItems.length === 0) {
        resItems.push(`Teaching Aids: ${planData.teachingAids}`);
      }
      if (planData.teachingMaterialsUsed) {
        resItems.push(`Materials: ${planData.teachingMaterialsUsed}`);
      }
      if (resItems.length > 0) {
        builder.renderContentBlock(
          '6. TEACHING-LEARNING MATERIALS & AIDS (ಬೋಧನಾ ಉಪಕರಣಗಳು)',
          resItems.join(' | ')
        );
      }

      // 7. TEACHING METHODOLOGY
      if (planData.teachingMethodology) {
        builder.renderContentBlock(
          '7. TEACHING METHODOLOGY (ಬೋಧನಾ ವಿಧಾನ)',
          planData.teachingMethodology
        );
      }

      // 8. DETAILED TEACHING CONTENT
      const detailedText = planData.detailedExplanation || planData.detailedContent || planData.introduction;
      if (detailedText) {
        builder.renderContentBlock(
          '8. DETAILED ACTUAL TEACHING CONTENT & CLASSROOM INSTRUCTION (ವಿವರವಾದ ಬೋಧನಾ ವಿಷಯ)',
          detailedText
        );
      }

      // 9. TEACHING-LEARNING PROCESS 4-COLUMN TABLE
      const defaultStages = [
        {
          stage: 'Introduction',
          teacherActivities:
            planData.introduction ||
            'Recalls previous knowledge, asks motivating diagnostic questions, and outlines lesson objectives.',
          studentActivities:
            'Actively responds to questions, shares initial thoughts, and connects prior knowledge.',
          time: '7 mins',
        },
        {
          stage: 'Explanation',
          teacherActivities:
            detailedText ||
            'Presents core principles with visual blackboard diagrams and real-life examples.',
          studentActivities:
            'Maintains notes in notebooks, asks clarifying questions, and identifies formulas.',
          time: '12 mins',
        },
        {
          stage: 'Demonstration',
          teacherActivities:
            planData.practicalDemonstrations ||
            'Demonstrates laboratory apparatus, digital simulation, or practical problem solving.',
          studentActivities:
            'Observes procedural steps and records observations on class worksheets.',
          time: '8 mins',
        },
        {
          stage: 'Activity',
          teacherActivities:
            planData.classroomActivities ||
            'Facilitates paired or small-group activity; guides students as they solve problems.',
          studentActivities:
            'Collaborates with peers, solves activity tasks, and checks answers with teammates.',
          time: '10 mins',
        },
        {
          stage: 'Discussion',
          teacherActivities:
            planData.groupDiscussions ||
            'Moderates whole-class Q&A, prompts students to justify answers, and checks comprehension.',
          studentActivities:
            'Participates in class discussion, debates problem approaches, and clarifies doubts.',
          time: '5 mins',
        },
        {
          stage: 'Conclusion',
          teacherActivities:
            'Summarizes key learning points, checks exit slips, and introduces homework.',
          studentActivities:
            'Summarizes key points in diaries, completes exit questions, and notes homework.',
          time: '3 mins',
        },
      ];

      const processStages =
        Array.isArray(planData.teachingLearningProcess) && planData.teachingLearningProcess.length > 0
          ? planData.teachingLearningProcess
          : defaultStages;

      builder.renderTeachingLearningProcess(processStages);

      // 10. CLASSROOM ACTIVITIES
      if (planData.classroomActivities) {
        builder.renderContentBlock(
          '10. CLASSROOM ACTIVITIES CONDUCTED (ತರಗತಿ ಚಟುವಟಿಕೆಗಳು)',
          planData.classroomActivities
        );
      }

      // 11. STUDENT PARTICIPATION
      if (planData.studentParticipation) {
        builder.renderContentBlock(
          '11. STUDENT PARTICIPATION & ENGAGEMENT (ವಿದ್ಯಾರ್ಥಿಗಳ ಸಹಭಾಗಿತ್ವ)',
          planData.studentParticipation
        );
      }

      // 12. LEARNING OUTCOMES
      const outcomes = planData.learningOutcomes || planData.expectedLearningOutcomes || planData.skillsDeveloped;
      if (outcomes) {
        builder.renderContentBlock(
          '12. LEARNING OUTCOMES & OBSERVATIONS (ಕಲಿಕಾ ಫಲಗಳು)',
          outcomes
        );
      }

      // 13. ASSESSMENT & EVALUATION
      const assessment = planData.assessment || planData.assessmentQuestions;
      if (assessment) {
        builder.renderContentBlock(
          '13. ASSESSMENT & FORMATIVE EVALUATION (ಮೌಲ್ಯಮಾಪನ)',
          assessment
        );
      }

      // 14. HOMEWORK & FOLLOW-UP
      const hw = planData.homework || planData.homeworkAssigned;
      if (hw) {
        builder.renderContentBlock(
          '14. HOMEWORK & FOLLOW-UP ASSIGNMENT (ಮನೆಕೆಲಸ ಮತ್ತು ಹಿಂಬಾಲನೆ)',
          hw
        );
      }

      // 15. TEACHER REFLECTION
      const reflection = planData.teacherRemarks || planData.teacherReflection;
      if (reflection) {
        builder.renderContentBlock(
          '15. TEACHER REFLECTION & REMARKS (ಶಿಕ್ಷಕರ ಅವಲೋಕನ)',
          reflection
        );
      }

      // 16. PHOTOGRAPHIC EVIDENCE
      const photos = planData.photos || planData.attachedPhotos || [];
      if (Array.isArray(photos) && photos.length > 0) {
        builder.renderPhotographicEvidence(photos);
      }

      // 17. OFFICIAL ATTESTATION & SIGNATURES
      builder.renderSignatures({
        teacherName,
        teacherDesignation,
      });

      // Running footers and page numbers across all pages (with zero duplicate pages!)
      builder.finalizeFooters();
    } catch (err) {
      reject(err);
    }
  });
};
