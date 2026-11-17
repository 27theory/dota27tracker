import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSearch, toAccountId } from "../lib/steam-id";
import { demoMatch } from "../lib/demo";
import { analyzeImpact } from "../lib/impact-analyzer";
import { buildMatchPromptSummary } from "../lib/ai";
test("Steam account conversion uses BigInt and validates the account range", () => {
  assert.equal(toAccountId("76561198281846390"), 321580662);
  assert.equal(toAccountId("321580662"), 321580662);
  assert.equal(toAccountId("76561202255233023"), 4294967295);
  for (const id of ["0", "-1", "76561197960265728", "76561202255233024", "abc"])
    assert.throws(() => toAccountId(id));
});
test("Search distinguishes match IDs from players and only allows Steam links", () => {
  assert.deepEqual(
    parseSearch(
      "https://steamcommunity.com/profiles/76561198281846390/",
      "match",
    ),
    { type: "player", id: "321580662" },
  );
  assert.deepEqual(parseSearch("8123456789", "match"), {
    type: "match",
    id: "8123456789",
  });
  assert.deepEqual(
    parseSearch("https://steamcommunity.com/id/miracle", "player"),
    { type: "vanity", id: "miracle" },
  );
  assert.throws(() =>
    parseSearch("https://steamcommunity.com.evil.test/id/a", "player"),
  );
  assert.throws(() => parseSearch("0", "match"));
});
test("Impact awards MVP only to winning team and finds 1v9 and ruiner", () => {
  const m = demoMatch();
  const map = analyzeImpact(m);
  assert.equal(map.get(m.players[0])?.badge, "MVP");
  assert.equal(map.get(m.players[6])?.badge, "Тащил 1v9");
  assert.equal(map.get(m.players[7])?.badge, "Руинер");
  assert.equal([...map.values()].filter((x) => x.badge === "MVP").length, 1);
});
test("Impact thresholds include -15, -29 and -30; high IMP does not erase critical core feeding", () => {
  for (const [score, badge] of [
    [-15, "Близок к руину"],
    [-29, "Близок к руину"],
    [-30, "Руинер"],
  ] as const) {
    const m = demoMatch();
    m.players[8].imp = score;
    assert.equal(analyzeImpact(m).get(m.players[8])?.badge, badge);
  }
  const m = demoMatch();
  Object.assign(m.players[5], {
    imp: 20,
    kills: 0,
    assists: 0,
    deaths: 15,
    towerDamage: 0,
  });
  assert.equal(analyzeImpact(m).get(m.players[5])?.badge, "Руинер");
});
test("Missing IMP produces an explicit estimated score and never mutates provider data", () => {
  const m = demoMatch();
  m.players[5].imp = null;
  const impact = analyzeImpact(m).get(m.players[5]);
  assert.equal(impact?.estimated, true);
  assert.equal(m.players[5].imp, null);
  assert.ok(Math.abs(impact!.score) <= 100);
});
test("AI summary is compact, includes all ten heroes, target, gold checkpoints and no raw JSON", () => {
  const m = demoMatch();
  const s = buildMatchPromptSummary(m, 321580662);
  assert.ok(s.includes("Phantom Assassin (radiant)"));
  assert.ok(s.includes("10м:"));
  assert.ok(s.includes("30м:"));
  assert.equal(s.split("\n").filter((l) => /^[RD] /.test(l)).length, 10);
  assert.ok(s.length < 3200, `${s.length} chars`);
  assert.ok(!s.includes("accountId"));
});

test("MVP remains the highest IMP winner when every winner has negative IMP", () => {
  const m = demoMatch();
  m.players.slice(0, 5).forEach((p, i) => (p.imp = -40 - i));
  const results = analyzeImpact(m);
  assert.equal(results.get(m.players[0])?.badge, "MVP");
  assert.equal(
    [...results.values()].filter((p) => p.badge === "MVP").length,
    1,
  );
});
