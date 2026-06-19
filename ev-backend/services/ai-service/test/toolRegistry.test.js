import assert from "node:assert/strict";
import test from "node:test";
import { runTool, tools } from "../src/tools/index.js";

test("registers all ChargeOps agent tools", () => {
  assert.deepEqual(Object.keys(tools).sort(), [
    "create_booking",
    "get_spending_history",
    "get_station_reviews",
    "get_utilization_metrics",
    "search_stations"
  ]);
});

test("rejects unknown tools", async () => {
  await assert.rejects(() => runTool("unknown_tool", {}, {}), /Unknown AI tool requested/);
});
