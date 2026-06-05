---
name: Super Nova model router
description: How the Work Tree worker routes logical roles to LLM providers, and the fallback trap to avoid.
---

# Super Nova model router

`scripts/super-nova-router.mjs` is the single place that maps a logical role
(planner / executor / critic / researcher) to a provider (bitdeer default,
openai, openrouter, local self-hosted) + model, and runs an OpenAI-compatible
chat completion. The Work Tree worker calls it for every LLM turn with an
explicit role; switching a role's brain is a one-env-var change
(`SUPER_NOVA_<ROLE>_PROVIDER` / `_MODEL`), no code edit.

**Fallback trap (the bug that bit):** when a role's override provider is
unconfigured/invalid, the router falls back to bitdeer. It MUST also drop the
override's role model — a provider-specific id (e.g. an OpenAI-only model) is
invalid on bitdeer and would make the fallback request fail. On fallback use
`callerModel || DEFAULT_MODEL`, never the failed provider's role model.
**Why:** a half-set override (provider given, key missing) must never be able to
break a run; that's the whole point of the bitdeer safety net.

**Worker key guard:** the worker only fatals on a missing `BITDEER_API_KEY` when
a role actually resolves to the bitdeer provider (`ROLES.some(r =>
resolveRole(r).providerName === "bitdeer")`). This keeps the default config
fail-fast while allowing every role to be pointed at non-bitdeer providers with
no bitdeer key at all.

**Provider usability is captured at module load** (PROVIDERS reads env once on
import), so deleting an API key from `process.env` at runtime does not flip a
provider to "unconfigured" — to exercise the fallback path in a quick check, use
an invalid provider name instead.

**How to apply:** anything that adds a provider or role goes through this module;
keep persona injection non-mutating (`withPersona` returns a new array — the
ReAct `messages` array is reused across the loop) and never log the API key.
