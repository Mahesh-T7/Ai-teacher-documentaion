import React from 'react';

/**
 * Sanitizes slide delimiters, placeholder tokens, and unresolved template variables
 */
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/^--\s*Slide\s*\d+\s*:\s*(.*?)\s*---$/gim, '$1')
    .replace(/--\s*Slide\s*\d+\s*:\s*(.*?)\s*---/gim, '$1')
    .replace(/^Slide\s*\d+\s*:\s*/gim, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\s*insert\s+[^\]]+\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export const PrintableLessonPlan = ({ plan, teacher }) => {
  if (!plan) return null;

  // Resolve metadata
  const schoolName = (
    plan.schoolName ||
    teacher?.schoolName ||
    'Delhi Public School, R.K. Puram'
  ).toUpperCase();

  const teacherName =
    plan.teacherName ||
    teacher?.fullName ||
    teacher?.name ||
    'Subject Teacher';

  const teacherDesignation =
    plan.teacherDesignation ||
    teacher?.designation ||
    'Senior Subject Teacher / TGT';

  const academicYear = plan.academicYear || '2026-2027';

  const dateStr = plan.date
    ? new Date(plan.date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const className = plan.className || 'Class 9';
  const section = plan.section || 'A';
  const subject = plan.subject || 'Artificial Intelligence';
  const period = plan.period ? `Period ${plan.period}` : 'Period 1';
  const duration = plan.durationMinutes || plan.duration || 45;

  const cleanTopic = sanitizeText(plan.topic || plan.title || 'Curriculum Instructional Session');
  const cleanUnit = sanitizeText(plan.unit || plan.chapter || plan.unitOrChapter || 'Core Syllabus Unit');

  // Teaching Resources
  const resources = plan.teachingResources || {};
  const resItems = [
    resources.textbooks ? `Textbooks: ${resources.textbooks}` : null,
    resources.pptPresentations ? `Presentations: ${resources.pptPresentations}` : null,
    resources.pdfMaterials ? `Handouts: ${resources.pdfMaterials}` : null,
    plan.teachingAids ? `Aids: ${plan.teachingAids}` : null,
    plan.teachingMaterialsUsed ? `Materials: ${plan.teachingMaterialsUsed}` : null,
    resources.digitalResources ? `Digital: ${resources.digitalResources}` : null,
  ].filter(Boolean);

  // Teaching-Learning Process 4-column structured table
  const defaultStages = [
    {
      stage: 'Introduction',
      teacherActivities:
        plan.introduction ||
        'Recalls previous knowledge, asks diagnostic motivating questions, and shares lesson objectives with the class.',
      studentActivities:
        'Actively responds, shares initial observations, connects previous lessons, and clarifies lesson expectations.',
      time: '7 mins',
    },
    {
      stage: 'Explanation',
      teacherActivities:
        plan.detailedExplanation ||
        plan.teachingMethodology ||
        'Explains core theoretical principles with structured diagrams, derivations, and real-life examples.',
      studentActivities:
        'Maintains notes in notebooks, listens attentively, asks questions, and identifies core formulas and definitions.',
      time: '13 mins',
    },
    {
      stage: 'Activity / Demo',
      teacherActivities:
        plan.practicalDemonstrations ||
        plan.classroomActivities ||
        'Facilitates small-group or paired exercise analyzing practical problem tasks.',
      studentActivities:
        'Collaborates in assigned pairs, performs calculations, and verifies results with teammates.',
      time: '15 mins',
    },
    {
      stage: 'Review & Close',
      teacherActivities:
        'Summarizes key learning takeaways, conducts quick formative exit check, and assigns homework.',
      studentActivities:
        'Records summarized concepts in diaries, completes exit questions, and notes homework and next lesson topic.',
      time: '10 mins',
    },
  ];

  const processStages =
    Array.isArray(plan.teachingLearningProcess) && plan.teachingLearningProcess.length > 0
      ? plan.teachingLearningProcess
      : defaultStages;

  // Photographic evidence
  const photos = plan.photos || plan.attachedPhotos || [];

  return (
    <div className="printable-a4-document bg-white text-slate-900 mx-auto w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 font-sans leading-normal">
      {/* 1. OFFICIAL SCHOOL HEADER */}
      <header className="border-b-2 border-blue-900 pb-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left Emblem Badge */}
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-900/30 flex flex-col items-center justify-center text-blue-950 font-black text-[8px] leading-tight text-center p-1 print:border-black">
            <span>OFFICIAL</span>
            <span>SCHOOL</span>
            <span>DIARY</span>
          </div>

          {/* Center Title */}
          <div className="flex-1 text-center px-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-blue-950 uppercase print:text-black">
              {schoolName}
            </h1>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase mt-0.5">
              OFFICIAL CURRICULUM LESSON PLAN & TEACHING RECORD
            </h2>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5">
              Government Recognized Academic Curriculum • Academic Year: {academicYear}
            </p>
          </div>

          {/* Right Status / Date Box */}
          <div className="w-28 rounded-md bg-slate-50 border border-slate-300 p-1.5 text-[9px] text-slate-700 space-y-0.5 print:border-black">
            <div className="flex justify-between">
              <span className="font-bold">Date:</span>
              <span>{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Record:</span>
              <span>LP-{className.replace(/\s+/g, '')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold print:text-black">
              <span>Status:</span>
              <span>{plan.status || 'Verified'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2 & 3. TEACHER, CLASS, SUBJECT, UNIT & TOPIC MATRIX TABLE */}
      <section className="mb-4 print-avoid-break">
        <table className="w-full text-xs border-collapse border border-slate-300">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="p-1.5 font-bold text-slate-700 w-28 bg-slate-100 border-r border-slate-300">
                Teacher Name:
              </td>
              <td className="p-1.5 font-semibold text-slate-900 border-r border-slate-300">
                {teacherName}
              </td>
              <td className="p-1.5 font-bold text-slate-700 w-28 bg-slate-100 border-r border-slate-300">
                Designation:
              </td>
              <td className="p-1.5 text-slate-800">
                {teacherDesignation}
              </td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                Class & Section:
              </td>
              <td className="p-1.5 font-semibold text-slate-900 border-r border-slate-300">
                {className} - Sec {section}
              </td>
              <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                Subject:
              </td>
              <td className="p-1.5 font-bold text-blue-950 border-r border-slate-300 print:text-black">
                {subject}
              </td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                Date & Day:
              </td>
              <td className="p-1.5 text-slate-800 border-r border-slate-300">
                {dateStr}
              </td>
              <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                Period & Duration:
              </td>
              <td className="p-1.5 text-slate-800">
                {period} • {duration} Mins
              </td>
            </tr>
            <tr>
              <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                Unit / Chapter:
              </td>
              <td className="p-1.5 text-slate-800 border-r border-slate-300">
                {cleanUnit}
              </td>
              <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                Topic / Concept:
              </td>
              <td className="p-1.5 font-bold text-slate-900">
                {cleanTopic}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 4. PREVIOUS KNOWLEDGE */}
      {plan.previousKnowledge && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              4. PREVIOUS KNOWLEDGE (ಪ್ರವೇಶ ಮಟ್ಟದ ಜ್ಞಾನ)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.previousKnowledge)}
            </div>
          </div>
        </section>
      )}

      {/* 5. LEARNING OBJECTIVES */}
      {plan.learningObjectives && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              5. LEARNING OBJECTIVES (ಕಲಿಕಾ ಉದ್ದೇಶಗಳು)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.learningObjectives)}
            </div>
          </div>
        </section>
      )}

      {/* 6. TEACHING-LEARNING MATERIALS */}
      {resItems.length > 0 && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              6. TEACHING-LEARNING MATERIALS & AIDS (ಬೋಧನಾ ಉಪಕರಣಗಳು)
            </div>
            <div className="p-2 text-xs text-slate-800 leading-relaxed bg-white">
              {resItems.join(' • ')}
            </div>
          </div>
        </section>
      )}

      {/* 7. TEACHING METHODOLOGY */}
      {plan.teachingMethodology && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              7. TEACHING METHODOLOGY (ಬೋಧನಾ ವಿಧಾನ)
            </div>
            <div className="p-2 text-xs text-slate-800 leading-relaxed bg-white">
              {sanitizeText(plan.teachingMethodology)}
            </div>
          </div>
        </section>
      )}

      {/* 8. DETAILED TEACHING CONTENT */}
      {(plan.detailedExplanation || plan.detailedContent) && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              8. DETAILED ACTUAL TEACHING CONTENT & CLASSROOM INSTRUCTION (ವಿವರವಾದ ಬೋಧನಾ ವಿಷಯ)
            </div>
            <div className="p-2.5 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.detailedExplanation || plan.detailedContent)}
            </div>
          </div>
        </section>
      )}

      {/* 9. TEACHING-LEARNING PROCESS 4-COLUMN TABLE */}
      <section className="mb-3 print-avoid-break">
        <div className="border border-slate-300 rounded-xs overflow-hidden">
          <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
            9. TEACHING-LEARNING PROCESS (PEDAGOGICAL TRANSACTIONS)
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-left font-bold text-blue-950 print:text-black">
                <th className="p-1.5 w-24 border-r border-slate-300">Stage</th>
                <th className="p-1.5 border-r border-slate-300">Teacher Activities & Instruction</th>
                <th className="p-1.5 border-r border-slate-300">Student Activities & Participation</th>
                <th className="p-1.5 w-16 text-center">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {processStages.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="p-1.5 font-bold text-slate-900 border-r border-slate-300 align-top">
                    {item.stage}
                  </td>
                  <td className="p-1.5 text-slate-800 border-r border-slate-300 align-top whitespace-pre-line leading-relaxed">
                    {sanitizeText(item.teacherActivities)}
                  </td>
                  <td className="p-1.5 text-slate-800 border-r border-slate-300 align-top whitespace-pre-line leading-relaxed">
                    {sanitizeText(item.studentActivities)}
                  </td>
                  <td className="p-1.5 font-bold text-slate-700 text-center align-top whitespace-nowrap">
                    {item.time || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 10. CLASSROOM ACTIVITIES */}
      {plan.classroomActivities && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              10. CLASSROOM ACTIVITIES CONDUCTED (ತರಗತಿ ಚಟುವಟಿಕೆಗಳು)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.classroomActivities)}
            </div>
          </div>
        </section>
      )}

      {/* 11. STUDENT PARTICIPATION */}
      {plan.studentParticipation && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              11. STUDENT PARTICIPATION & ENGAGEMENT (ವಿದ್ಯಾರ್ಥಿಗಳ ಸಹಭಾಗಿತ್ವ)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.studentParticipation)}
            </div>
          </div>
        </section>
      )}

      {/* 12. LEARNING OUTCOMES */}
      {(plan.learningOutcomes || plan.expectedLearningOutcomes) && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              12. LEARNING OUTCOMES & OBSERVATIONS (ಕಲಿಕಾ ಫಲಗಳು)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.learningOutcomes || plan.expectedLearningOutcomes)}
            </div>
          </div>
        </section>
      )}

      {/* 13. ASSESSMENT & EVALUATION */}
      {(plan.assessment || plan.assessmentQuestions) && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              13. ASSESSMENT & FORMATIVE EVALUATION (ಮೌಲ್ಯಮಾಪನ)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.assessment || plan.assessmentQuestions)}
            </div>
          </div>
        </section>
      )}

      {/* 14. HOMEWORK & FOLLOW-UP */}
      {(plan.homework || plan.homeworkAssigned) && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              14. HOMEWORK & FOLLOW-UP ASSIGNMENT (ಮನೆಕೆಲಸ ಮತ್ತು ಹಿಂಬಾಲನೆ)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.homework || plan.homeworkAssigned)}
            </div>
          </div>
        </section>
      )}

      {/* 15. TEACHER REFLECTION */}
      {(plan.teacherRemarks || plan.teacherReflection) && (
        <section className="mb-3 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              15. TEACHER REFLECTION & REMARKS (ಶಿಕ್ಷಕರ ಅವಲೋಕನ)
            </div>
            <div className="p-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white">
              {sanitizeText(plan.teacherRemarks || plan.teacherReflection)}
            </div>
          </div>
        </section>
      )}

      {/* 16. PHOTOGRAPHIC EVIDENCE (Two-column grid) */}
      {photos.length > 0 && (
        <section className="mb-4 print-avoid-break">
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="bg-slate-100 border-l-4 border-blue-900 text-blue-950 font-bold text-[11px] px-2.5 py-1 uppercase tracking-wide print:text-black">
              16. PHOTOGRAPHIC EVIDENCE ({photos.length} Captured Snapshot{photos.length > 1 ? 's' : ''})
            </div>
            <div className="p-3 bg-white grid grid-cols-2 gap-3">
              {photos.map((photo, pIdx) => (
                <div key={pIdx} className="border border-slate-300 rounded-xs p-1.5 bg-slate-50 text-center">
                  <div className="w-full h-36 bg-slate-200 rounded overflow-hidden flex items-center justify-center">
                    <img
                      src={photo.url || photo.previewUrl || `/uploads/${photo.storageKey || ''}`}
                      alt={photo.caption || `Class evidence ${pIdx + 1}`}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-blue-950 mt-1 truncate">
                    Date: {dateStr} | {className} {section}
                  </p>
                  <p className="text-[9px] text-slate-700 truncate">
                    {sanitizeText(photo.caption || photo.originalFileName || `Snapshot ${pIdx + 1}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 17. OFFICIAL ATTESTATION & SIGNATURES */}
      <footer className="mt-6 pt-2 border-t-2 border-slate-400 print-avoid-break">
        <div className="grid grid-cols-2 gap-6 text-xs text-slate-800">
          <div className="border border-slate-300 rounded-xs p-3 bg-slate-50/50 min-h-24 flex flex-col justify-between">
            <div>
              <p className="font-bold uppercase tracking-wider text-blue-950 text-[10px] print:text-black">
                TEACHER SIGNATURE
              </p>
              <p className="text-[11px] text-slate-700 mt-1 font-semibold">{teacherName}</p>
              <p className="text-[10px] text-slate-500">Designation: {teacherDesignation}</p>
            </div>
            <div className="border-t border-slate-300 pt-1 mt-3 flex justify-between text-[9px] text-slate-500">
              <span>Signature & Date</span>
              <span>Attested</span>
            </div>
          </div>

          <div className="border border-slate-300 rounded-xs p-3 bg-slate-50/50 min-h-24 flex flex-col justify-between">
            <div>
              <p className="font-bold uppercase tracking-wider text-blue-950 text-[10px] print:text-black">
                HEADMASTER / PRINCIPAL APPROVAL
              </p>
              <p className="text-[11px] text-slate-700 mt-1 font-semibold">School Seal & Signature</p>
              <p className="text-[10px] text-slate-500">Official Attestation & Inspection Dossier</p>
            </div>
            <div className="border-t border-slate-300 pt-1 mt-3 flex justify-between text-[9px] text-slate-500">
              <span>Signature & Stamp</span>
              <span>Date: ........................</span>
            </div>
          </div>
        </div>

        {/* Running Document Footer */}
        <div className="mt-4 text-center text-[9px] text-slate-500 flex items-center justify-between border-t border-slate-200 pt-1.5">
          <span>{schoolName} • {teacherName}</span>
          <span>Official Academic Lesson Plan Record • A4 Standard</span>
          <span>Verified School Record</span>
        </div>
      </footer>
    </div>
  );
};

export default PrintableLessonPlan;
