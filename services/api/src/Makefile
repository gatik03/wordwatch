# SAM "makefile" build (see template.yaml Metadata). Copies the shared Python and schemas in at build time (ADR-13).
SHARED = ../../../tools/pregen
SCHEMAS = ../../../shared/schemas

build-ApiFunction:
	cp handler.py lookup.py speak.py cache.py $(ARTIFACTS_DIR)/
	cp $(SHARED)/prompts.py $(SHARED)/validate.py $(SHARED)/bedrock.py $(ARTIFACTS_DIR)/
	mkdir -p $(ARTIFACTS_DIR)/schemas
	cp $(SCHEMAS)/*.schema.json $(ARTIFACTS_DIR)/schemas/
	python3 -m pip install -r requirements.txt -t $(ARTIFACTS_DIR) --upgrade --only-binary=:all: --implementation cp --python-version 3.12 --platform manylinux2014_x86_64
