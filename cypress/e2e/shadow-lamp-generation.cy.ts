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

    // Core form elements exist
    cy.get('#image-upload').should('exist');
    cy.get('#process-btn').should('exist').and('be.disabled');

    // Control inputs exist with correct defaults
    cy.get('#dome-diameter').should('have.value', '55');
    cy.get('#dome-height').should('have.value', '30');
    cy.get('#fin-thickness').should('have.value', '0.8');
    cy.get('#base-height').should('have.value', '5');
    cy.get('#angular-resolution').should('have.value', '120');
  });

  it('should update control value displays', () => {
    cy.visit('/');

    // Angular resolution display updates
    cy.get('#angular-resolution').invoke('val', 90).trigger('input');
    cy.get('#angular-value').should('contain', '90 fins');

    // Threshold display updates
    cy.get('#threshold').invoke('val', 200).trigger('input');
    cy.get('#threshold-value').should('contain', '200');
  });
});
