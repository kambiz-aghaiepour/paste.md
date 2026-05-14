import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/paste/route";
import { GET } from "@/app/api/paste/[id]/route";
import { GET as GET_RAW } from "@/app/api/paste/[id]/raw/route";
import { db } from "@/lib/db";
import { pastes } from "@/lib/db/schema";
import { like } from "drizzle-orm";

// Track created paste IDs for cleanup
const createdIds: string[] = [];

afterEach(() => {
  // Clean up any test pastes
  for (const id of createdIds) {
    db.delete(pastes)
      .where(like(pastes.id, id))
      .run();
  }
  createdIds.length = 0;
});

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/paste", () => {
  it("CORE-01: creates a paste and returns id + url", async () => {
    const request = makePostRequest({ content: "Hello world" });
    const response = await POST(request);

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe("string");
    expect(data.id.length).toBe(8);
    expect(data.url).toBeDefined();
    expect(data.url).toBe(`/${data.id}`);

    createdIds.push(data.id);
  });

  it("CORE-02: created paste url starts with /", async () => {
    const request = makePostRequest({ content: "Test content for URL check" });
    const response = await POST(request);

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.url).toMatch(/^\//);
    expect(data.url).toBe(`/${data.id}`);

    createdIds.push(data.id);
  });

  it("CORE-04: paste id is 8 characters, URL-safe", async () => {
    const request = makePostRequest({ content: "Test content for ID check" });
    const response = await POST(request);

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id.length).toBe(8);
    expect(data.id).toMatch(/^[A-Za-z0-9_-]+$/);

    createdIds.push(data.id);
  });

  it("SECU-04: rejects content exceeding 512KB with 413", async () => {
    const oversizedContent = "x".repeat(512 * 1024 + 1);
    const request = makePostRequest({ content: oversizedContent });
    const response = await POST(request);

    expect(response.status).toBe(413);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("rejects empty content with 400", async () => {
    const request = makePostRequest({ content: "" });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects missing content with 400", async () => {
    const request = makePostRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new Request("http://localhost/api/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "this is not json",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});

describe("GET /api/paste/:id", () => {
  it("CORE-03: returns paste data", async () => {
    // First create a paste
    const createRequest = makePostRequest({
      content: "Test content for retrieval",
    });
    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();
    createdIds.push(createData.id);

    // Now retrieve it
    const getRequest = new Request(
      `http://localhost/api/paste/${createData.id}`,
    );
    const getResponse = await GET(getRequest, {
      params: Promise.resolve({ id: createData.id }),
    });

    expect(getResponse.status).toBe(200);

    const data = await getResponse.json();
    expect(data.id).toBe(createData.id);
    expect(data.content).toBe("Test content for retrieval");
    expect(data.created_at).toBeDefined();
    expect(typeof data.created_at).toBe("number");
    expect(data).toHaveProperty("expires_at");
  });

  it("returns 404 for non-existent paste", async () => {
    const request = new Request("http://localhost/api/paste/notexist");
    const response = await GET(request, {
      params: Promise.resolve({ id: "notexist" }),
    });

    expect(response.status).toBe(404);
  });
});

describe("GET /api/paste/:id/raw", () => {
  it("returns plain text content", async () => {
    // First create a paste
    const createRequest = makePostRequest({
      content: "Raw text content test",
    });
    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();
    createdIds.push(createData.id);

    // Now retrieve raw
    const rawRequest = new Request(
      `http://localhost/api/paste/${createData.id}/raw`,
    );
    const rawResponse = await GET_RAW(rawRequest, {
      params: Promise.resolve({ id: createData.id }),
    });

    expect(rawResponse.status).toBe(200);

    const contentType = rawResponse.headers.get("Content-Type");
    expect(contentType).toContain("text/plain");

    const text = await rawResponse.text();
    expect(text).toBe("Raw text content test");
  });
});
