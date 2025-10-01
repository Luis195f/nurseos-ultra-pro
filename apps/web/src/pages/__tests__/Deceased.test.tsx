import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Deceased from "../Deceased";
import { STORE_KEYS } from "@/lib/store";

vi.mock("@/lib/fhir", () => ({
  hasFHIR: () => false,
  markDeceased: vi.fn()
}));

beforeEach(() => {
  localStorage.clear();
});

test("Deceased renderiza y guarda en localStorage", async () => {
  render(<Deceased />);

  const pid = screen.getByLabelText(/patient id/i);
  const dt = screen.getByLabelText(/fecha y hora/i);
  const cause = screen.getByLabelText(/causa/i);
  const btn = screen.getByRole("button", { name: /registrar fallecimiento/i });

  await userEvent.type(pid, "P999");
  // el input ya trae un valor por defecto; lo modificamos para el test
  await userEvent.clear(dt);
  await userEvent.type(dt, "2025-01-01T10:00");
  await userEvent.type(cause, "PCR");
  await userEvent.click(btn);

  expect(await screen.findByText(/paciente marcado como fallecido/i)).toBeInTheDocument();

  const raw = localStorage.getItem("nurseos:" + STORE_KEYS.DECEASED);
  expect(raw).not.toBeNull();
  const arr = JSON.parse(raw as string);
  expect(arr.length).toBe(1);
  expect(arr[0].patientId).toBe("P999");
  expect(arr[0].cause).toBe("PCR");
});
