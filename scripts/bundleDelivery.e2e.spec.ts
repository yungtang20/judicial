import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fingerprintReviewPayload } from '../src/lib/reviewer/pleadingReviewer';

const documentText = '民事起訴狀測試文件。\n訴之聲明：請判被告給付新臺幣100,000元。';

type ToolboxResponse = Record<string, unknown>;

async function createAuthorizedResponse(document: string): Promise<ToolboxResponse> {
  return {
    toolCategory: 'CIVIL_COMPLAINT_GENERAL',
    title: '民事起訴狀（E2E）',
    documentText: document,
    complianceChecklist: [],
    antiGhostVerification: {
      // 人工覆核閘門以 status 為唯一權威依據：缺少 status 會被視為「尚未查核」並擋下交付。
      status: 'VERIFIED',
      totalCitationsChecked: 0,
      ghostCitationsFound: 0,
      verifiedCitations: []
    },
    pleadingDeliveryAuthorization: {
      finalGateStatus: 'READY',
      exportPolicy: 'READY_ONLY',
      evaluatorVersion: 'e2e-1.0',
      gateInputFingerprint: 'a'.repeat(64),
      documentFingerprint: await fingerprintReviewPayload(documentText),
      caseInputId: 'case-e2e',
      draftId: 'draft-e2e',
      ruleProfileId: 'civil',
      ruleProfileVersion: '1.0',
      authorizedActions: ['RETURN', 'COPY', 'DOWNLOAD_TEXT', 'DOWNLOAD_WORD', 'PRINT']
    }
  };
}

test('blocks tampered P9 content before download and allows the authorized TXT path', async ({ page }) => {
  let responseDocument = documentText;

  // 必須比照 /api/toolbox/verify-citations 的真實回應格式：
  // 外層是 { antiGhostVerification: { status, ... } }，缺 status 會讓交付閘門直接擋下。
  await page.route('**/api/toolbox/verify-citations', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      antiGhostVerification: {
        status: 'VERIFIED',
        totalCitationsChecked: 0,
        ghostCitationsFound: 0,
        verifiedCitations: []
      }
    })
  }));
  await page.route('**/api/toolbox/generate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await createAuthorizedResponse(responseDocument))
    });
  });
  await page.route('**/api/official-templates', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      verifiedOn: '2026-09-25',
      totalTemplates: 1,
      categories: [{
        name: '民事',
        total: 1,
        readyForMerge: 0,
        needsFieldMapping: 1,
        downloaded: 0,
        sourceOnly: 0,
        sourceLinks: 1
      }]
    })
  }));

  await page.goto('/');
  await page.getByRole('button', { name: /書狀與法律文件製作/ }).click();
  await page.getByRole('button', { name: /司法院官方範本/ }).click();
  await expect(page.getByRole('heading', { name: '司法院官方書狀範本' })).toBeVisible();
  await expect(page.getByRole('button', { name: '一鍵生成專業法律書狀' })).toHaveCount(0);
  await page.getByRole('button', { name: /討債/ }).click();
  await page.getByRole('button', { name: /民事起訴狀線上產生器/ }).click();
  await page.getByRole('button', { name: '一鍵生成專業法律書狀' }).click();
  await expect(page.getByText('產製結果')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'TXT' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!, 'utf8')).toBe(documentText);

  responseDocument = `${documentText}\n未授權修改`;
  await page.getByRole('button', { name: '一鍵生成專業法律書狀' }).click();
  await expect(page.getByRole('alert')).toContainText('法院書狀交付已封鎖');
  await expect(page.getByRole('button', { name: 'TXT' })).toHaveCount(0);
});
