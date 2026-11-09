/**
 * Frontend Marks Calculation Engine
 * Matches backend marksCalculationEngine.js exactly for instant, real-time client-side calculation.
 */

export function applyRounding(val, rule = 'round') {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  switch (rule) {
    case 'floor':
      return Math.floor(val);
    case 'ceil':
      return Math.ceil(val);
    case 'decimal_1':
      return Math.round(val * 10) / 10;
    case 'decimal_2':
      return Math.round(val * 100) / 100;
    case 'none':
      return val;
    case 'round':
    default:
      return Math.round(val);
  }
}

export function safeEvaluateFormula(formula, variables = {}) {
  if (!formula || typeof formula !== 'string' || !formula.trim()) {
    return 0;
  }
  try {
    const tokens = tokenize(formula.trim());
    const parser = new Parser(tokens, variables);
    return parser.parse();
  } catch (err) {
    return 0;
  }
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let numStr = '';
      while (i < len && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: 'IDENT', value: ident });
      continue;
    }

    if ('+-*/%^(),'.includes(ch)) {
      tokens.push({ type: ch, value: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected character in formula: "${ch}"`);
  }

  return tokens;
}

class Parser {
  constructor(tokens, variables) {
    this.tokens = tokens;
    this.pos = 0;
    this.variables = variables;
  }

  peek() {
    return this.tokens[this.pos] || null;
  }

  consume(expectedType = null) {
    const token = this.tokens[this.pos];
    if (!token) throw new Error('Unexpected end of formula');
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected "${expectedType}", found "${token.type}"`);
    }
    this.pos++;
    return token;
  }

  parse() {
    const result = this.expression();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token at position ${this.pos}`);
    }
    return result;
  }

  expression() {
    return this.additive();
  }

  additive() {
    let left = this.multiplicative();
    while (this.peek() && (this.peek().type === '+' || this.peek().type === '-')) {
      const op = this.consume().type;
      const right = this.multiplicative();
      if (op === '+') left = left + right;
      else left = left - right;
    }
    return left;
  }

  multiplicative() {
    let left = this.unary();
    while (this.peek() && (this.peek().type === '*' || this.peek().type === '/' || this.peek().type === '%')) {
      const op = this.consume().type;
      const right = this.unary();
      if (op === '*') left = left * right;
      else if (op === '/') {
        left = right === 0 ? 0 : left / right;
      } else if (op === '%') {
        left = right === 0 ? 0 : left % right;
      }
    }
    return left;
  }

  unary() {
    if (this.peek() && this.peek().type === '-') {
      this.consume('-');
      return -this.unary();
    }
    if (this.peek() && this.peek().type === '+') {
      this.consume('+');
      return this.unary();
    }
    return this.primary();
  }

  primary() {
    const token = this.peek();
    if (!token) throw new Error('Expected expression');

    if (token.type === 'NUMBER') {
      this.consume();
      return token.value;
    }

    if (token.type === '(') {
      this.consume('(');
      const val = this.expression();
      this.consume(')');
      return val;
    }

    if (token.type === 'IDENT') {
      const ident = this.consume('IDENT').value;

      // Function call
      if (this.peek() && this.peek().type === '(') {
        this.consume('(');
        const args = [];
        if (this.peek() && this.peek().type !== ')') {
          args.push(this.expression());
          while (this.peek() && this.peek().type === ',') {
            this.consume(',');
            args.push(this.expression());
          }
        }
        this.consume(')');
        return this.executeFunction(ident.toUpperCase(), args);
      }

      // Variable lookup
      const varKeyUpper = ident.toUpperCase();
      for (const [k, v] of Object.entries(this.variables)) {
        if (k.toUpperCase() === varKeyUpper) {
          const num = parseFloat(v);
          return isNaN(num) ? 0 : num;
        }
      }

      return 0;
    }

    throw new Error('Unexpected token');
  }

  executeFunction(fnName, args) {
    switch (fnName) {
      case 'SUM':
        return args.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
      case 'AVG':
      case 'AVERAGE':
        return args.length === 0 ? 0 : args.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0) / args.length;
      case 'MIN':
        return args.length === 0 ? 0 : Math.min(...args);
      case 'MAX':
        return args.length === 0 ? 0 : Math.max(...args);
      case 'ROUND':
        if (args.length === 1) return Math.round(args[0]);
        if (args.length >= 2) {
          const factor = Math.pow(10, Math.round(args[1]));
          return Math.round(args[0] * factor) / factor;
        }
        return 0;
      case 'BEST_OF': {
        if (args.length < 2) return 0;
        const count = Math.max(1, Math.round(args[0]));
        const vals = args.slice(1).map((v) => parseFloat(v) || 0);
        vals.sort((a, b) => b - a);
        return vals.slice(0, count).reduce((sum, v) => sum + v, 0);
      }
      default:
        return 0;
    }
  }
}

export function validateTemplateConfiguration(components = []) {
  const errors = [];
  const codeMap = new Map();

  components.forEach((comp, idx) => {
    if (!comp.code || !comp.code.trim()) {
      errors.push(`Component at position ${idx + 1} is missing a code identifier.`);
      return;
    }
    const cleanCode = comp.code.trim().toUpperCase();
    if (codeMap.has(cleanCode)) {
      errors.push(`Duplicate component code: "${cleanCode}". Codes must be unique.`);
    }
    codeMap.set(cleanCode, comp);
  });

  const graph = new Map();
  for (const [code, comp] of codeMap.entries()) {
    const deps = new Set();
    const method = comp.calculationMethod || 'direct';

    if (['sum', 'average', 'best_of'].includes(method)) {
      if (Array.isArray(comp.dependencies)) {
        comp.dependencies.forEach((d) => deps.add(d.trim().toUpperCase()));
      }
    } else if (method === 'formula' && comp.formula) {
      try {
        const tokens = tokenize(comp.formula);
        tokens.forEach((t) => {
          if (t.type === 'IDENT') {
            const upper = t.value.toUpperCase();
            if (!['SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'ROUND', 'BEST_OF'].includes(upper)) {
              deps.add(upper);
            }
          }
        });
      } catch (err) {
        errors.push(`Formula syntax error in component "${code}": ${err.message}`);
      }
    }

    graph.set(code, Array.from(deps));
  }

  for (const [code, deps] of graph.entries()) {
    for (const dep of deps) {
      if (!codeMap.has(dep)) {
        errors.push(`Component "${code}" references unknown component code "${dep}".`);
      }
      if (dep === code) {
        errors.push(`Component "${code}" cannot reference itself.`);
      }
    }
  }

  const visited = new Set();
  const recStack = new Set();

  function hasCycle(node) {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (hasCycle(node)) {
        errors.push(`Circular dependency detected involving component "${node}".`);
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function calculateComponentFinalMarks(component, rawMarksMap = {}, finalMarksMap = {}) {
  const method = component.calculationMethod || 'direct';
  const code = (component.code || '').trim().toUpperCase();
  const rawObtained = parseFloat(rawMarksMap[code] ?? rawMarksMap[component.code]) || 0;
  const maxRaw = parseFloat(component.maxRawMarks ?? component.maxRaw) || 1;
  const finalContribution = parseFloat(component.finalWeightage ?? component.finalMarks) || 0;

  switch (method) {
    case 'direct':
      return finalContribution > 0
        ? Math.min(rawObtained, finalContribution)
        : Math.min(rawObtained, maxRaw);

    case 'proportional':
      return maxRaw === 0 ? 0 : (rawObtained / maxRaw) * finalContribution;

    case 'percentage':
      return maxRaw === 0 ? 0 : (rawObtained / maxRaw) * 100;

    case 'weighted_percentage':
      return maxRaw === 0 ? 0 : ((rawObtained / maxRaw) * 100) * (finalContribution / 100);

    case 'sum': {
      const deps = component.dependencies || [];
      return deps.reduce((sum, depCode) => {
        const cleanDep = depCode.trim().toUpperCase();
        const val = finalMarksMap[cleanDep] !== undefined ? finalMarksMap[cleanDep] : (parseFloat(rawMarksMap[cleanDep]) || 0);
        return sum + val;
      }, 0);
    }

    case 'average': {
      const deps = component.dependencies || [];
      if (deps.length === 0) return 0;
      const total = deps.reduce((sum, depCode) => {
        const cleanDep = depCode.trim().toUpperCase();
        const val = finalMarksMap[cleanDep] !== undefined ? finalMarksMap[cleanDep] : (parseFloat(rawMarksMap[cleanDep]) || 0);
        return sum + val;
      }, 0);
      return total / deps.length;
    }

    case 'best_of': {
      const deps = component.dependencies || [];
      const count = Math.max(1, component.bestOfCount || 1);
      const vals = deps.map((depCode) => {
        const cleanDep = depCode.trim().toUpperCase();
        return finalMarksMap[cleanDep] !== undefined ? finalMarksMap[cleanDep] : (parseFloat(rawMarksMap[cleanDep]) || 0);
      });
      vals.sort((a, b) => b - a);
      const sumBest = vals.slice(0, count).reduce((acc, v) => acc + v, 0);
      if (maxRaw > 0 && finalContribution > 0 && maxRaw !== finalContribution) {
        return (sumBest / maxRaw) * finalContribution;
      }
      return sumBest;
    }

    case 'formula': {
      const combinedVars = { ...rawMarksMap, ...finalMarksMap };
      const res = safeEvaluateFormula(component.formula, combinedVars);
      return finalContribution > 0 ? Math.min(res, finalContribution) : res;
    }

    default:
      return rawObtained;
  }
}

export function calculateStudentMarksResult(studentEntry, template) {
  const components = template.components || [];
  const roundingRule = template.gradingRules?.roundingRule || 'decimal_2';
  const totalExamFinalMarks = template.totalFinalMarks || 100;

  const rawMarksMap = {};
  const statusMap = {};
  const remarksMap = {};

  components.forEach((comp) => {
    const code = comp.code.trim().toUpperCase();
    const itemData = studentEntry.componentMarks?.[code] || studentEntry.componentMarks?.[comp.code] || {};

    if (typeof itemData === 'object' && itemData !== null) {
      const rawVal = itemData.rawMarks !== undefined ? itemData.rawMarks : itemData.raw;
      rawMarksMap[code] = rawVal !== undefined && rawVal !== null && rawVal !== '' ? parseFloat(rawVal) || 0 : 0;
      if (itemData.isAbsent || itemData.status === 'ABSENT') {
        statusMap[code] = 'ABSENT';
      } else if (itemData.isExempted || itemData.status === 'EXEMPTED') {
        statusMap[code] = 'EXEMPTED';
      } else {
        statusMap[code] = (itemData.status || 'PRESENT').toUpperCase();
      }
      remarksMap[code] = itemData.remarks || '';
    } else {
      rawMarksMap[code] = parseFloat(itemData) || 0;
      statusMap[code] = 'PRESENT';
      remarksMap[code] = '';
    }
  });

  const finalMarksMap = {};
  let totalRawMarks = 0;
  let allComponentsPassed = true;
  let isEntirelyAbsent = true;

  const evaluatedCodes = new Set();
  const maxPasses = 5;
  let passCount = 0;

  while (evaluatedCodes.size < components.length && passCount < maxPasses) {
    passCount++;
    for (const comp of components) {
      const code = comp.code.trim().toUpperCase();
      if (evaluatedCodes.has(code)) continue;

      const method = comp.calculationMethod || 'direct';
      const deps = comp.dependencies || [];

      let depsReady = true;
      if (['sum', 'average', 'best_of'].includes(method)) {
        depsReady = deps.every((d) => evaluatedCodes.has(d.trim().toUpperCase()));
      }

      if (depsReady) {
        const compStatus = statusMap[code] || 'PRESENT';
        let computedFinal = 0;

        if (compStatus === 'ABSENT') {
          computedFinal = 0;
        } else if (compStatus === 'EXEMPTED') {
          computedFinal = 0;
        } else {
          isEntirelyAbsent = false;
          computedFinal = calculateComponentFinalMarks(comp, rawMarksMap, finalMarksMap);
          totalRawMarks += rawMarksMap[code];
        }

        finalMarksMap[code] = applyRounding(computedFinal, roundingRule);
        evaluatedCodes.add(code);

        if (comp.minPassMarks && comp.minPassMarks > 0) {
          if (compStatus === 'ABSENT' || finalMarksMap[code] < comp.minPassMarks) {
            allComponentsPassed = false;
          }
        }
      }
    }
  }

  let totalFinalMarks = 0;
  components.forEach((comp) => {
    const code = comp.code.trim().toUpperCase();
    if (comp.includeInTotal !== false) {
      totalFinalMarks += finalMarksMap[code] || 0;
    }
  });

  totalFinalMarks = applyRounding(totalFinalMarks, roundingRule);

  const percentage = totalExamFinalMarks === 0
    ? 0
    : applyRounding((totalFinalMarks / totalExamFinalMarks) * 100, 'decimal_2');

  const minPassPercentage = template.gradingRules?.minPassPercentage || 35;
  const distinctionPercentage = template.gradingRules?.distinctionPercentage || 75;

  const isPass = !isEntirelyAbsent && allComponentsPassed && percentage >= minPassPercentage;
  const isDistinction = isPass && percentage >= distinctionPercentage;

  const gradeBoundaries = template.gradingRules?.gradeBoundaries || [
    { grade: 'A+', minPercentage: 90 },
    { grade: 'A', minPercentage: 80 },
    { grade: 'B+', minPercentage: 70 },
    { grade: 'B', minPercentage: 60 },
    { grade: 'C', minPercentage: 50 },
    { grade: 'D', minPercentage: 35 },
    { grade: 'F', minPercentage: 0 },
  ];

  const sortedBoundaries = [...gradeBoundaries].sort((a, b) => b.minPercentage - a.minPercentage);
  let assignedGrade = 'F';

  if (isEntirelyAbsent) {
    assignedGrade = 'AB';
  } else {
    for (const b of sortedBoundaries) {
      if (percentage >= b.minPercentage) {
        assignedGrade = b.grade;
        break;
      }
    }
  }

  const computedComponentDetails = {};
  components.forEach((comp) => {
    const code = comp.code.trim().toUpperCase();
    computedComponentDetails[code] = {
      code,
      name: comp.name,
      maxRaw: comp.maxRawMarks ?? comp.maxRaw,
      maxRawMarks: comp.maxRawMarks ?? comp.maxRaw,
      finalWeightage: comp.finalWeightage ?? comp.finalMarks,
      finalMarks: finalMarksMap[code] || 0,
      raw: rawMarksMap[code] || 0,
      rawMarks: rawMarksMap[code] || 0,
      final: finalMarksMap[code] || 0,
      isAbsent: statusMap[code] === 'ABSENT',
      isExempted: statusMap[code] === 'EXEMPTED',
      status: statusMap[code] || 'PRESENT',
      remarks: remarksMap[code] || '',
    };
  });

  return {
    studentId: studentEntry.studentId || null,
    studentName: studentEntry.studentName || 'Student',
    admissionNumber: studentEntry.admissionNumber || '',
    rollNumber: studentEntry.rollNumber || 1,
    componentMarks: computedComponentDetails,
    totalRaw: applyRounding(totalRawMarks, roundingRule),
    totalFinal: totalFinalMarks,
    percentage,
    grade: assignedGrade,
    isPass,
    isDistinction,
    isEntirelyAbsent,
    remarks: studentEntry.remarks || '',
  };
}

export function calculateExamStatistics(studentResultsList = []) {
  const totalStudents = studentResultsList.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      appearedCount: 0,
      absentCount: 0,
      passedCount: 0,
      failedCount: 0,
      passPercentage: 0,
      classAverage: 0,
      highestMarks: 0,
      lowestMarks: 0,
      gradeDistribution: {},
    };
  }

  let appearedCount = 0;
  let absentCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  let totalScore = 0;
  let highest = -Infinity;
  let lowest = Infinity;
  const gradeCounts = {};

  studentResultsList.forEach((res) => {
    const grade = res.grade || 'F';
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

    if (res.isEntirelyAbsent) {
      absentCount++;
    } else {
      appearedCount++;
      const score = res.totalFinal || 0;
      totalScore += score;
      if (score > highest) highest = score;
      if (score < lowest) lowest = score;

      if (res.isPass) passedCount++;
      else failedCount++;
    }
  });

  const classAverage = appearedCount > 0 ? applyRounding(totalScore / appearedCount, 'decimal_2') : 0;
  const passPercentage = appearedCount > 0 ? applyRounding((passedCount / appearedCount) * 100, 'decimal_2') : 0;

  return {
    totalStudents,
    appearedCount,
    absentCount,
    passedCount,
    failedCount,
    passPercentage,
    classAverage,
    highestMarks: highest === -Infinity ? 0 : highest,
    lowestMarks: lowest === Infinity ? 0 : lowest,
    gradeDistribution: gradeCounts,
  };
}

/**
 * Grade Lookups from Grade Ref Sheet (AI/NSQF format)
 */
export const getFaGrade = (mark) => {
  const m = Number(mark) || 0;
  if (m >= 45) return 'A+';
  if (m >= 40) return 'A';
  if (m >= 35) return 'B+';
  if (m >= 30) return 'B';
  if (m >= 25) return 'C+';
  if (m >= 18) return 'C';
  return 'NA';
};

export const getSaGrade = (mark) => {
  const m = Number(mark) || 0;
  if (m >= 90) return 'A+';
  if (m >= 80) return 'A';
  if (m >= 70) return 'B+';
  if (m >= 60) return 'B';
  if (m >= 50) return 'C+';
  if (m >= 35) return 'C';
  return 'NA';
};

export const generateDefaultStudents = (count = 40, section = 'A') => {
  return Array.from({ length: count }, (_, i) => {
    const roll = i + 1;
    const isSample = i === 0;
    return {
      studentId: `stu_${section}_${roll}`,
      rollNumber: roll,
      studentName: isSample ? 'Sample (abb / XYZ)' : `Student ${roll}`,
      gender: roll % 2 === 0 ? 'F' : 'M',
      caste: roll % 3 === 0 ? 'OBC' : roll % 4 === 0 ? 'SC/ST' : 'GEN',
      admissionNumber: `ADM-${roll}`,
      componentMarks: {
        FA1_ACT1: { rawMarks: isSample ? 12 : '' },
        FA1_ACT2: { rawMarks: isSample ? 15 : '' },
        FA1_TEST: { rawMarks: isSample ? 12 : '' },
        FA2_ACT1: { rawMarks: isSample ? 15 : '' },
        FA2_ACT2: { rawMarks: isSample ? 5 : '' },
        FA2_TEST: { rawMarks: isSample ? 5 : '' },
        SA1_TH_RAW: { rawMarks: isSample ? 35 : '' },
        SA1_PR_HANDS: { rawMarks: isSample ? 25 : '' },
        SA1_PR_PORT: { rawMarks: isSample ? 10 : '' },
        SA1_PR_VIVA: { rawMarks: isSample ? 10 : '' },
      },
      totalRaw: isSample ? 129 : 0,
      totalFinal: isSample ? 76 : 0,
      percentage: isSample ? 76 : 0,
      grade: isSample ? 'B+' : 'NA',
      isPass: isSample,
    };
  });
};
