/**
 * SDLC Project State Repository Pattern
 * 抽象化資料持久層，消除對裸 Map 之直接依賴，支援測試與未來正式 DB 擴展
 */

import { SdlcProjectState } from '../sdlc/types';

export interface SdlcProjectRepository {
  get(projectId: string): Promise<SdlcProjectState | null>;
  save(project: SdlcProjectState): Promise<void>;
  create(project: SdlcProjectState): Promise<SdlcProjectState>;
  delete(projectId: string): Promise<boolean>;
  list(): Promise<SdlcProjectState[]>;
}

export class MemorySdlcProjectRepository implements SdlcProjectRepository {
  private store = new Map<string, SdlcProjectState>();

  public async get(projectId: string): Promise<SdlcProjectState | null> {
    const project = this.store.get(projectId);
    if (!project) return null;
    // 回傳深度拷貝以防止非預期的直接修改
    return JSON.parse(JSON.stringify(project));
  }

  public async save(project: SdlcProjectState): Promise<void> {
    this.store.set(project.projectId, JSON.parse(JSON.stringify(project)));
  }

  public async create(project: SdlcProjectState): Promise<SdlcProjectState> {
    this.store.set(project.projectId, JSON.parse(JSON.stringify(project)));
    return JSON.parse(JSON.stringify(project));
  }

  public async delete(projectId: string): Promise<boolean> {
    return this.store.delete(projectId);
  }

  public async list(): Promise<SdlcProjectState[]> {
    return Array.from(this.store.values()).map(p => JSON.parse(JSON.stringify(p)));
  }

  public clear(): void {
    this.store.clear();
  }
}

export const defaultSdlcRepository = new MemorySdlcProjectRepository();
