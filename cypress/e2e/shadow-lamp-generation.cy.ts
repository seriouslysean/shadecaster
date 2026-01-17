/// <reference types="cypress" />

/**
 * E2E Test: Shadow Lamp Generation - Complete User Journey
 *
 * Tests the full workflow:
 * 1. Upload image
 * 2. Adjust parameters
 * 3. Process image
 * 4. Download STL
 * 5. Validate STL structure
 */

describe('Shadow Lamp Generator - User Journey', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the application successfully', () => {
    // Verify page title and branding
    cy.contains('Shadecaster').should('be.visible');
    cy.get('h1').should('contain', 'Shadow lamp STL generator');

    // Verify initial UI state
    cy.get('#image-upload').should('exist');
    cy.get('#process-btn').should('be.disabled');
    cy.get('#download-btn').should('not.be.visible');
  });

  it('should display correct input guidance', () => {
    // Verify user guidance is present
    cy.contains('Black silhouette on white or transparent background').should('be.visible');
    cy.contains('Print with dark filament for maximum contrast').should('be.visible');
  });

  it('should have correct default parameter values', () => {
    // Verify all parameters match specification
    cy.get('#dome-diameter').should('have.value', '60');
    cy.get('#dome-height').should('have.value', '40');
    cy.get('#fin-thickness').should('have.value', '1.2');
    cy.get('#base-height').should('have.value', '8');
    cy.get('#angular-resolution').should('have.value', '180');
    cy.get('#threshold').should('have.value', '128');
  });

  it('should update parameter displays when values change', () => {
    // Change angular resolution
    cy.get('#angular-resolution').invoke('val', 90).trigger('input');
    cy.get('#angular-value').should('contain', '90 fins');

    // Change threshold
    cy.get('#threshold').invoke('val', 200).trigger('input');
    cy.get('#threshold-value').should('contain', '200');
  });

  describe('Image Upload and Processing', () => {
    it('should enable process button after image upload', () => {
      // Upload test image
      cy.get('#image-upload').uploadFile('test-circle.png');

      // Process button should become enabled
      cy.get('#process-btn').should('not.be.disabled');
    });

    it('should process image and show preview', () => {
      // Upload and process
      cy.get('#image-upload').uploadFile('test-circle.png');
      cy.get('#process-btn').should('not.be.disabled').click();

      // Preview should be visible
      cy.waitForPreview();

      // Download button should appear
      cy.get('#download-btn').should('be.visible').and('not.be.disabled');
    });

    it('should handle edge case: all-white image', () => {
      // Upload all-white image
      cy.get('#image-upload').uploadFile('test-white.png');
      cy.get('#process-btn').click();

      // Should show error about threshold
      cy.get('#info-text').should('contain', 'all white').and('contain', 'threshold');
    });

    it('should handle edge case: all-black image', () => {
      // Upload all-black image
      cy.get('#image-upload').uploadFile('test-black.png');
      cy.get('#process-btn').click();

      // Should show error about threshold
      cy.get('#info-text').should('contain', 'all black').and('contain', 'threshold');
    });
  });

  describe('STL Generation and Download', () => {
    beforeEach(() => {
      // Setup: upload and process image
      cy.get('#image-upload').uploadFile('test-circle.png');
      cy.get('#process-btn').click();
      cy.waitForPreview();
    });

    it('should generate and download STL file', () => {
      // Intercept download
      cy.window().then((win) => {
        cy.stub(win.URL, 'createObjectURL').callsFake(() => 'blob:mock');
      });

      // Trigger download
      cy.get('#download-btn').click();

      // Verify blob URL was created
      cy.window().then((win) => {
        expect(win.URL.createObjectURL).to.have.been.called;
      });
    });

    it('should generate binary STL with correct structure', () => {
      let stlBlob: Blob;

      // Intercept the blob creation
      cy.window().then((win) => {
        const originalCreateObjectURL = win.URL.createObjectURL;
        cy.stub(win.URL, 'createObjectURL').callsFake((blob: Blob) => {
          stlBlob = blob;
          return originalCreateObjectURL(blob);
        });
      });

      // Download STL
      cy.get('#download-btn').click();

      // Validate STL structure
      cy.then(() => {
        expect(stlBlob).to.exist;
        expect(stlBlob.type).to.equal('application/sla');

        // Binary STL should be reasonable size
        // With 180 fins, we expect thousands of triangles
        expect(stlBlob.size).to.be.greaterThan(1000);

        // Read blob and validate binary STL structure
        return stlBlob.arrayBuffer();
      }).then((buffer) => {
        const view = new DataView(buffer);

        // Validate header (first 80 bytes)
        expect(buffer.byteLength).to.be.greaterThan(84);

        // Read triangle count (bytes 80-83, little-endian uint32)
        const triangleCount = view.getUint32(80, true);
        expect(triangleCount).to.be.greaterThan(0);

        // Validate total size matches STL format
        // Size = 80 (header) + 4 (count) + triangleCount * 50
        const expectedSize = 84 + triangleCount * 50;
        expect(buffer.byteLength).to.equal(expectedSize);

        // Sample first triangle (starts at byte 84)
        // Verify normal vector (3 floats)
        const nx = view.getFloat32(84, true);
        const ny = view.getFloat32(88, true);
        const nz = view.getFloat32(92, true);

        // Normal should be normalized (length ≈ 1) or zero vector
        const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
        expect(normalLength).to.be.within(0, 1.5); // Allow some tolerance
      });
    });

    it('should adjust parameters and regenerate STL', () => {
      // Change parameters
      cy.get('#dome-diameter').clear().type('80');
      cy.get('#fin-thickness').clear().type('1.5');
      cy.get('#angular-resolution').invoke('val', 90).trigger('input');

      // Reprocess
      cy.get('#process-btn').click();
      cy.waitForPreview();

      // Download should still work
      cy.get('#download-btn').should('be.visible').and('not.be.disabled');
    });
  });

  describe('Parameter Validation', () => {
    it('should respect parameter ranges', () => {
      // Test min/max values
      cy.get('#dome-diameter').should('have.attr', 'min', '50');
      cy.get('#dome-diameter').should('have.attr', 'max', '200');

      cy.get('#dome-height').should('have.attr', 'min', '20');
      cy.get('#dome-height').should('have.attr', 'max', '150');

      cy.get('#fin-thickness').should('have.attr', 'min', '0.5');
      cy.get('#fin-thickness').should('have.attr', 'max', '5');

      cy.get('#base-height').should('have.attr', 'min', '5');
      cy.get('#base-height').should('have.attr', 'max', '30');

      cy.get('#angular-resolution').should('have.attr', 'min', '24');
      cy.get('#angular-resolution').should('have.attr', 'max', '360');

      cy.get('#threshold').should('have.attr', 'min', '0');
      cy.get('#threshold').should('have.attr', 'max', '255');
    });
  });

  describe('Privacy and Client-Side Processing', () => {
    it('should not make any network requests during processing', () => {
      // Monitor network activity
      cy.intercept('*', (req) => {
        // Only allow same-origin requests (static assets)
        if (!req.url.startsWith(Cypress.config('baseUrl') || '')) {
          throw new Error(`Unexpected external request: ${req.url}`);
        }
      });

      // Upload and process
      cy.get('#image-upload').uploadFile('test-circle.png');
      cy.get('#process-btn').click();
      cy.waitForPreview();
      cy.get('#download-btn').click();

      // No errors should have been thrown
    });

    it('should display privacy notice', () => {
      cy.contains('All processing happens in your browser').should('be.visible');
    });
  });
});
