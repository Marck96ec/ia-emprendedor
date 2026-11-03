import "./support/dom";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, test } from "node:test";

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ActionCompletionDialog } from "../src/components/action-completion-dialog";
import {
  DynamicActionCompletionForm,
  type ActionCompletionAction,
} from "../src/components/dynamic-action-completion-form";
import type { ActionCapture, ActionCompletionFormState } from "../src/lib/action-capture";

const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/action-completion-cases.json"), "utf8"),
) as { schemas: Record<string, ActionCapture> };

const contactsSchema = fixtures.schemas.contacts;
const pricingSchema = fixtures.schemas.pricing;

afterEach(() => cleanup());

function deferredAction() {
  const calls: FormData[] = [];
  let resolveCurrent: ((state: ActionCompletionFormState) => void) | undefined;
  const action: ActionCompletionAction = (_state, formData) => {
    calls.push(formData);
    return new Promise((resolve) => {
      resolveCurrent = resolve;
    });
  };
  return {
    action,
    calls,
    resolve: async (state: ActionCompletionFormState) => {
      await act(async () => resolveCurrent?.(state));
    },
  };
}

function submitButton() {
  return screen.getByRole("button", { name: /guardar resultado|guardando resultado/i });
}

function fillContacts() {
  screen.getAllByLabelText(/Nombre del cliente/).forEach((input, index) => {
    fireEvent.change(input, { target: { value: `Cliente ${index + 1}` } });
  });
  screen.getAllByLabelText(/^Resultado/).forEach((select) => {
    fireEvent.change(select, { target: { value: "interested" } });
  });
}

test("every field inside a repeatable group has its own visible, associated label", () => {
  render(<DynamicActionCompletionForm captureSchema={contactsSchema} actionId="a1" action={deferredAction().action} />);

  const names = screen.getAllByLabelText(/Nombre del cliente/);
  const outcomes = screen.getAllByLabelText(/^Resultado/);
  const notes = screen.getAllByLabelText(/^Notas/);
  assert.equal(names.length, 3, "min_items 3 crea tres elementos con su propia etiqueta");
  assert.equal(outcomes.length, 3);
  assert.equal(notes.length, 3);

  const controls = [...document.querySelectorAll("input:not([type=hidden]), select, textarea")];
  for (const control of controls) {
    assert.ok((control as HTMLInputElement).labels?.length, `Control sin etiqueta: ${control.outerHTML}`);
  }
  const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length, "Los IDs deben ser únicos");

  const group = screen.getByRole("group", { name: /Contacto\s*\(obligatorio\)/ });
  assert.match(group.getAttribute("aria-describedby") ?? "", /\S/);
  const hintId = group.getAttribute("aria-describedby")!.split(" ")[0];
  assert.equal(document.getElementById(hintId)?.textContent, "Agrega exactamente 3.");
  assert.ok(screen.getByRole("group", { name: "Contacto 2 de 3" }));
  assert.equal(names[0].getAttribute("aria-required"), "true");
  assert.equal(notes[0].getAttribute("aria-required"), null);
  assert.match(document.querySelector(`label[for="${names[0].id}"]`)?.textContent ?? "", /\(obligatorio\)/);
  assert.match(document.querySelector(`label[for="${notes[0].id}"]`)?.textContent ?? "", /\(opcional\)/);
});

test("multi_select options are grouped under a legend and numbers accept decimals", () => {
  render(<DynamicActionCompletionForm captureSchema={pricingSchema} actionId="a1" action={deferredAction().action} />);

  const signals = screen.getByRole("group", { name: /Señales observadas/ });
  assert.equal(within(signals).getAllByRole("checkbox").length, 3);
  const price = screen.getByLabelText(/Precio probado/) as HTMLInputElement;
  assert.equal(price.getAttribute("step"), "any");
  assert.equal(price.getAttribute("inputmode"), "decimal");
  assert.equal(price.closest("form")?.noValidate, true, "La validación nativa no debe bloquear decimales");
});

test("client validation blocks the submit, explains each error and keeps what was typed", async () => {
  const server = deferredAction();
  render(<DynamicActionCompletionForm captureSchema={contactsSchema} actionId="a1" action={server.action} />);

  const [firstName] = screen.getAllByLabelText(/Nombre del cliente/);
  fireEvent.change(firstName, { target: { value: "Ana" } });
  fireEvent.click(submitButton());

  assert.equal(server.calls.length, 0, "No se envía evidencia incompleta");
  const alert = await screen.findByRole("alert");
  assert.match(alert.textContent ?? "", /Revisa los campos marcados/);

  const secondName = screen.getAllByLabelText(/Nombre del cliente/)[1];
  assert.equal(secondName.getAttribute("aria-invalid"), "true");
  const errorId = secondName.getAttribute("aria-describedby")!.split(" ").at(-1)!;
  assert.equal(document.getElementById(errorId)?.textContent, "Este campo es obligatorio");
  assert.equal((screen.getAllByLabelText(/Nombre del cliente/)[0] as HTMLInputElement).value, "Ana");
  await waitFor(() => assert.equal(document.activeElement?.id, screen.getAllByLabelText(/^Resultado/)[0].id));

  fireEvent.change(secondName, { target: { value: "Luis" } });
  assert.equal(secondName.getAttribute("aria-invalid"), null, "Corregir un campo retira su error");
});

