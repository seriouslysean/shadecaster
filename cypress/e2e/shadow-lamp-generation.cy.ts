/// <reference types="cypress" />

/**
 * E2E Test: Shadow Lamp Generator - Core Browser Behavior
 *
 * Focus: Page loads correctly and basic UI elements work
 * Not testing: File processing, image manipulation, STL generation
 * (Those are covered by unit/integration tests)
 */

describe('Shadow Lamp Generator', () => {
  it('should load the page and display core UI elements', () => {
    cy.visit('/');

    // Page loads with correct content
    cy.contains('Shadecaster').should('be.visible');
    cy.contains('Shadow lamp STL generator').should('be.visible');

    // Core form elements exist; the download button stays hidden until an STL is ready
    cy.get('#image-upload').should('exist');
    cy.get('#download-btn').should('exist').and('not.be.visible');

    // Control inputs exist with correct defaults
    cy.get('#dome-diameter').should('have.value', '60');
    cy.get('#dome-height').should('have.value', '20');
    cy.get('#angular-resolution').should('have.value', '18');
    cy.get('#threshold').should('have.value', '128');
  });

  it('should update control value displays', () => {
    cy.visit('/');

    // Angular resolution display updates
    cy.get('#angular-resolution').invoke('val', 24).trigger('input');
    cy.get('#angular-value').should('contain', '24 angles');

    // Threshold display updates
    cy.get('#threshold').invoke('val', 200).trigger('input');
    cy.get('#threshold-value').should('contain', '200');
  });
});
