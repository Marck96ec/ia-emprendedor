import "./support/dom";

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { ConversationalOnboarding } from "../src/components/conversational-onboarding";
import type { OnboardingActionResult } from "../src/lib/onboarding-action";

afterEach(() => cleanup());

async function findCurrentTextbox(question: RegExp) {
  return screen.findByRole("textbox", {
    name: question,
  }, {
    timeout: 5000,
  });
}

test("guía el negocio con una sola pregunta, pensamiento y edición contextual", async () => {
  const action = async (): Promise<OnboardingActionResult> => ({ success: true });

  render(<ConversationalOnboarding mode="business" action={action} />);

  const nameInput = await findCurrentTextbox(/cómo se llama tu negocio/i);
  assert.equal(
    screen.queryByRole("textbox", { name: /qué productos o servicios/i }),
    null,
  );

  fireEvent.change(nameInput, { target: { value: "Detalles que Hablan" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

  assert.ok(
    screen.getByRole("status", {
      name: /preparando la siguiente pregunta/i,
    }),
  );

  const descriptionInput = await findCurrentTextbox(
    /qué productos o servicios ofrece detalles que hablan/i,
  );
  assert.ok(
    screen.getByRole("button", {
      name: /Detalles que Hablan.*Editar respuesta/i,
    }),
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: /Detalles que Hablan.*Editar respuesta/i,
    }),
  );
  const editedNameInput = await findCurrentTextbox(/cómo se llama tu negocio/i);
  assert.equal((editedNameInput as HTMLInputElement).value, "Detalles que Hablan");

  fireEvent.change(editedNameInput, { target: { value: "Nuevo Negocio" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

  await findCurrentTextbox(/qué productos o servicios ofrece nuevo negocio/i);
  assert.equal((descriptionInput as HTMLTextAreaElement).isConnected, false);
});

test("conserva las respuestas si el guardado del resumen falla", async () => {
  const calls: FormData[] = [];
  const action = async (formData: FormData): Promise<OnboardingActionResult> => {
    calls.push(formData);
    return {
      success: false,
      message: "No pudimos guardar tu información.",
    };
  };

  render(<ConversationalOnboarding mode="business" action={action} />);

  const nameInput = await findCurrentTextbox(/cómo se llama tu negocio/i);
  fireEvent.change(nameInput, { target: { value: "Detalles que Hablan" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

  const descriptionInput = await findCurrentTextbox(
    /qué productos o servicios ofrece detalles que hablan/i,
  );
  fireEvent.change(descriptionInput, {
    target: { value: "Diseñamos detalles personalizados para celebraciones." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

  const revenueInput = await findCurrentTextbox(/cómo gana dinero/i);
  fireEvent.change(revenueInput, {
    target: { value: "Vendemos productos personalizados y cobramos por cada pedido." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

  const submit = await screen.findByRole("button", {
    name: "Continuar con mi diagnóstico",
  });
  fireEvent.click(submit);

  await waitFor(() => {
    assert.equal(calls.length, 1);
    assert.match(screen.getByRole("alert").textContent ?? "", /No pudimos guardar/);
  });
  assert.equal(calls[0].get("name"), "Detalles que Hablan");
  assert.ok(
    screen
      .getAllByText(/Vendemos productos personalizados/)
      .some((element) =>
        (element.textContent ?? "").includes(
          "Vendemos productos personalizados",
        ),
      ),
  );
});

test("mantiene el orden progresivo de las preguntas del diagnóstico", async () => {
  const action = async (): Promise<OnboardingActionResult> => ({ success: true });

  render(
    <ConversationalOnboarding
      mode="diagnostic"
      action={action}
      businessName="Detalles que Hablan"
    />,
  );

  const stage = await screen.findByRole("radio", {
    name: "Estoy empezando",
  }, {
    timeout: 5000,
  });
  assert.equal(screen.queryByRole("spinbutton"), null);

  fireEvent.click(stage);
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

  const teamSize = await screen.findByRole("spinbutton", {
    name: /cuántas personas forman parte/i,
  }, {
    timeout: 5000,
  });
  assert.ok(teamSize);
  assert.equal(
    screen.queryByRole("textbox", { name: /principal problema/i }),
    null,
  );
});
