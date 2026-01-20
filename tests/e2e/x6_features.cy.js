describe('AntV X6 Feature Enhancements', () => {
    beforeEach(() => {
        cy.on('window:console', (msg) => {
            console.log('Browser Console:', msg)
        })

        cy.visit('/')
        // Load Example Network to ensure nodes exist
        cy.get('select').select('ring_4node.json')
        cy.contains('button', '加载示例').click()
        cy.wait(1000)
        cy.get('.simple-node', { timeout: 10000 }).should('have.length.at.least', 1)
    })

    it('should handle Copy and Paste (Clipboard)', () => {
        // 1. Ensure graph is loaded and focusable
        cy.get('.x6-editor-container').first().should('have.attr', 'tabindex', '0')
        cy.get('.x6-editor-container').first().click() // Give focus

        // 2. Select a node
        cy.get('.simple-node').should('have.length.at.least', 1)
        cy.get('.simple-node').first().click({ force: true })

        // 3. Initial Count
        cy.get('.simple-node').then($nodes => {
            const initialCount = $nodes.length

            // 4. Click Copy Button
            cy.get('button[title="Copy (Ctrl+C)"]').click()
            cy.wait(200)

            // 5. Click Paste Button
            cy.get('button[title="Paste (Ctrl+V)"]').click()
            cy.wait(1000)

            // 6. Verify count increased
            cy.get('.simple-node').should('have.length', initialCount + 1)
        })
    })

    it('should handle Undo and Redo', () => {
        // 1. Get initial position
        cy.get('.simple-node').first().then($node => {
            const initialRect = $node[0].getBoundingClientRect()
            const initialLeft = initialRect.left
            const initialTop = initialRect.top

            // 2. Drag node (using client coordinates relative to page)
            cy.wrap($node)
                .trigger('mousedown', { button: 0, clientX: initialLeft + 5, clientY: initialTop + 5, force: true })
                .trigger('mousemove', { clientX: initialLeft + 100, clientY: initialTop + 100, force: true })
                .trigger('mouseup', { force: true })

            cy.wait(1000)

            // 3. Verify position changed
            cy.get('.simple-node').first().then($newNode => {
                const newRect = $newNode[0].getBoundingClientRect()
                expect(newRect.left).not.to.be.closeTo(initialLeft, 1)
            })

            // 4. Click Undo Button (should be enabled now)
            cy.get('button[title="Undo"]').click()
            cy.wait(500)

            // 5. Verify position reverted
            cy.get('.simple-node').first().then($revertedNode => {
                const revertedRect = $revertedNode[0].getBoundingClientRect()
                expect(revertedRect.left).to.be.closeTo(initialLeft, 5)
            })
        })
    })

    it('should handle Keyboard Shortcuts (Undo/Redo)', () => {
        cy.get('.x6-editor-container').first().click() // Ensure focus

        cy.get('.simple-node').first().then($node => {
            const initialRect = $node[0].getBoundingClientRect()
            const sx = initialRect.left
            const sy = initialRect.top

            // Drag
            cy.wrap($node)
                .trigger('mousedown', { button: 0, clientX: sx + 5, clientY: sy + 5, force: true })
                .trigger('mousemove', { clientX: sx + 50, clientY: sy + 50, force: true })
                .trigger('mouseup', { force: true })

            cy.wait(500)

            // Undo (Ctrl+Z)
            cy.get('body').first().trigger('keydown', { key: 'z', ctrlKey: true, which: 90, code: 'KeyZ', force: true })
            cy.wait(500)

            // Verify
            cy.get('.simple-node').first().then($n => {
                expect($n[0].getBoundingClientRect().left).to.be.closeTo(sx, 5)
            })

            // Redo (Ctrl+Shift+Z)
            cy.get('body').first().trigger('keydown', { key: 'z', ctrlKey: true, shiftKey: true, which: 90, code: 'KeyZ', force: true })
            cy.wait(500)

            // Verify
            cy.get('.simple-node').first().then($n => {
                expect($n[0].getBoundingClientRect().left).not.to.be.closeTo(sx, 5)
            })
        })
    })
})
