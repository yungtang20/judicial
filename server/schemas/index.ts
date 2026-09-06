import { Request, Response, NextFunction } from "express";
import { SchemaRules, SchemaValidator } from "../types/api.js";

/**
 * 宣告式 Express Schema 驗證中介層產生器
 */
export function validateBody<T extends Record<string, unknown>>(schema: SchemaRules<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { valid, errors, sanitizedData } = SchemaValidator.validate(req.body, schema);

    if (!valid) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "請求參數檢核失敗，請確認欄位格式與長度",
        requestId: req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`,
        details: errors
      });
    }

    req.body = sanitizedData;
    next();
  };
}

/**
 * 常用 API 請求驗證規則集合
 */

// 判決分析請求規則
export const AnalyzeJudgmentSchema: SchemaRules<{
  judgmentText: string;
  targetCourt?: string;
  disputeType?: string;
}> = {
  judgmentText: {
    required: true,
    type: "string",
    minLength: 10,
    maxLength: 50000
  },
  targetCourt: {
    type: "string",
    maxLength: 50
  },
  disputeType: {
    type: "string",
    maxLength: 50
  }
};

// 書狀工具箱產製請求規則
export const ToolboxGenerateSchema: SchemaRules<{
  toolId: string;
  parameters: Record<string, unknown>;
  templateId?: string;
}> = {
  toolId: {
    required: true,
    type: "string",
    minLength: 3,
    maxLength: 100
  },
  parameters: {
    required: true,
    type: "object"
  }
};

// 法律程序三段論法請求規則
export const SyllogismSchema: SchemaRules<{
  claim: string;
  facts: string;
  domain?: string;
}> = {
  claim: {
    required: true,
    type: "string",
    minLength: 2,
    maxLength: 500
  },
  facts: {
    required: true,
    type: "string",
    minLength: 5,
    maxLength: 10000
  },
  domain: {
    type: "string",
    maxLength: 50
  }
};
