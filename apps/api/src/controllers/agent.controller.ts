import type { Request, Response } from "express";
import { agentService, parseAgentCommand } from "../agent/agent.service";
import { requireUserId } from "../utils/requireUserId";

export const agentController = {
  async getState(req: Request, res: Response): Promise<void> {
    const agent = await agentService.getState(requireUserId(req));
    res.status(200).json({ success: true, data: { agent } });
  },

  async command(req: Request<{ command: string }>, res: Response): Promise<void> {
    const status = parseAgentCommand(req.params.command);
    const agent = await agentService.setStatus(requireUserId(req), status);
    res.status(200).json({ success: true, data: { agent } });
  },

  async listLogs(req: Request, res: Response): Promise<void> {
    const logs = await agentService.listLogs(requireUserId(req));
    res.status(200).json({ success: true, data: { logs } });
  },
};
