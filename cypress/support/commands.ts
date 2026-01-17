/// <reference types="cypress" />

/**
 * Custom command to upload a file to an input element
 */
Cypress.Commands.add('uploadFile', { prevSubject: 'element' }, (subject, fileName) => {
  cy.fixture(fileName, 'base64').then((fileContent) => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent, 'image/png');
    const file = new File([blob], fileName, { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const input = subject[0] as HTMLInputElement;
    input.files = dataTransfer.files;

    // Trigger change event
    cy.wrap(subject).trigger('change', { force: true });
  });
});

/**
 * Custom command to wait for preview canvas to be visible
 */
Cypress.Commands.add('waitForPreview', () => {
  cy.get('#preview-section').should('not.have.class', 'hidden');
  cy.get('#preview-canvas').should('be.visible');
});
