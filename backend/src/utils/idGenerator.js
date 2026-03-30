const { customAlphabet } = require('nanoid');

// Create custom alphabet for readable IDs
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6);

/**
 * Generate a human-readable ID with prefix and year
 * Format: PREFIX-YYYY-XXXXXX
 */
function generateId(prefix) {
  const year = new Date().getFullYear();
  const random = nanoid();
  return `${prefix}-${year}-${random}`;
}

// Entity-specific ID generators
const generators = {
  model: () => generateId('MDL'),
  validation: () => generateId('VAL'),
  finding: () => generateId('FND'),
  risk: () => generateId('RISK'),
  document: () => generateId('DOC'),
  workflow: () => generateId('WF'),
  task: () => generateId('TSK'),
  review: () => generateId('REV'),
  attestation: () => generateId('ATT'),
  report: () => generateId('RPT'),
  requirement: () => generateId('REG'),
  user: () => generateId('USR'),
};

module.exports = {
  generateId,
  generateModelId: generators.model,
  generateValidationId: generators.validation,
  generateFindingId: generators.finding,
  generateRiskAssessmentId: generators.risk,
  generateDocumentId: generators.document,
  generateWorkflowId: generators.workflow,
  generateTaskId: generators.task,
  generateReviewId: generators.review,
  generateAttestationId: generators.attestation,
  generateReportId: generators.report,
  generateRequirementId: generators.requirement,
};
