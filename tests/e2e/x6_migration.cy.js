describe('AntV X6 Migration Prototype', () => {
    beforeEach(() => {
        // Reset the application state before each test
        cy.visit('/')
        // Ensure the app is loaded
        cy.contains('Mode: Step').should('be.visible')
    })

    it('should toggle to X6 Editor', () => {
        // 1. Check for the toggle switch
        // 1. Verify X6 Container is present by default


        // 3. Verify X6 Container is present
        cy.get('.x6-editor-container').should('exist')
        cy.get('.x6-graph-svg').should('exist') // X6 internal SVG layer
    })

    it('should render nodes using Vue components', () => {
        // 1. Toggle to X6
        // 1. (Toggle removed - X6 is default)


        // 2. Load the 4-node ring example
        cy.get('select').select('ring_4node.json')
        cy.contains('button', '加载示例').click()

        // 3. Wait for nodes to appear. 
        // Since we used @antv/x6-vue-shape with SimpleNode.vue, 
        // the nodes will be rendered as DOM elements with class 'simple-node'
        // appearing inside the graph container.
        cy.wait(1000) // Wait for render cycle
        cy.get('.simple-node').should('have.length', 4)

        // 4. Check content of a node
        cy.get('.simple-node').first().should('contain', 'Node')
        cy.get('.status-dot').should('have.length', 4)
    })

    it('should apply layout changes', () => {
        // 1. Toggle to X6 & Load Data
        // 1. Load Data

        cy.get('select').select('ring_4node.json')
        cy.contains('button', '加载示例').click()
        cy.wait(500)

        // 2. Capture initial position of the first node
        cy.get('.simple-node').first().then($node => {
            const initialOffset = $node.offset()

            // 3. Click "Grid Layout" toolbar button
            cy.get('button[title="Grid Layout"]').click()
            cy.wait(1000) // Wait for layout animation/calc

            // 4. Verify position changed (or is valid)
            cy.get('.simple-node').should('have.length', 4)

            // For Circular Layout
            cy.get('button[title="Circular Layout"]').click()
            cy.wait(1000)

            cy.get('.simple-node').first().then($newNode => {
                const newOffset = $newNode.offset()
                expect(newOffset.left).to.not.equal(initialOffset.left)
            })

            // For DAG Layout
            cy.get('button[title="DAG Layout"]').click()
            cy.wait(1000)

            // Verify nodes exist
            cy.get('.simple-node').should('have.length', 4)
        })
    })

    it('should handle zoom interactions', () => {
        // cy.get('input[type="checkbox"]').check({ force: true })
        cy.get('select').select('ring_4node.json')
        cy.contains('button', '加载示例').click()
        cy.wait(1000)

        // Check availability of transform element
        cy.get('g[transform]').should('exist')

        // Click Zoom In
        cy.get('button[title="Zoom In"]').click()
        cy.wait(500)

        // Verify transform changed or exists
        cy.get('g[transform]').then($g => {
            const transform = $g.attr('transform')
            expect(transform).to.match(/scale|matrix/)
        })
    })

    it('should handle context menu interactions', () => {
        // cy.get('input[type="checkbox"]').check({ force: true })
        cy.get('select').select('ring_4node.json')
        cy.contains('button', '加载示例').click()
        cy.wait(1000)

        // 1. Right-click on blank area (Trigger event directly on container to ensure hit)
        cy.get('.x6-editor-container').trigger('contextmenu', { clientX: 400, clientY: 400, force: true })

        // Wait and check
        cy.get('.context-menu').should('be.visible')
        cy.contains('.context-menu-item', 'Add Node').should('be.visible')

        // 2. Click "Add Node"
        cy.contains('.context-menu-item', 'Add Node').click()
        cy.get('.context-menu').should('not.be.visible')

        // 3. Right-click on a node
        // Trigger on the node DOM element
        cy.get('.simple-node').should('have.length.at.least', 4)
        cy.get('.simple-node').first().trigger('contextmenu', { force: true })
        cy.contains('.context-menu-item', 'Rename').should('be.visible')
    })
})
