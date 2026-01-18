/// <reference types="cypress" />

/**
 * E2E Test: Shadow Lamp Generator - Minimal User Journey
 *
 * Focus: Browser-specific behavior and core user flow
 * - Upload image
 * - Process image
 * - Download STL
 *
 * Note: Parameter validation and edge cases are covered by unit tests
 */

describe('Shadow Lamp Generator', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should complete the full user journey: upload → process → download', () => {
    // Verify app loads
    cy.contains('Shadecaster').should('be.visible');
    cy.get('#process-btn').should('be.disabled');

    // Upload image
    cy.get('#image-upload').uploadFile('test-circle.png');
    cy.get('#process-btn').should('not.be.disabled');

    // Process image
    cy.get('#process-btn').click();
    cy.waitForPreview();
    cy.get('#download-btn').should('be.visible').and('not.be.disabled');

    // Download STL
    let downloadedBlob: Blob;
    cy.window().then((win) => {
      const originalCreateObjectURL = win.URL.createObjectURL;
      cy.stub(win.URL, 'createObjectURL').callsFake((blob: Blob) => {
        downloadedBlob = blob;
        return originalCreateObjectURL(blob);
      });
    });

    cy.get('#download-btn').click();

    // Verify valid STL file was generated
    cy.then(() => {
      expect(downloadedBlob).to.exist;
      expect(downloadedBlob.type).to.equal('application/sla');
      expect(downloadedBlob.size).to.be.greaterThan(1000);
    });
  });

  it('should adjust controls and regenerate', () => {
    // Upload and process
    cy.get('#image-upload').uploadFile('test-circle.png');
    cy.get('#process-btn').click();
    cy.waitForPreview();

    // Adjust angular resolution control
    cy.get('#angular-resolution').invoke('val', 90).trigger('input');
    cy.get('#angular-value').should('contain', '90 fins');

    // Reprocess with new settings
    cy.get('#process-btn').click();
    cy.waitForPreview();
    cy.get('#download-btn').should('be.visible');
  });
});
