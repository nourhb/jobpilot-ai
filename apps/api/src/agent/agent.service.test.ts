import { describe, expect, it } from "vitest";
import { AppError } from "../middleware/errorHandler";
import { parseAgentCommand } from "./agent.service";

describe("parseAgentCommand", () => {
  it("maps start/pause/stop to AgentStatus", () => {
    expect(parseAgentCommand("start")).toBe("RUNNING");
    expect(parseAgentCommand("pause")).toBe("PAUSED");
    expect(parseAgentCommand("stop")).toBe("STOPPED");
  });

  it("rejects an unknown command", () => {
    expect(() => parseAgentCommand("resume")).toThrow(AppError);
  });
});
