export function classifyJudgment(text: string) {
  let caseType = 'civil';
  let appealEligibility = 'ALLOWED';
  let caseNo = '';

  const isCriminalComp = /刑事補償|刑補/i.test(text);
  const isAdmin = /行政訴訟|高行|簡行/i.test(text);
  const isIncidentalCivil = /附帶民事訴訟|附民/i.test(text);
  const isLabor = /勞動調解|勞動/i.test(text);
  const isRetrial = /再審/i.test(text);
  const isCriminal = !isCriminalComp && /刑事|公訴|簡易判決|刑法|刑事訴訟法/i.test(text);

  if (isCriminalComp) {
    caseType = 'criminal_compensation';
  } else if (isAdmin) {
    caseType = 'administrative';
  } else if (isIncidentalCivil) {
    caseType = 'incidental_civil';
  } else if (isLabor) {
    caseType = 'labor';
  } else if (isCriminal && isRetrial) {
    caseType = 'criminal_retrial';
  } else if (!isCriminal && isRetrial) {
    caseType = 'civil_retrial';
  } else if (isCriminal) {
    caseType = 'criminal';
  } else {
    caseType = 'civil';
  }

  const caseNoMatch = text.match(/\d+年度?.*字第?\d+號/);
  if (caseNoMatch) {
    caseNo = caseNoMatch[0];
  }

  // Appeal eligibility logic based on case type
  if (caseType === 'criminal_compensation') {
    appealEligibility = 'RESTRICTED';
  }

  return {
    caseType,
    appealEligibility,
    caseNo
  };
}
