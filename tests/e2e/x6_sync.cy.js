describe('AntV X6 Data Sync', () => {
    beforeEach(() => {
        cy.visit('/')
        cy.contains('Mode: Step').should('be.visible')
        // cy.get('input[type="checkbox"]').check({ force: true })
        cy.get('select').select('ring_4node.json')
        cy.contains('button', '加载示例').click()
        cy.wait(1000)
    })

    it('should sync node position after drag', () => {
        // 1. Get initial network state
        cy.window().then(win => {
            expect(win.app).to.exist
            expect(win.app.latestNetwork).to.exist
            // Capture initial position of Node 1 (id: 1)
            // Assuming ring_4node has node_id: 0, 1, 2, 3
            const node = win.app.latestNetwork.nodes.find(n => n.node_id === 0)
            cy.wrap(node.display.position).as('initialPos')
        })

        // 2. Drag the node
        cy.get('.simple-node').first().trigger('mousedown', { which: 1, button: 0, force: true })
            .trigger('mousemove', { clientX: 500, clientY: 500, force: true })
            .trigger('mouseup', { force: true })

        cy.wait(500) // Wait for sync event

        // 3. Verify window.app.latestNetwork is updated
        cy.window().then(win => {
            const node = win.app.latestNetwork.nodes.find(n => n.node_id === 0)
            cy.get('@initialPos').then(initialPos => {
                // Position should strictly change
                // Note: coordinates in display might be different from clientX due to pan/zoom, 
                // but they SHOULD be different from initial.
                expect(node.display.position.x).not.to.equal(initialPos.x)
                expect(node.display.position.y).not.to.equal(initialPos.y)
            })
        })
    })

    it('should sync new node after context menu add', () => {
        // 1. Get initial node count
        cy.window().then(win => {
            cy.wrap(win.app.latestNetwork.nodes.length).as('initialCount')
        })

        // 2. Add Node via Context Menu
        cy.get('.x6-editor-container').trigger('contextmenu', { clientX: 600, clientY: 400, force: true })
        cy.contains('.context-menu-item', 'Add Node').click()
        cy.wait(500)

        // 3. Verify node count increased
        cy.window().then(win => {
            cy.get('@initialCount').then(initialCount => {
                expect(win.app.latestNetwork.nodes.length).to.equal(initialCount + 1)
            })
        })
    })
})
