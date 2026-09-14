# Pleading Rule Mapping Candidates

## Metadata

- status: CANDIDATE_ONLY
- approvedRules: NONE
- preparedDate: 2026-09-14
- humanGate: REQUIRED
- productionActivation: BLOCKED
- sourceScope: `legal_references/` 內本報告逐項列示之已凍結官方法源

本文件只提出候選 Mapping，不核准 Rule、不修改既有 Rule Profile，也不表示任何書狀已可交付。`REQUIRED_CANDIDATE` 與 `RECOMMENDED_CANDIDATE` 均須經 Human Gate 才能成為正式規則。

## 1. 共通書狀外殼

### 1.1 民事一般書狀

法源：民事訴訟法第116條、第117條及民事訴訟書狀規則。

| 法源 | 官方原文重點 | 候選對應 | 候選等級 | 適用條件 | 狀態 |
|---|---|---|---|---|---|
| §116 I 1 | 當事人姓名及住所或居所；法人等之名稱及所在地 | `parties` | REQUIRED_CANDIDATE | 民事當事人書狀，法律無特別規定時 | CANDIDATE |
| §116 I 2 | 有代理人者之姓名、住所或居所及關係 | `representatives` | REQUIRED_CANDIDATE | 有法定代理人或訴訟代理人時 | CANDIDATE |
| §116 I 3 | 訴訟事件 | `case_reference` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| §116 I 4 | 應為之聲明或陳述 | `statements` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| §116 I 5 | 供證明或釋明用之證據 | `evidence` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| §116 I 6 | 附屬文件及其件數 | `attachments` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| §116 I 7 | 法院 | `court` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| §116 I 8 | 年、月、日 | `date` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| §116 II | 性別、出生年月日、職業、身分證號碼、統一編號、電話等「宜記載」 | `recommended_identifiers` | RECOMMENDED_CANDIDATE | 同上 | CANDIDATE |
| §117 | 當事人或代理人應簽名或蓋章 | `signature` | REQUIRED_CANDIDATE | 同上 | CANDIDATE |
| 書狀規則 §3 | 專供特定事件、A4、中文橫書、可閱讀、原則以電腦製作及指定版面 | `document_format` | REQUIRED_CANDIDATE | 無法定例外或法院同意時 | CANDIDATE |
| 書狀規則 §4 | 證據及文件「宜」編號、編頁，非 A4 文件「宜」黏貼或折疊 | `evidence_format` | RECOMMENDED_CANDIDATE | 有附件時 | CANDIDATE |

共通外殼只能被明確 `caseType + pleadingType` 組合引用，不得單獨成為 production 可交付 profile。

### 1.2 刑事自作書狀外殼

| 法源 | 官方原文重點 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|---|
| 刑訴 §53 | 非公務員自作之文書應記載年月日並簽名；非自作者及不能簽名另有方式 | `date`, `signature`, `signature_method` | REQUIRED_CANDIDATE | CANDIDATE |

刑訴第242條已另行凍結，只確認告訴或告發得以書狀或言詞向檢察官或司法警察官提出。§§53、242仍不足以決定答辯狀或特定犯罪書狀的全部內容；未凍結各該完整程序法與實體法前，相關 production 類別維持 `UNVERIFIED`。

### 1.2.1 刑事告訴共通外殼

| 法源 | 官方原文重點 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|---|
| 刑訴 §242 | 告訴或告發得以書狀或言詞向檢察官或司法警察官為之 | `submission_method`, `receiving_authority` | OPTIONAL | CANDIDATE；不構成完整內容 profile |
| 刑訴 §53 | 日期與簽名 | `date`, `signature` | REQUIRED_CANDIDATE | CANDIDATE |

所有 offense-specific 欄位仍須各罪實體法、告訴權／期間及敏感案件保護法源逐類 Mapping；本外殼不得直接放行。

### 1.3 行政訴訟一般書狀

| 法源 | 官方原文重點 | 候選對應 | 候選等級 | 適用條件 | 狀態 |
|---|---|---|---|---|---|
| 行訴 §57 I 1–9 | 當事人、代理人、聲明、事實及法律陳述、證據、附件、行政法院、日期 | `parties`, `representatives`, `statements`, `facts_and_law`, `evidence`, `attachments`, `court`, `date` | REQUIRED_CANDIDATE | 行政訴訟書狀，法律無特別規定時 | CANDIDATE |
| 行訴 §57 II | 出生年月日、職業、證件字號、統一編號、電話等「宜記載」 | `recommended_identifiers` | RECOMMENDED_CANDIDATE | 同上 | CANDIDATE |
| 行訴 §57 III | 格式、記載方法及效力由司法院另定 | `document_format` | UNVERIFIED | 對應規則全文尚未在本批凍結 | CANDIDATE |

