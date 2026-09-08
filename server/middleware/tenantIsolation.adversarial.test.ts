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
});
