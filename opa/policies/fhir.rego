package fhir.authz

default allow = false

# Permite lectura de Patient propio (ejemplo simple)
allow {
  input.method == "GET"
  startswith(input.path, "/Patient")
  input.subject_compartment == "self"
}

# Ejemplo: permitir POST Bundle transaction solo si purposeOfUse presente
allow {
  input.method == "POST"
  startswith(input.path, "/Bundle")
  input.bundle.type == "transaction"
  input.purposeOfUse != ""
}
