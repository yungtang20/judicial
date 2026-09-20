import { describe, it, expect } from 'vitest';
import { classifyJudgment } from './classifier';

describe('classifyJudgment', () => {
  it('should classify basic civil case', () => {
    const result = classifyJudgment('本院民事庭判決如下：被告應給付原告新台幣100萬元。');
    expect(result.caseType).toBe('civil');
  });

  it('should classify basic criminal case', () => {
    const result = classifyJudgment('本院刑事庭判決如下：被告犯竊盜罪，處有期徒刑6月。');
    expect(result.caseType).toBe('criminal');
  });

  it('should classify administrative case', () => {
    const result = classifyJudgment('最高行政法院判決如下：原判決廢棄。');
    expect(result.caseType).toBe('administrative');
  });

  it('should classify criminal compensation case', () => {
    const result = classifyJudgment('司法院刑事補償法庭決定書');
    expect(result.caseType).toBe('criminal_compensation');
  });

  it('should classify 附帶民事訴訟 (incidental civil suit) correctly', () => {
    const result = classifyJudgment('刑事附帶民事訴訟判決 112年度附民字第100號');
    expect(result.caseType).toBe('incidental_civil');
  });

  it('should classify 勞動調解 (labor mediation) correctly', () => {
    const result = classifyJudgment('勞動調解不成立轉訴訟 112年度勞訴字第10號');
    expect(result.caseType).toBe('labor');
  });
  
  it('should classify 刑事再審 (criminal retrial) correctly', () => {
    const result = classifyJudgment('刑事聲請再審裁定');
    expect(result.caseType).toBe('criminal_retrial');
  });
  
  it('should classify 民事再審 (civil retrial) correctly', () => {
    const result = classifyJudgment('民事再審之訴');
    expect(result.caseType).toBe('civil_retrial');
  });
});
