import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PamV2 from "@/components/PamV2";
import { usePamV2Chat } from "@/services/pamV2/usePamV2Chat";
import type { V2ChatState } from "@/services/pamV2/pamV2Reducer";

vi.mock("@/services/pamV2/usePamV2Chat");

const mockUsePamV2Chat = vi.mocked(usePamV2Chat);

const baseState: V2ChatState = {
  messages: [],
  streaming: false,
  conversationId: "conv-1",
};

function setup(overrides: Partial<ReturnType<typeof usePamV2Chat>> = {}) {
  const sendMessage = vi.fn();
  const approve = vi.fn();
  const reject = vi.fn();
  const cancel = vi.fn();
  const clearChat = vi.fn();
  const clearError = vi.fn();

  mockUsePamV2Chat.mockReturnValue({
    state: baseState,
    sendMessage,
    approve,
    reject,
    cancel,
    clearChat,
    clearError,
    ready: true,
    ...overrides,
  });

  return { sendMessage, approve, reject, cancel, clearChat, clearError };
}

describe("PamV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the open button", () => {
    setup();
    render(<PamV2 />);
    expect(screen.getByLabelText(/open pam/i)).toBeInTheDocument();
  });

  it("opens the chat panel when the button is clicked", async () => {
    setup();
    render(<PamV2 />);
    fireEvent.click(screen.getByLabelText(/open pam/i));
    expect(screen.getByRole("dialog", { name: /pam chat/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask pam/i)).toBeInTheDocument();
  });

  it("sends a message when the form is submitted", async () => {
    const { sendMessage } = setup();
    const user = userEvent.setup();
    render(<PamV2 />);

    fireEvent.click(screen.getByLabelText(/open pam/i));
    const input = screen.getByLabelText(/message pam/i);
    await user.type(input, "Plan my trip");
    fireEvent.submit(input.closest("form")!);

    expect(sendMessage).toHaveBeenCalledWith("Plan my trip");
  });

  it("renders a streamed assistant response", async () => {
    setup({
      state: {
        ...baseState,
        messages: [
          { id: "u1", role: "user", content: "Hi" },
          { id: "a1", role: "assistant", content: "Hello there", pending: true },
        ],
        streaming: true,
      },
    });
    render(<PamV2 />);
    fireEvent.click(screen.getByLabelText(/open pam/i));

    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByLabelText(/stop generating/i)).toBeInTheDocument();
  });

  it("renders an approval card and handles approve/reject", async () => {
    const { approve, reject } = setup({
      state: {
        ...baseState,
        messages: [
          { id: "u1", role: "user", content: "Add event" },
          {
            id: "a1",
            role: "assistant",
            content: "",
            approval: {
              token: "token-1",
              actionType: "calendar_event",
              actionSummary: "Create event: Dinner",
              expiresAt: "2026-01-01T00:00:00Z",
              status: "pending",
            },
          },
        ],
      },
    });
    render(<PamV2 />);
    fireEvent.click(screen.getByLabelText(/open pam/i));

    expect(screen.getByText("Create event: Dinner")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(approve).toHaveBeenCalledWith("token-1");

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(reject).toHaveBeenCalledWith("token-1");
  });

  it("displays and dismisses errors", async () => {
    const { clearError } = setup({
      state: {
        ...baseState,
        error: "Network error",
      },
    });
    render(<PamV2 />);
    fireEvent.click(screen.getByLabelText(/open pam/i));

    expect(screen.getByText("Network error")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/dismiss/i));
    expect(clearError).toHaveBeenCalled();
  });

  it("clears the conversation when clear is clicked", async () => {
    const { clearChat } = setup();
    render(<PamV2 />);
    fireEvent.click(screen.getByLabelText(/open pam/i));

    fireEvent.click(screen.getByLabelText(/clear conversation/i));
    expect(clearChat).toHaveBeenCalled();
  });
});
