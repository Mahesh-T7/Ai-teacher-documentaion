import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = __dirname;
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Roster of 25 students
const students25 = Array.from({ length: 25 }, (_, i) => ({
  'Roll No': i + 1,
  'Student Name': `Student TwentyFive_${i + 1}`,
  'Admission No': `ADM-2026-${1000 + i + 1}`,
  'Gender': i % 2 === 0 ? 'M' : 'F',
  'Caste': i % 3 === 0 ? 'SC' : 'GEN',
}));
const ws25 = XLSX.utils.json_to_sheet(students25);
const wb25 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb25, ws25, 'Class 9-A Roster');
XLSX.writeFile(wb25, path.join(fixturesDir, 'roster_25.xlsx'));

// 2. Roster of 37 students with Kannada and English names
const kannadaNames = [
  'ಆರವ್ ಕುಮಾರ್', 'ಅನನ್ಯಾ ಶರ್ಮ', 'ಭಾರತ್ ಗೌಡ', 'ಚೇತನ್ ನಾಯಕ್', 'ದೀಪಿಕಾ ಪಾಟೀಲ್',
  'ಈಶ್ವರ್ ಹೆಗಡೆ', 'ಫಾತಿಮಾ ಬಾನು', 'ಗಣೇಶ್ ಭಟ್', 'ಹರ್ಷಿತಾ ರಾವ್', 'ಇಮ್ರಾನ್ ಖಾನ್',
  'ಜಗದೀಶ್ ಪ್ರಸಾದ್', 'ಕಾವ್ಯ ಶ್ರೀ', 'ಲೋಕೇಶ್ ಬಾಬು', 'ಮೇಘನಾ ರೆಡ್ಡಿ', 'ನವೀನ್ ಕುಮಾರ್',
  'ಓಂಕಾರ್ ಮಠದ', 'ಪೂಜಾ ಕಾಮತ್', 'ಖುರೇಷಿ ಅಹಮದ್', 'ರಕ್ಷಿತ್ ಶೆಟ್ಟಿ', 'ಸಂಧ್ಯಾ ಆಚಾರ್ಯ',
  'ತೇಜಸ್ ಗೌಡ', 'ಉಲ್ಲಾಸ್ ನಾರಾಯಣ್', 'ವರ್ಷಾ ನಾಯರ್', 'ವಿಕ್ರಮ್ ಸಿಂಗ್', 'ಯಶವಂತ್ ಸೋಮಣ್ಣ',
  'ಜೀನತ್ ಬೇಗಂ', 'ಮಹೇಶ್ ಕುಮಾರ್', 'ಪ್ರವೀಣ್ ಜೋಶಿ', 'ರೋಹಿತ್ ವರ್ಮಾ', 'ಸ್ನೇಹಾ ಹೆಬ್ಬಾರ್',
  'ಸುನಿಲ್ ದೇಶಪಾಂಡೆ', 'ತನುಶ್ರೀ ಶೆಣೈ', 'ವಿನೋದ್ ಕಾಂಬ್ಳೆ', 'ಶರಣ್ ಬಸಪ್ಪ', 'ಶಾಂತಲಾ ದೇವಿ',
  'ಗಿರೀಶ್ ಕರ್ನಾಡ್', 'ವಿಶ್ವನಾಥ್ ಭಟ್'
];
const students37 = kannadaNames.map((name, i) => ({
  'ಕ್ರ.ಸಂ': i + 1,
  'ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು': name,
  'ದಾಖಲಾತಿ ಸಂಖ್ಯೆ': `ADM-KA-${2000 + i + 1}`,
  'ಲಿಂಗ': i % 2 === 0 ? 'M' : 'F',
  'ವರ್ಗ': 'OBC',
}));
const ws37 = XLSX.utils.json_to_sheet(students37);
const wb37 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb37, ws37, 'ವಿದ್ಯಾರ್ಥಿ ಪಟ್ಟಿ');
XLSX.writeFile(wb37, path.join(fixturesDir, 'roster_37.xlsx'));

// 3. Roster of 40 students
const students40 = Array.from({ length: 40 }, (_, i) => ({
  'Sl. No.': i + 1,
  'Name of Student': `Student Forty_${i + 1}`,
  'Admission Number': `ADM-40-${3000 + i + 1}`,
  'Gender': i % 2 === 0 ? 'Male' : 'Female',
  'Category': 'Cat-1',
}));
const ws40 = XLSX.utils.json_to_sheet(students40);
const wb40 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb40, ws40, 'Students_40');
XLSX.writeFile(wb40, path.join(fixturesDir, 'roster_40.xlsx'));

// 4. Roster of 58 students (CSV format)
const students58 = Array.from({ length: 58 }, (_, i) => ({
  'Roll No': i + 1,
  'Student Name': `Student FiftyEight_${String(i + 1).padStart(2, '0')}`,
  'Admission No': `ADM-58-${4000 + i + 1}`,
  'Gender': i % 2 === 0 ? 'M' : 'F',
}));
const ws58 = XLSX.utils.json_to_sheet(students58);
const csv58 = XLSX.utils.sheet_to_csv(ws58);
fs.writeFileSync(path.join(fixturesDir, 'roster_58.csv'), csv58, 'utf-8');

console.log('Successfully generated all 4 test fixture files in', fixturesDir);