### 1.4 非訟事件一般聲請

| 法源 | 官方原文重點 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|---|
| 非訟 §30 I 1–7 | 聲請人及代理人完整人別、意旨與原因事實、證據、附件、法院、日期 | `applicant`, `representatives`, `request_and_facts`, `evidence`, `attachments`, `court`, `date` | REQUIRED_CANDIDATE | CANDIDATE |
| 非訟 §30 II | 聲請人或代理人應簽名；不能簽名者之代書、蓋章或指印方式 | `signature`, `signature_method` | REQUIRED_CANDIDATE | CANDIDATE |
| 非訟 §30 III | 格式由司法院定之 | `document_format` | UNVERIFIED | CANDIDATE |

非訟第30條將部分身分資料明定為「應載明」，不得套用民訴第116條第二項的 `RECOMMENDED_CANDIDATE`。

## 2. 精確程序類別 Candidate Mapping

### 2.1 民事答辯狀

識別條件：`caseType=civil`, `pleadingType=answer`。法源組合：民訴 §§116、117、266及民事訴訟書狀規則。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §266 II 1 | `answer_facts_and_reasons` | REQUIRED_CANDIDATE | CANDIDATE |
| §266 II 2 準用 I 2 | `evidence`；多數證據全部記載 | REQUIRED_CANDIDATE | CANDIDATE |
| §266 II 2 準用 I 3 | `admit_or_deny_opponent_facts_and_evidence`; 爭執時附理由 | REQUIRED_CANDIDATE | CANDIDATE |
| §266 III | 前述各項分別具體記載 | `structured_specific_entries` | REQUIRED_CANDIDATE | CANDIDATE |
| §266 IV | 所用書證影本、向法院提出並以影本直接通知他造 | `documentary_evidence_copies`, `direct_notice` | REQUIRED_CANDIDATE | CANDIDATE |

### 2.2 民事第二審上訴狀

識別條件：`caseType=civil`, `pleadingType=appeal`, `appealLevel=SECOND`。法源組合：民訴 §§116、117、441及民事訴訟書狀規則。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §441 I | `filing_court=original_first_instance_court` | REQUIRED_CANDIDATE | CANDIDATE |
| §441 I 1 | `parties_and_legal_representatives` | REQUIRED_CANDIDATE | CANDIDATE |
| §441 I 2 | `first_instance_judgment_and_appeal_statement` | REQUIRED_CANDIDATE | CANDIDATE |
| §441 I 3 | `extent_of_dissatisfaction_and_requested_disposition` | REQUIRED_CANDIDATE | CANDIDATE |
| §441 I 4, II 1–2 | `appeal_reasons`, `reasons_to_reverse_or_modify`, `supporting_facts_and_evidence` | REQUIRED_CANDIDATE | CANDIDATE |

### 2.3 民事第三審上訴狀

識別條件：`caseType=civil`, `pleadingType=appeal`, `appealLevel=THIRD`。法源組合目前僅含民訴 §§116、117、470及民事訴訟書狀規則。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §470 I | `filing_court=original_judgment_court` | REQUIRED_CANDIDATE | CANDIDATE |
| §470 II 1 | `violated_law_and_specific_content` | REQUIRED_CANDIDATE | CANDIDATE |
| §470 II 2 | `record_facts_supporting_violation` | REQUIRED_CANDIDATE | CANDIDATE |
| §470 II 3、§469-1 | `principled_importance_reason` | REQUIRED_CANDIDATE | CANDIDATE — 僅適用許可上訴路徑 |
| §470 III | `appellate_interest` | RECOMMENDED_CANDIDATE | CANDIDATE |

§469-1 已補凍結；Human Gate 核准後，法定違背法令與許可上訴維持兩個精確 profile，不得互相替代。

### 2.4 民事抗告狀

識別條件：`caseType=civil`, `pleadingType=interlocutory_appeal`。法源組合：民訴 §§116、117、488及民事訴訟書狀規則。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §488 I | `filing_court=issuing_court_or_presiding_judge_court` | REQUIRED_CANDIDATE | CANDIDATE |
| §488 III | `interlocutory_appeal_reasons` | REQUIRED_CANDIDATE | CANDIDATE |
| §488 II | `oral_filing_exception` | OPTIONAL | CANDIDATE；僅記錄程序例外，不用來判定裁定是否可抗告 |

### 2.5 民事再審之訴

識別條件：`caseType=civil`, `pleadingType=retrial`。法源組合：民訴 §§116、117、501及民事訴訟書狀規則。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §501 I 1–4 | `parties`, `challenged_judgment`, `requested_disposition`, `retrial_reasons_and_time_limit_evidence` | REQUIRED_CANDIDATE | CANDIDATE |
| §501 II | `hearing_preparation`, `final_judgment_copy` | RECOMMENDED_CANDIDATE | CANDIDATE；整句以「宜記載」起首，最終粒度待 Human Gate |

