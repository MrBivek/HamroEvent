import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerEvents from "./CustomerEvents";

const { toastMock, eventsServiceMock } = vi.hoisted(() => ({
    toastMock: vi.fn(),
    eventsServiceMock: {
        getApiEvents: vi.fn(),
        postApiEvents: vi.fn(),
        deleteApiEvents: vi.fn(),
    },
}));

vi.mock("@/hooks/use-toast.ts", () => ({
    useToast: () => ({
        toast: toastMock,
    }),
}));

vi.mock("@/services/EventsService", () => ({
    EventsService: eventsServiceMock,
}));

vi.mock("@/components/ui/dialog.tsx", () => ({
    Dialog: ({ children }: { children: any }) => <div>{children}</div>,
    DialogContent: ({ children }: { children: any }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: any }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: any }) => <h2>{children}</h2>,
    DialogTrigger: ({ children }: { children: any }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover.tsx", () => ({
    Popover: ({ children }: { children: any }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children: any }) => <div>{children}</div>,
    PopoverContent: ({ children }: { children: any }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/calendar.tsx", () => ({
    Calendar: ({ onSelect }: { onSelect?: (date?: Date) => void }) => (
        <button type="button" onClick={() => onSelect?.(new Date("2026-10-22T00:00:00.000Z"))}>
            Pick test date
        </button>
    ),
}));

vi.mock("@/components/ui/select.tsx", async () => {
    const React = await import("react");

    const SelectValue = ({ placeholder }: { placeholder?: string }) =>
        React.createElement("mock-select-value", { placeholder });

    const SelectItem = ({ value, children }: { value: string; children: any }) =>
        React.createElement("mock-select-item", { value }, children);

    const collectItems = (children: any) => {
        const items: Array<{ value: string; label: string }> = [];
        let placeholder = "Select";

        const visit = (node: any) => {
            React.Children.forEach(node, (child) => {
                if (!React.isValidElement(child)) return;

                if (child.type === SelectValue) {
                    placeholder = child.props.placeholder || placeholder;
                    return;
                }

                if (child.type === SelectItem) {
                    items.push({
                        value: child.props.value,
                        label: typeof child.props.children === "string" ? child.props.children : child.props.value,
                    });
                    return;
                }

                if (child.props?.children) {
                    visit(child.props.children);
                }
            });
        };

        visit(children);
        return { items, placeholder };
    };

    return {
        Select: ({
            value,
            onValueChange,
            children,
        }: {
            value?: string;
            onValueChange?: (value: string) => void;
            children: any;
        }) => {
            const { items, placeholder } = collectItems(children);

            return (
                <div>
                    <select
                        aria-label={placeholder}
                        value={value ?? ""}
                        onChange={(event) => onValueChange?.(event.target.value)}
                    >
                        <option value="">{placeholder}</option>
                        {items.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                    {children}
                </div>
            );
        },
        SelectTrigger: ({ children }: { children: any }) => <div>{children}</div>,
        SelectValue,
        SelectContent: ({ children }: { children: any }) => <div>{children}</div>,
        SelectItem,
    };
});

describe("CustomerEvents", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        eventsServiceMock.getApiEvents.mockResolvedValue({ items: [] });
    });

    it("creates an event with the selected date and time range", async () => {
        eventsServiceMock.postApiEvents.mockResolvedValue({
            _id: "event-1",
            title: "Wedding Celebration",
            eventType: "Wedding",
            date: "2026-10-22T00:00:00.000Z",
            startTime: "10:00",
            endTime: "16:00",
            location: "Kathmandu",
            budget: 200000,
            createdAt: "2026-01-01T00:00:00.000Z",
            vendorCount: 0,
        });

        render(
            <MemoryRouter>
                <CustomerEvents />
            </MemoryRouter>,
        );

        await screen.findByText(/my events/i);

        fireEvent.change(screen.getByLabelText(/event title/i), {
            target: { value: "Wedding Celebration" },
        });
        fireEvent.change(screen.getByLabelText(/event type/i), {
            target: { value: "Wedding" },
        });
        fireEvent.change(screen.getByLabelText(/location/i), {
            target: { value: "Kathmandu" },
        });
        fireEvent.change(screen.getByLabelText(/budget/i), {
            target: { value: "200000" },
        });

        fireEvent.click(screen.getByRole("button", { name: /pick test date/i }));
        fireEvent.change(screen.getByLabelText(/select start time/i), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/select end time/i), {
            target: { value: "16:00" },
        });

        fireEvent.submit(screen.getByLabelText(/event title/i).closest("form")!);

        await waitFor(() => {
            expect(eventsServiceMock.postApiEvents).toHaveBeenCalledWith({
                requestBody: {
                    title: "Wedding Celebration",
                    eventType: "Wedding",
                    date: "2026-10-22",
                    startTime: "10:00",
                    endTime: "16:00",
                    location: "Kathmandu",
                    notes: "",
                    budget: 200000,
                },
            });
        });
    });
});
