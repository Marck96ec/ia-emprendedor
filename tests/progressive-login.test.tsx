import "./support/dom";

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  ProgressiveLoginForm,
} from "../src/components/progressive-login-form";
import type { LoginFormState } from "../src/actions/auth";

afterEach(() => cleanup());

function resolvingLogin(error?: string) {
  const calls: FormData[] = [];
  const action = async (
    _state: LoginFormState,
    formData: FormData,
  ): Promise<LoginFormState> => {
    calls.push(formData);
    return error ? { error } : {};
  };

  return { action, calls };
}

test("muestra solo el correo y no consulta autenticación al continuar", () => {
  const { action, calls } = resolvingLogin();
  render(<ProgressiveLoginForm action={action} />);

  assert.ok(screen.getByRole("textbox", { name: "Correo electrónico" }));
  assert.equal(screen.queryByLabelText("Contraseña"), null);
  assert.equal(screen.getByRole("textbox", { name: "Correo electrónico" }).getAttribute("autocomplete"), "username");

  fireEvent.change(screen.getByRole("textbox", { name: "Correo electrónico" }), {
    target: { value: "persona@negocio.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

  assert.equal(calls.length, 0);
  assert.ok(screen.getByLabelText("Contraseña"));
});

test("permite regresar, editar el correo y usa autocomplete de contraseña", () => {
  const { action } = resolvingLogin();
  render(<ProgressiveLoginForm action={action} />);

  const email = screen.getByRole("textbox", { name: "Correo electrónico" });
  fireEvent.change(email, { target: { value: "persona@negocio.com" } });
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

  const password = screen.getByLabelText("Contraseña");
  assert.equal(password.getAttribute("autocomplete"), "current-password");
  assert.equal(password.getAttribute("type"), "password");

  fireEvent.click(screen.getByRole("button", { name: "Editar" }));

  assert.ok(screen.getByRole("textbox", { name: "Correo electrónico" }));
  assert.equal(screen.queryByLabelText("Contraseña"), null);
});

test("conserva el correo y muestra un error de autenticación en el segundo paso", async () => {
  const { action, calls } = resolvingLogin("Correo o contraseña incorrectos.");
  render(<ProgressiveLoginForm action={action} />);

  fireEvent.change(screen.getByRole("textbox", { name: "Correo electrónico" }), {
    target: { value: "persona@negocio.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "incorrecta" },
  });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  });

  await waitFor(() => {
    assert.equal(screen.getByRole("alert").textContent, "Correo o contraseña incorrectos.");
  });
  assert.equal(calls.length, 1);
  assert.match(screen.getByText("persona@negocio.com").textContent ?? "", /persona@negocio\.com/);
});