不得由本 Mapping 判斷再審事由成立或計算不變期間。

### 2.6 刑事第二審上訴書狀

識別條件：`caseType=criminal`, `pleadingType=appeal`, `appealLevel=SECOND`。法源組合：刑訴 §§53、350、361。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §350 I | `filing_court=original_trial_court` | REQUIRED_CANDIDATE | CANDIDATE |
| §350 II | `copies_by_number_of_opposing_parties` | REQUIRED_CANDIDATE | CANDIDATE |
| §361 I–II | `appellate_court=competent_high_court`, `specific_appeal_reasons` | REQUIRED_CANDIDATE | CANDIDATE |
| §361 III | `supplemental_reason_procedure` | OPTIONAL | CANDIDATE；不得捏造理由或把補提制度視為已合規 |

### 2.7 刑事第三審上訴書狀

識別條件：`caseType=criminal`, `pleadingType=appeal`, `appealLevel=THIRD`。目前法源組合：刑訴 §§53、350、382。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| §382 I | `appeal_reasons` | REQUIRED_CANDIDATE | CANDIDATE |
| §382 II | 準用 §350 II、§351、§352 | `copies`, `detention_filing_exception`, `clerk_service_duty` | REQUIRED_CANDIDATE（繕本）／OPTIONAL 或非 Generator 義務（其餘） | CANDIDATE |

§351、§352 已補凍結；Human Gate 已決定理由缺失一律 blocking。刑事格式 profile 尚未完成官方凍結，production 仍不得放行。

### 2.8 行政訴訟上訴狀與答辯狀

| 類別 | 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|---|
| 上訴狀 | 行訴 §244 I 1–4, II 1–2, III | `parties`, `challenged_judgment`, `extent_and_requested_disposition`, `appeal_reasons`, `violated_law`, `supporting_record_facts`, `necessary_evidence` | REQUIRED_CANDIDATE | CANDIDATE；與 §57 共通外殼組合 |
| 上訴狀 | 行訴 §244 IV | `detention_filing_exception` | OPTIONAL | CANDIDATE；僅於監所提出時適用 |
| 答辯狀 | 行訴 §247 II | `response_deadline_context` | OPTIONAL | CANDIDATE；條文為「得」且只明定提出期間 |
| 答辯狀內容 | 行訴 §57 | 一般行政書狀欄位 | UNVERIFIED | CANDIDATE；§247 未提供答辯特定內容，禁止自行增列 REQUIRED |

行政上訴應使用精確 `caseType=administrative_litigation`；舊 API 的 `administrative` 僅能由明示 adapter 轉換。

### 2.9 家事事件

| 類別 | 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|---|
| 家事訴訟 | 家事事件法 §51、家事事件書狀規則 §4 | 依明確家事訴訟 subtype 準用對應民事規則，並專供特定／合併事件或案號 | UNVERIFIED | CANDIDATE；不得涵蓋家事非訟 |
| 家事非訟 | 家事事件書狀規則 §§5–7 | A4、中文橫書、可閱讀、原則電腦製作；格式不符之補正及效果 | REQUIRED_CANDIDATE | CANDIDATE；仍須個別事件法源 |
| 家事非訟建議格式 | 家事事件書狀規則 §§5 IV、6 | 邊界、字級、行距、頁碼、目錄、雙面列印及附件編排 | RECOMMENDED_CANDIDATE | CANDIDATE |

Human Gate 已決定採現行司法院 2026-03-20 修正版：家事訴訟準用民事訴訟書狀規則，家事非訟依第5條至第7條，兩者分離；個別事件內容法源未齊前，全部家事 production profile 仍維持 blocked。

### 2.10 強制執行聲請

識別條件：`caseType=civil_enforcement`, `pleadingType=application`，並須有明確 `enforcementTitleType`。

| 法源 | 候選對應 | 候選等級 | 狀態 |
|---|---|---|---|
| 強執 §5 I 1–2 | `parties_and_legal_representatives`, `right_to_be_realized` | REQUIRED_CANDIDATE | CANDIDATE |
| 強執 §5 II | `enforcement_target`, `requested_enforcement_action`, `other_statutory_matters` | RECOMMENDED_CANDIDATE | CANDIDATE |
| 強執 §6 I 1–6 | `enforcement_title_documents` | REQUIRED_CANDIDATE | CANDIDATE；依執行名義類型擇一分流，不得要求六款同時具備 |
| 強執 §6 II | 法院調卷例外 | OPTIONAL | CANDIDATE；不得用來捏造已提出文件 |

