# Flujo de trabajo · AR-Darwin

Fuente de verdad del flujo de git. Una tarea del roadmap = un issue = una rama = una PR.

1. **Issue.** Cada tarea de `docs/ROADMAP.md` o bug tiene su issue (plantillas en `.github/ISSUE_TEMPLATE`), dentro del milestone de su fase («Fase 1», «Fase 2»…).
2. **Rama.** Desde `main` actualizado, con la fase y una descripción corta: `fase-1/monorepo-base`, `fase-3/divisor-pantalla`.
3. **Commits pequeños** dentro de la rama, en inglés y con [Conventional Commits](https://www.conventionalcommits.org/):
   - Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
   - Scope por paquete: `core`, `mobile`, `desktop`, `ui`, `i18n`. Sin scope si afecta a todo el repo.
   - Ejemplos: `feat(core): add computeTiles`, `fix(mobile): keep image still when locked`, `chore: bump turbo`.
4. **PR** hacia `main` con la plantilla; el cuerpo lleva `Closes #N` para cerrar el issue al fusionar.
5. **CI** (`.github/workflows/ci.yml`) ejecuta typecheck, lint y test en cada PR y en `main`. La regla de `main` exige PR y el check `verify` en verde: no se fusiona en rojo.
6. **Revisión.** Revisas el diff antes de fusionar.
7. **Fusión** solo con «Squash and merge»: `main` queda con un commit por tarea. El título del squash también va en Conventional Commits con scope (ej. `feat(core): add computeTiles`).
8. Al fusionar, GitHub borra la rama. La tarea se marca en `docs/ROADMAP.md` y los docs afectados se actualizan dentro de la misma PR.

Antes de abrir la PR: `pnpm typecheck && pnpm test && pnpm lint` deben pasar en local.
