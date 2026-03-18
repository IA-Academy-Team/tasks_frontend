import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { apiFetch } from "./api";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("returns parsed payload for successful requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await apiFetch<{ data: { ok: boolean } }>("/health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ data: { ok: true } });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("emits success toast on successful mutation requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { created: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await apiFetch("/resource", {
      method: "POST",
      body: JSON.stringify({}),
    });

    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("throws ApiError and emits error toast when backend returns non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        error: "Fallo de validacion",
        code: "VALIDATION_ERROR",
      }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiFetch("/resource", { method: "PATCH" })).rejects.toEqual(
      expect.objectContaining({
        message: "Fallo de validacion",
        status: 400,
        code: "VALIDATION_ERROR",
      }),
    );

    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("throws network ApiError when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    await expect(apiFetch("/resource")).rejects.toEqual(
      expect.objectContaining({
        message: "No fue posible conectar con el servidor.",
        endpoint: "/resource",
      }),
    );

    expect(toastError).toHaveBeenCalledTimes(1);
  });
});
