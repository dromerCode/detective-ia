#!/bin/sh
# Crea entrega/detective-ia.zip con lo que está en git (sin node_modules, web/js ni la key)
set -eu
cd "$(dirname "$0")/.."
rm -f entrega/detective-ia.zip
git archive --format=zip --prefix=detective-ia/ -o entrega/detective-ia.zip HEAD -- . \
  ':(exclude)docs/superpowers' ':(exclude)src/payments' ':(exclude).gitignore'
echo "Creado entrega/detective-ia.zip"
