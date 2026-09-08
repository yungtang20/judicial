// @vitest-environment node
import { describe, it, expect } from "vitest";
import { AuditLogService } from "./auditLog.js";
import { PrivacyValidator } from "../../src/domain/workflow/verification.js";
import { handleAgentChat } from "./agentChat.js";

describe("PII De-identification & Audit Log Privacy Adversarial Tests (Phase C)", () => {
  describe("AuditLogService Deep Sanitization (Array & Nested Metadata)", () => {
    it("sanitizes PII inside arrays and deeply nested metadata objects", () => {
      const testTenant = `tenant_pii_${Date.now()}`;
      AuditLogService.log({
        requestId: "req_pii_test",
        tenantId: testTenant,
        userId: "user_pii_1",
        action: "TEST_PII_LOGGING",
        resource: "/api/test",
        status: "SUCCESS",
        statusCode: 200,
        durationMs: 10,
        ip: "127.0.0.1",
        metadata: {
          directText: "我的身分證是 A123456789",
          arrayData: [
            "聯絡手機 0912345678",
            {
              innerEmail: "victim@lawfirm.com.tw",
              innerId: "B212345678"
            }
          ]
        }
      });

      const result = AuditLogService.getLogsByTenant(testTenant);
      expect(result.logs.length).toBeGreaterThan(0);
      const log = result.logs[0];

      // 檢查 metadata 內的敏感資訊是否全數被去識別化
      const metaString = JSON.stringify(log.metadata);
      expect(metaString).not.toContain("A123456789");
      expect(metaString).not.toContain("0912345678");
      expect(metaString).not.toContain("victim@lawfirm.com.tw");
      expect(metaString).not.toContain("B212345678");

      // 確認遮蔽標記存在
      expect(metaString).toContain("*****");
    });
  });

  describe("PrivacyValidator Needs-Review Trigger on Sensitive Content", () => {
    const validator = new PrivacyValidator();

    it("fails when high-risk National ID or Mobile is present", async () => {
      const check = await validator.validate("原告身分證字號 A123456789 請求損害賠償。");
      expect(check.status).toBe("FAIL");
      expect(check.message).toContain("未脫敏");
    });

    it("triggers NEEDS_REVIEW when secondary sensitive data (Email, Address, Landline) is present", async () => {
      const emailCheck = await validator.validate("聯絡方式請寄至 lawyer.tan@judicial.gov.tw 辦理。");
      expect(emailCheck.status).toBe("NEEDS_REVIEW");
      expect(emailCheck.message).toContain("待審查");

      const addressCheck = await validator.validate("送達處所為 台北市中正區重慶南路一段124號。");
      expect(addressCheck.status).toBe("NEEDS_REVIEW");
      expect(addressCheck.message).toContain("待審查");
    });

    it("passes when completely free of PII and sensitive contact details", async () => {
      const cleanCheck = await validator.validate("依民法第 184 條第 1 項前段規定，因故意或過失不法侵害他人之權利者，負損害賠償責任。");
      expect(cleanCheck.status).toBe("PASS");
    });
  });
});
