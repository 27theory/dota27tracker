import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { normalizeStratz, normalizeOpenDota } from "../lib/dota-api";
import { signSession, secret } from "../lib/auth";
import { GET as callback } from "../app/api/auth/steam/callback/route";
import { POST as analyze } from "../app/api/analyze-match/route";
const base = "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL = base;
process.env.JWT_SECRET = "synthetic-test-session-secret-at-least-32-characters";
function stratzFixture() {
  return {
    id: 123,
    durationSeconds: 2400,
    startDateTime: 1770000000,
    didRadiantWin: true,
    gameMode: "ALL_PICK_RANKED",
    averageRank: 74,
    topLaneOutcome: "DIRE_STOMP",
    midLaneOutcome: "RADIANT_VICTORY",
    bottomLaneOutcome: "TIE",
    radiantNetworthLeads: [-100, 0, 300, 500],
    radiantExperienceLeads: [-20, 0, 500, 900],
    players: Array.from({ length: 10 }, (_, i) => ({
      steamAccountId: i + 1,
      heroId: 44,
      isRadiant: i < 5,
      position: `POSITION_${(i % 5) + 1}`,
      lane: i % 5 === 1 ? "MID_LANE" : "SAFE_LANE",
      steamAccount: { name: `Player${i}` },
      imp: 20 - i * 5,
      goldPerMinute: 500,
      kills: 2,
      stats: {
        itemPurchases: [
          { itemId: 116, time: 1300 },
          { itemId: 42, time: 200 },
        ],
      },
    })),
  };
}
test("STRATZ maps enum mode, positions, physical lane outcomes, ward purchases and pregame offset", () => {
  const m = normalizeStratz(stratzFixture());
  assert.equal(m.players.length, 10);
  assert.equal(m.players[0].role, 1);
  assert.equal(m.players[1].laneOutcome, "победа");
  assert.equal(m.players[5].laneOutcome, "победа в салат");
  assert.equal(m.players[0].wards, 1);
  assert.equal(m.mode, "Рейтинговый · All Pick");
  assert.deepEqual(m.goldLeads, [0, 300, 500]);
  assert.equal(m.rank, "Божество 4 ★");
});
test("OpenDota does not invent IMP, carry/support positions or lane outcomes", () => {
  const m = normalizeOpenDota({
    match_id: 123,
    duration: 2400,
    start_time: 1770000000,
    radiant_win: true,
    version: 21,
    players: Array.from({ length: 10 }, (_, i) => ({
      player_slot: i < 5 ? i : 128 + i,
      hero_id: 44,
      lane_role: 1,
      kills: 2,
    })),
  });
  assert.equal(m.players[0].role, null);
  assert.equal(m.players[0].imp, null);
  assert.equal(m.players[0].laneOutcome, null);
  assert.equal(m.parsed, true);
});
test("Session tokens are signed, scoped and expire in seven days", async () => {
  const token = await signSession({
    accountId: 123,
    steamId: "76561197960265851",
  });
  const { payload } = await jwtVerify(token, secret(), {
    algorithms: ["HS256"],
    issuer: base,
    audience: "dota27",
  });
  assert.equal(payload.accountId, 123);
  assert.equal(payload.exp! - payload.iat!, 604800);
  await assert.rejects(
    jwtVerify(token, new TextEncoder().encode("incorrect-signing-secret")),
  );
});
test("Steam callback rejects unsolicited or incomplete assertions", async () => {
  const r = await callback(
    new NextRequest(
      `${base}/api/auth/steam/callback?state=evil&openid.mode=id_res`,
    ),
  );
  assert.equal(r.status, 307);
  assert.equal(r.headers.get("location"), `${base}/?authError=steam`);
  assert.ok(!r.headers.get("set-cookie")?.includes("dota27_session"));
});
test("Steam callback verifies assertion server side and issues an httpOnly cookie", async () => {
  const state = "synthetic-state";
  const id = "76561198281846390";
  const returnTo = `${base}/api/auth/steam/callback?state=${state}`;
  const p = new URLSearchParams({
    state,
    "openid.mode": "id_res",
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.op_endpoint": "https://steamcommunity.com/openid/login",
    "openid.return_to": returnTo,
    "openid.claimed_id": `https://steamcommunity.com/openid/id/${id}`,
    "openid.identity": `https://steamcommunity.com/openid/id/${id}`,
    "openid.response_nonce":
      new Date().toISOString().replace(/\.\d{3}Z/, "Z") + "nonce",
    "openid.signed":
      "op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.assoc_handle": "synthetic",
  });
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://steamcommunity.com/openid/login");
    assert.equal(
      new URLSearchParams(String(init?.body)).get("openid.mode"),
      "check_authentication",
    );
    return new Response("is_valid:true\n");
  };
  try {
    const r = await callback(
      new NextRequest(`${base}/api/auth/steam/callback?${p}`, {
        headers: { cookie: `steam_state=${state}` },
      }),
    );
    assert.equal(r.headers.get("location"), `${base}/player/321580662`);
    assert.match(
      r.headers.get("set-cookie") ?? "",
      /dota27_session=.*HttpOnly/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("AI endpoint rejects cross-origin calls and handles a compatible provider response", async () => {
  const blocked = await analyze(
    new Request(`${base}/api/analyze-match`, {
      method: "POST",
      headers: { origin: "https://evil.test" },
      body: "{}",
    }),
  );
  assert.equal(blocked.status, 403);
  const original = globalThis.fetch;
  process.env.AI_API_KEY = "synthetic-test-key";
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.ok(body.messages[1].content.includes("СИНТЕТИЧЕСКИЙ"));
    assert.ok(!body.messages[1].content.includes("accountId"));
    return Response.json({
      choices: [
        { message: { content: "## Главный вердикт\nПобеда Radiant." } },
      ],
    });
  };
  try {
    const r = await analyze(
      new Request(`${base}/api/analyze-match`, {
        method: "POST",
        headers: { origin: base },
        body: JSON.stringify({ matchId: "demo", targetAccountId: 321580662 }),
      }),
    );
    assert.equal(r.status, 200);
    assert.match((await r.json()).analysis, /Победа Radiant/);
  } finally {
    globalThis.fetch = original;
    delete process.env.AI_API_KEY;
  }
});

test("Parsing queues a real numeric match via OpenDota and rejects demo", async () => {
  const { POST } = await import("../app/api/matches/[id]/parse/route");
  const request = () =>
    new Request(`${base}/api/matches/123/parse`, {
      method: "POST",
      headers: { origin: base },
    });
  assert.equal(
    (await POST(request(), { params: Promise.resolve({ id: "demo" }) })).status,
    400,
  );
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.opendota.com/api/request/123");
    assert.equal(init?.method, "POST");
    return Response.json({ job: { jobId: 1 } });
  };
  try {
    const r = await POST(request(), { params: Promise.resolve({ id: "123" }) });
    assert.equal(r.status, 200);
    assert.match((await r.json()).message, /очередь/);
  } finally {
    globalThis.fetch = original;
  }
});