此共通外殼不足以放行薪資扣押、銀行／不動產執行或假扣押等特定類別。

## 3. Production 類別負向清單

下列類別在本批 Candidate Mapping 後仍不得啟用；命中時應 fail-closed，直到各自具備完整法源、精確 discriminator、核准 Rule Profile、canonical pipeline 及 P9 Final Gate：

- 五種 generic templates：`JUDICIAL_CIVIL_TEMPLATE`、`JUDICIAL_CRIMINAL_TEMPLATE`、`JUDICIAL_ADMIN_TEMPLATE`、`JUDICIAL_FAMILY_TEMPLATE`、`JUDICIAL_EXECUTION_TEMPLATE`。
- 刑事告訴群及 offense aliases：現有 §§53、242 不足以提供完整告訴內容、告訴權／期間及個別犯罪構成要件；已凍結的刑法 §221 與性侵害犯罪防治法 §§12、15 亦不足以涵蓋全部 offense aliases。
- `DOMESTIC_VIOLENCE_PROTECTION_ORDER`、`CIVIL_TORT_SEXUAL_ASSAULT`、`CIVIL_PET_DISPUTE`、`UNIVERSAL_AI_PLEADING`。
- `WAIVER_OF_INHERITANCE`、`GUARDIANSHIP_PETITION`、`ASSISTANCE_PETITION`、`PROMISSORY_NOTE_RULING`。
- `EXECUTION_SALARY_ATTACHMENT`、`EXECUTION_BANK_REAL_ESTATE`、`PROVISIONAL_ATTACHMENT`。
- 刑事／行政答辯：本批法源未列特定答辯內容。
- 刑事第三審上訴因格式 profile 未凍結而維持 blocked；所有家事類別因個別事件內容法源未齊而維持 blocked。
- 刑事補償、少年事件：本批沒有完整官方法源集合。

既有已核准 canonical config 不因本文件自動擴張 category alias、case type 或 pleading type。

## 4. Human Gate 決策清單

1. 是否核准民事答辯、民事第二審上訴、民事抗告、民事再審、刑事第二審上訴、行政上訴、非訟一般聲請及強制執行一般聲請的逐項 Candidate Mapping。
2. 是否採現行官方家事事件書狀規則修正 SDD，並分離 `family_litigation` 與 `family_non_contentious`。
3. 民訴 §501 II 整句「宜記載……並添具……」是否全部維持 `RECOMMENDED`。
4. 刑事第二、三審上訴如缺具體理由，Generator／Final Gate 是否一律列為 blocking，而不輸出法律容許日後補提但當下不完整的文件。
5. 是否先凍結民訴 §469-1、刑訴 §§351、352，以及行政／非訟格式規則後，再審第三審與格式 Mapping。
6. 是否維持 Production 負向清單全部 422，僅逐類核准後開放。

## 5. 審查結論

- 法源原文驗證與 Mapping 核准是兩件事；本批法源檔可為 `VERIFIED`，但所有 Mapping 均為 `CANDIDATE_ONLY`。
- 共通外殼不是可交付書狀。缺少精確程序類別、審級、執行名義類型或個別事件法源時，必須 fail-closed。
- 未建立或修改任何正式 Rule Profile、Generator、Compliance Engine、Final Gate 或 production route。
- legacy `formatChecker.ts` 的 production caller 已完成遷移，並於 2026-09-14 另經 Human Gate 核准後移除。

## 6. Human Gate Decision (2026-09-14)

- 本文件第1至第4節 Candidate Mapping 已由 Human Gate 核准，可據以建立正式 Rule Profile。
- 家事採司法院 2026-03-20 現行家事事件書狀規則，並分離家事訴訟與家事非訟；個別家事事件內容法源未齊前，production 仍維持 422。
- 民事訴訟法第501條第2項全部維持 `RECOMMENDED`。
- 刑事第二、三審上訴理由缺失一律 `BLOCKED`。
- 已核准補凍結民事訴訟法第469條之1與刑事訴訟法第351條、第352條。
- Production 負向清單維持 422；本決策不授權未具完整格式與內容法源的類別進入 READY。
- Render 維持免費 Web；未建立付費資料庫。未提供免費外部 PostgreSQL credentials 前，durable audit deployment 維持 `BLOCKED`。

## Gate Status

PHASE STATUS: CANDIDATE_MAPPING_COMPLETED

ALL MAPPINGS: CANDIDATE ONLY

APPROVED RULES CREATED: 0

NEXT IMPLEMENTATION: BLOCKED

HUMAN REVIEW REQUIRED: YES

STOP.

WAITING FOR HUMAN APPROVAL.
