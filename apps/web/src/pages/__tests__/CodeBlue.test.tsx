import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeBlue from "../CodeBlue";
import { STORE_KEYS } from "@/lib/store";

vi.mock("@/lib/fhir", () => ({
  hasFHIR: () => false,
  registerCodeBlue: vi.fn()
}));

beforeEach(() => {
  localStorage.clear();
});

test("CodeBlue renderiza y guarda en localStorage", async () => {
  render(<CodeBlue />);

  const pid = screen.getByLabelText(/patient id/i);
  const nota = screen.getByLabelText(/nota/i);
  const btn = screen.getByRole("button", { name: /registrar código azul/i });

  await userEvent.type(pid, "P123");
  await userEvent.type(nota, "PCR presenciada");
  await userEvent.click(btn);

  expect(await screen.findByText(/código azul registrado/i)).toBeInTheDocument();

  const raw = localStorage.getItem("nurseos:" + STORE_KEYS.CODE_BLUE);
  expect(raw).not.toBeNull();
  const arr = JSON.parse(raw as string);
  expect(arr.length).toBe(1);
  expect(arr[0].patientId).toBe("P123");
  expect(arr[0].note).toBe("PCR presenciada");
});
