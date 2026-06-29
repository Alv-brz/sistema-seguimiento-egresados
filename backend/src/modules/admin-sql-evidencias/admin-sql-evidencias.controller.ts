import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  getRolesEvidence,
  getSqlEvidenceOverview,
  recentAuditRows,
  runAuditEvidence,
  runFunction,
  runProcedure,
  runSignalTest,
  runView,
} from "./admin-sql-evidencias.service.js";

export const adminSqlEvidenciasController = {
  overview: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await getSqlEvidenceOverview() });
  }),

  view: asyncHandler(async (req: Request, res: Response) => {
    res.json({ ok: true, data: await runView(req.params.name) });
  }),

  functionRun: asyncHandler(async (req: Request, res: Response) => {
    res.json({ ok: true, data: await runFunction(req.params.name) });
  }),

  procedureRun: asyncHandler(async (req: Request, res: Response) => {
    res.json({ ok: true, data: await runProcedure(req.params.name) });
  }),

  auditEvidence: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await runAuditEvidence() });
  }),

  auditRecent: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await recentAuditRows() });
  }),

  signalTest: asyncHandler(async (req: Request, res: Response) => {
    res.json({ ok: true, data: await runSignalTest(req.params.name) });
  }),

  roles: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await getRolesEvidence() });
  }),
};
