SSH_KEY := /home/ploy/.ssh/id_github_keteracel
GIT     := GIT_SSH_COMMAND="ssh -i $(SSH_KEY) -o IdentitiesOnly=yes" git

.PHONY: build serve typecheck release

build: ## Build dist/pauls-cards.js
	npm run build

serve: ## Serve testbed.html at http://localhost:8080
	npm run serve

typecheck: ## Type-check with tsc, no emit
	npm run typecheck

release: build ## Tag + push + publish a GitHub release. Usage: make release VERSION=v0.5.0 NOTES_FILE=/tmp/notes.md
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required, e.g. make release VERSION=v0.5.0 NOTES_FILE=/tmp/notes.md"; exit 1; fi
	@if [ -z "$(NOTES_FILE)" ]; then echo "NOTES_FILE is required (a file path, not inline text — multi-line NOTES break make's recipe parsing), e.g. make release VERSION=v0.5.0 NOTES_FILE=/tmp/notes.md"; exit 1; fi
	$(GIT) tag -a $(VERSION) -m "$(VERSION)"
	$(GIT) push origin $(VERSION)
	gh release create $(VERSION) dist/pauls-cards.js --title "$(VERSION)" --notes-file "$(NOTES_FILE)"
