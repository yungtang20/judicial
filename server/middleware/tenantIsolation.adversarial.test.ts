// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "node:http";
import { createExpressApp } from "../index.js";
import { createSignedToken } from "./auth.js";
import { defaultSdlcRepository } from "../../src/domain/workflow/repository.js";

describe("Tenant Isolation Adversarial Tests (Phase A)", () => {
  const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-key-32-chars-minimum!!";
  let server: http.Server;
  let baseUrl: string;

  const tokenTenantA = createSignedToken(
    { sub: "user-a", tenantId: "tenant-alpha", role: "lawyer" }
  );

  const tokenTenantB = createSignedToken(
    { sub: "user-b", tenantId: "tenant-beta", role: "lawyer" }
  );

  const tokenAdmin = createSignedToken(
    { sub: "admin-user", tenantId: "system-admin-tenant", role: "admin" }
  );

  beforeAll(async () => {
    const app = createExpressApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    defaultSdlcRepository.clear();
  });

  describe("Cross-Tenant SDLC Access Control", () => {
    it("Tenant B cannot read a project created by Tenant A", async () => {
      // 1. Tenant A 建立專案
      const createRes = await fetch(`${baseUrl}/api/sdlc/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenTenantA}`
        },
        body: JSON.stringify({
          projectId: "project-alpha-secure",
          title: "Tenant A 機密訴訟案件"
        })
      });

      expect(createRes.status).toBe(200);

      // 2. Tenant B 嘗試讀取 Tenant A 的專案
      const readRes = await fetch(`${baseUrl}/api/sdlc/project/project-alpha-secure`, {
        headers: {
          Authorization: `Bearer ${tokenTenantB}`
        }
      });

      // 必須被 403 阻擋，拒絕跨租戶洩漏
      expect(readRes.status).toBe(403);
      const readBody = await readRes.json();
      expect(readBody.code).toBe("PERMISSION_DENIED");
      expect(readBody.error).toContain("禁止跨租戶存取");
    });

    it("Tenant B cannot execute a stage or tamper with Tenant A's project", async () => {
      // 1. Tenant A 建立專案
      await fetch(`${baseUrl}/api/sdlc/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenTenantA}`
        },
        body: JSON.stringify({
          projectId: "project-alpha-stage",
          title: "Tenant A 訴訟工作流"
        })
      });

      // 2. Tenant B 試圖執行 Stage
      const stageRes = await fetch(`${baseUrl}/api/sdlc/execute-stage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenTenantB}`
        },
        body: JSON.stringify({
          projectId: "project-alpha-stage",
          stageId: "01_plan",
          humanInput: "惡意覆蓋訴訟意圖"
        })
      });

      expect(stageRes.status).toBe(403);
      const stageBody = await stageRes.json();
      expect(stageBody.code).toBe("PERMISSION_DENIED");
      expect(stageBody.error).toContain("禁止跨租戶存取");
    });

    it("Tenant B cannot advance a decision gate for Tenant A's project", async () => {
      // 1. Tenant A 建立專案
      await fetch(`${baseUrl}/api/sdlc/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenTenantA}`
        },
        body: JSON.stringify({
          projectId: "project-alpha-gate",
          title: "Tenant A 審批專案"
        })
      });

      // 2. Tenant B 試圖簽核 Gate
      const gateRes = await fetch(`${baseUrl}/api/sdlc/advance-gate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenTenantB}`
        },
        body: JSON.stringify({
          projectId: "project-alpha-gate",
          stageId: "01_plan",
          decisionNote: "惡意未經授權審批"
        })
      });

      expect(gateRes.status).toBe(403);
      const gateBody = await gateRes.json();
      expect(gateBody.code).toBe("PERMISSION_DENIED");
      expect(gateBody.error).toContain("禁止跨租戶存取");
    });

    it("System Admin can access cross-tenant project for global auditing", async () => {
      // 1. Tenant A 建立專案
      await fetch(`${baseUrl}/api/sdlc/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenTenantA}`
        },
        body: JSON.stringify({
          projectId: "project-alpha-admin-audit",
          title: "Tenant A 案件稽核"
        })
      });

      // 2. 系統管理員可審計此專案
      const adminRes = await fetch(`${baseUrl}/api/sdlc/project/project-alpha-admin-audit`, {
        headers: {
          Authorization: `Bearer ${tokenAdmin}`
        }
      });

      expect(adminRes.status).toBe(200);
      const adminBody = await adminRes.json();
      expect(adminBody.project.projectId).toBe("project-alpha-admin-audit");
    });
  });

  describe("Comprehensive Cross-Tenant Access Matrix (3 Resource Types)", () => {
    // -------------------------------------------------------------
    // Resource Type 1: Project (projectId)
    // -------------------------------------------------------------
    describe("Resource Type 1: Project (projectId)", () => {
      const pId = "project-isolation-crud-1";

      beforeEach(async () => {
        // Tenant A 建立專案
        const res = await fetch(`${baseUrl}/api/sdlc/project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantA}`
          },
          body: JSON.stringify({
            projectId: pId,
            title: "Tenant A 獨占專案",
            legalDomain: "CIVIL"
          })
        });
        expect(res.status).toBe(200);
      });

      it("Tenant B cannot READ Tenant A's project (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/sdlc/project/${pId}`, {
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");
      });

      it("Tenant B cannot MODIFY Tenant A's project (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/sdlc/project/${pId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantB}`
          },
          body: JSON.stringify({
            title: "惡意篡改標題"
          })
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");
      });

      it("Tenant B cannot DELETE Tenant A's project (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/sdlc/project/${pId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");

        // 確認專案仍然完好存在於 Tenant A
        const verifyRes = await fetch(`${baseUrl}/api/sdlc/project/${pId}`, {
          headers: { Authorization: `Bearer ${tokenTenantA}` }
        });
        expect(verifyRes.status).toBe(200);
      });
    });

    // -------------------------------------------------------------
    // Resource Type 2: Artifact / Document (artifactId)
    // -------------------------------------------------------------
    describe("Resource Type 2: Artifact / Document (artifactId)", () => {
      const pId = "project-isolation-doc-2";
      let artifactId: string;

      beforeEach(async () => {
        // Tenant A 建立專案並生成工件
        await fetch(`${baseUrl}/api/sdlc/project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantA}`
          },
          body: JSON.stringify({
            projectId: pId,
            title: "Tenant A 書狀專案"
          })
        });

        // 執行 01_plan 階段以生成工件
        const stageRes = await fetch(`${baseUrl}/api/sdlc/execute-stage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantA}`
          },
          body: JSON.stringify({
            projectId: pId,
            stageId: "01_plan",
            humanInput: "主張買賣契約價金返還新台幣 500 萬元"
          })
        });

        expect(stageRes.status).toBe(200);
        const stageBody = await stageRes.json();
        const artifacts = stageBody.project.artifacts["01_plan"];
        expect(artifacts.length).toBeGreaterThan(0);
        artifactId = artifacts[0].id;
      });

      it("Tenant B cannot READ Tenant A's document / artifact (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/sdlc/project/${pId}/artifact/${artifactId}`, {
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");
      });

      it("Tenant B cannot MODIFY Tenant A's document / artifact (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/sdlc/project/${pId}/artifact/${artifactId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantB}`
          },
          body: JSON.stringify({
            content: "惡意竄改之書狀內文"
          })
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");
      });

      it("Tenant B cannot DELETE Tenant A's document / artifact (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/sdlc/project/${pId}/artifact/${artifactId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");

        // 確認工件仍然完好存在於 Tenant A
        const verifyRes = await fetch(`${baseUrl}/api/sdlc/project/${pId}/artifact/${artifactId}`, {
          headers: { Authorization: `Bearer ${tokenTenantA}` }
        });
        expect(verifyRes.status).toBe(200);
      });
    });

    // -------------------------------------------------------------
    // Resource Type 3: AuditLog (auditId)
    // -------------------------------------------------------------
    describe("Resource Type 3: AuditLog (auditId)", () => {
      let auditLogId: string;

      beforeEach(async () => {
        // Tenant A 發動一次合法請求，觸發審計日誌生成
        await fetch(`${baseUrl}/api/sdlc/project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantA}`
          },
          body: JSON.stringify({
            projectId: `project-audit-${Date.now()}`,
            title: "Tenant A 審計事件生成專案"
          })
        });

        // Tenant A 查詢自身日誌以取得 auditId
        const logsRes = await fetch(`${baseUrl}/api/audit/logs`, {
          headers: { Authorization: `Bearer ${tokenTenantA}` }
        });
        expect(logsRes.status).toBe(200);
        const logsBody = await logsRes.json();
        expect(logsBody.logs.length).toBeGreaterThan(0);
        auditLogId = logsBody.logs[0].id;
      });

      it("Tenant B cannot query Tenant A's audit logs via query params (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/audit/logs?tenantId=tenant-alpha`, {
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");
      });

      it("Tenant B cannot READ Tenant A's single audit log entry (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/audit/logs/${auditLogId}`, {
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("PERMISSION_DENIED");
      });

      it("Tenant B cannot MODIFY Tenant A's audit log entry (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/audit/logs/${auditLogId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantB}`
          },
          body: JSON.stringify({
            action: "TAMPERED_ACTION"
          })
        });
        expect(res.status).toBe(403);
      });

      it("Tenant B cannot DELETE Tenant A's audit log entry (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/audit/logs/${auditLogId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenTenantB}` }
        });
        expect(res.status).toBe(403);
      });
    });

    // -------------------------------------------------------------
    // Mass Assignment & Spoofing Defense
    // -------------------------------------------------------------
    describe("Mass Assignment & Tenant Spoofing Defense", () => {
      it("Client cannot spoof tenantId or ownerId via request body in project creation", async () => {
        const pId = `spoof-test-${Date.now()}`;
        const res = await fetch(`${baseUrl}/api/sdlc/project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantB}`
          },
          body: JSON.stringify({
            projectId: pId,
            title: "企圖偽造所有權專案",
            tenantId: "tenant-alpha", // 企圖偽造為 Tenant A
            ownerId: "victim-user-a",
            role: "admin",
            isSystemAdmin: true
          })
        });

        expect(res.status).toBe(200);
        const body = await res.json();

        // 伺服器端必須強制鎖定為 Token 內簽署的真實 tenantId 與 ownerId，忽視 body 內的偽造欄位
        expect(body.project.tenantId).toBe("tenant-beta");
        expect(body.project.ownerId).toBe("user-b");

        // Tenant A 不得存取此專案 (因為它屬於 Tenant B)
        const tenantACheck = await fetch(`${baseUrl}/api/sdlc/project/${pId}`, {
          headers: { Authorization: `Bearer ${tokenTenantA}` }
        });
        expect(tenantACheck.status).toBe(403);
      });

      it("Non-admin client cannot spoof tenantId via X-Tenant-Id header", async () => {
        const pId = `header-spoof-test-${Date.now()}`;
        const res = await fetch(`${baseUrl}/api/sdlc/project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenTenantB}`,
            "X-Tenant-Id": "tenant-alpha" // 企圖透過 Header 偽造
          },
          body: JSON.stringify({
            projectId: pId,
            title: "Header 偽造測試"
          })
        });

        expect(res.status).toBe(200);
        const body = await res.json();

        // 非管理員身分下，伺服器一律忽略 X-Tenant-Id 標頭
        expect(body.project.tenantId).toBe("tenant-beta");
      });
    });
  });
});