test("a pending save disables the form, ignores repeated clicks and recovers from a server error", async () => {
  const server = deferredAction();
  render(<DynamicActionCompletionForm captureSchema={contactsSchema} actionId="action-1" action={server.action} />);
  fillContacts();

  fireEvent.click(submitButton());
  await waitFor(() => assert.equal(server.calls.length, 1));
  await waitFor(() => assert.equal((submitButton() as HTMLButtonElement).disabled, true));
  assert.match(submitButton().textContent ?? "", /Guardando resultado/);
  assert.equal((screen.getAllByLabelText(/Nombre del cliente/)[0] as HTMLInputElement).closest("fieldset[disabled]") !== null, true);

  fireEvent.click(submitButton());
  fireEvent.submit(submitButton().closest("form")!);
  assert.equal(server.calls.length, 1, "Un segundo clic durante el guardado no envía otra vez");

  const sent = server.calls[0];
  assert.equal(sent.get("action_id"), "action-1");
  assert.deepEqual(JSON.parse(String(sent.get("completion_data"))), {
    contacts: [1, 2, 3].map((index) => ({ name: `Cliente ${index}`, outcome: "interested" })),
  });

  await server.resolve({
    status: "error",
    message: "No pudimos guardar el resultado. Tus respuestas siguen aquí; inténtalo de nuevo.",
    issues: [{ path: "contacts.1.name", message: "El texto no tiene un formato válido o supera el límite" }],
  });

  assert.equal((submitButton() as HTMLButtonElement).disabled, false);
  assert.match(screen.getByRole("alert").textContent ?? "", /Tus respuestas siguen aquí/);
  const secondName = screen.getAllByLabelText(/Nombre del cliente/)[1] as HTMLInputElement;
  assert.equal(secondName.value, "Cliente 2", "Los datos se conservan tras el error");
  assert.equal(secondName.getAttribute("aria-invalid"), "true", "El error del servidor se asocia al campo");

  fireEvent.click(submitButton());
  await waitFor(() => assert.equal(server.calls.length, 2, "Tras el error se puede reintentar"));
});

test("the completion dialog opens as a modal, closes with Escape and stays open while saving", async () => {
  const server = deferredAction();
  let closed = 0;
  const { rerender } = render(
    <ActionCompletionDialog
      open
      onClose={() => { closed += 1; }}
      actionId="action-1"
      captureSchema={contactsSchema}
      action={server.action}
      readOnly={false}
    />,
  );

  const dialog = document.querySelector("dialog")!;
  assert.equal(dialog.open, true);
  assert.ok(screen.getByRole("dialog", { name: contactsSchema.title }));
  assert.equal(document.activeElement, screen.getAllByLabelText(/Nombre del cliente/)[0], "El foco inicial va al primer campo");

  fireEvent(dialog, new window.Event("cancel", { cancelable: true }));
  assert.equal(closed, 1, "Escape cierra el diálogo");

  fillContacts();
  fireEvent.click(submitButton());
  await waitFor(() => assert.equal((submitButton() as HTMLButtonElement).disabled, true));
  fireEvent(dialog, new window.Event("cancel", { cancelable: true }));
  assert.equal(closed, 1, "No se cierra mientras se guarda");
  assert.equal((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled, true);

  await server.resolve({ status: "error", message: "Error temporal" });
  rerender(
    <ActionCompletionDialog
      open={false}
      onClose={() => { closed += 1; }}
      actionId="action-1"
      captureSchema={contactsSchema}
      action={server.action}
      readOnly={false}
    />,
  );
  assert.equal(dialog.open, false);
});

test("read-only results show the stored evidence without a submit button", () => {
  render(
    <DynamicActionCompletionForm
      captureSchema={pricingSchema}
      initialData={{ price: 20, signals: ["interest"] }}
      readOnly
      onCancel={() => undefined}
    />,
  );

  assert.equal((screen.getByLabelText(/Precio probado/) as HTMLInputElement).value, "20");
  assert.equal(screen.queryByRole("button", { name: /Guardar resultado/ }), null);
  assert.ok(screen.getByRole("button", { name: "Cerrar" }));
});
