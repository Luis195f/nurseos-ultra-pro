import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeBlue from "../CodeBlue";

describe("CodeBlue", () => {
  it("renderiza UI básica y permite iniciar sin crash", async () => {
    render(<CodeBlue />);
    // Título actual
    expect(screen.getByRole("heading", { name: /código azul pro/i })).toBeInTheDocument();

    // Botón Iniciar existe y es clickable
    const start = screen.getByRole("button", { name: /iniciar/i });
    await userEvent.click(start);

    // Presencia de acciones rápidas (cualquier botón de la sección)
    expect(screen.getByRole("button", { name: /adrenalina/i })).toBeInTheDocument();
  });
});
